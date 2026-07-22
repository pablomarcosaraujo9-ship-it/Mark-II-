/**
 * MÓDULO CARTEIRA — NOVA
 * =========================
 * Persistência dos ativos da carteira via Supabase (Postgres gratuito).
 * Guarda ticker, quantidade e percentual-meta definidos pelo usuário.
 *
 * PRINCÍPIO DE SEGURANÇA: o bot NUNCA sugere venda. Ele só aponta
 * onde os PRÓXIMOS APORTES podem ser direcionados para aproximar
 * a carteira da meta definida pelo próprio usuário.
 */

const mercado = require('./mercado');
const indices = require('./indices');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
};

/**
 * Lista todos os ativos cadastrados na carteira.
 */
async function buscarCarteira() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/carteira?select=*&order=criado_em.asc`;
        const resposta = await fetch(url, { headers: HEADERS });
        if (!resposta.ok) {
            const erro = await resposta.text();
            return { sucesso: false, erro };
        }
        const dados = await resposta.json();
        return { sucesso: true, ativos: dados };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Adiciona um novo ativo à carteira.
 */
async function adicionarAtivo(ticker, quantidade, metaPercentual) {
    try {
        const url = `${SUPABASE_URL}/rest/v1/carteira`;
        const resposta = await fetch(url, {
            method: 'POST',
            headers: { ...HEADERS, Prefer: 'return=representation' },
            body: JSON.stringify({
                ticker: ticker.toUpperCase(),
                quantidade,
                meta_percentual: metaPercentual,
            }),
        });
        if (!resposta.ok) {
            const erro = await resposta.text();
            return { sucesso: false, erro };
        }
        return { sucesso: true };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Remove um ativo da carteira pelo ticker.
 */
async function removerAtivo(ticker) {
    try {
        const url = `${SUPABASE_URL}/rest/v1/carteira?ticker=eq.${encodeURIComponent(ticker.toUpperCase())}`;
        const resposta = await fetch(url, { method: 'DELETE', headers: HEADERS });
        if (!resposta.ok) {
            const erro = await resposta.text();
            return { sucesso: false, erro };
        }
        return { sucesso: true };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Calcula a alocação atual (%) de cada ativo, convertendo tudo para
 * uma base comum em Reais (usa a cotação do dólar do dia para
 * ativos em USD), e compara com a meta definida pelo usuário.
 */
async function calcularAlocacao() {
    const carteira = await buscarCarteira();
    if (!carteira.sucesso) {
        return { sucesso: false, erro: carteira.erro };
    }
    if (carteira.ativos.length === 0) {
        return { sucesso: true, vazio: true };
    }

    const dolarInfo = await indices.buscarDolar();
    const taxaDolar = dolarInfo.sucesso ? dolarInfo.valor : null;

    const posicoes = [];
    for (let i = 0; i < carteira.ativos.length; i++) {
        const item = carteira.ativos[i];
        const cotacao = await mercado.buscarCotacao(item.ticker);

        if (cotacao.sucesso) {
            let valorEmReais = cotacao.precoAtual * item.quantidade;
            if (cotacao.moeda === 'USD') {
                valorEmReais = taxaDolar ? valorEmReais * taxaDolar : null;
            }
            posicoes.push({
                ticker: item.ticker,
                metaPercentual: item.meta_percentual,
                valorEmReais,
                precoAtual: cotacao.precoAtual,
                moeda: cotacao.moeda,
                quantidade: item.quantidade,
            });
        } else {
            posicoes.push({
                ticker: item.ticker,
                metaPercentual: item.meta_percentual,
                valorEmReais: null,
                erro: cotacao.erro,
            });
        }

        if (i < carteira.ativos.length - 1) {
            await new Promise((r) => setTimeout(r, 8000));
        }
    }

    const valorTotal = posicoes.reduce((soma, p) => soma + (p.valorEmReais || 0), 0);

    const posicoesComPercentual = posicoes.map((p) => {
        const atualPercentual = p.valorEmReais !== null && valorTotal > 0 ? (p.valorEmReais / valorTotal) * 100 : null;
        const diferenca = atualPercentual !== null ? p.metaPercentual - atualPercentual : null;
        return { ...p, atualPercentual, diferenca };
    });

    return { sucesso: true, vazio: false, posicoes: posicoesComPercentual, valorTotal };
}

/**
 * Formata o relatório de carteira em Markdown para o Telegram.
 */
function formatarCarteira(resultado) {
    if (!resultado.sucesso) {
        return `⚠️ Não foi possível acessar a carteira: ${resultado.erro}`;
    }
    if (resultado.vazio) {
        return `📂 *Sua carteira está vazia.*\n\nUse /carteira_add para adicionar o primeiro ativo.`;
    }

    let texto = `📂 *CARTEIRA NOVA*\n───────────────────────\n\n`;
    texto += `*Meta vs. Atual:*\n\n`;

    resultado.posicoes.forEach((p) => {
        texto += `\`${p.ticker}\`\n`;
        texto += `   Meta: ${p.metaPercentual.toFixed(1)}%\n`;
        if (p.atualPercentual !== null) {
            texto += `   Atual: ${p.atualPercentual.toFixed(1)}%\n`;
        } else {
            texto += `   Atual: indisponível (${p.erro || 'sem cotação'})\n`;
        }
        texto += `\n`;
    });

    const comDiferenca = resultado.posicoes.filter((p) => p.diferenca !== null && p.diferenca > 0);
    if (comDiferenca.length > 0) {
        const maisAbaixo = [...comDiferenca].sort((a, b) => b.diferenca - a.diferenca).slice(0, 2);
        texto += `💡 *Próximo aporte:*\nPriorizar ${maisAbaixo.map((p) => `\`${p.ticker}\``).join(' e ')} (mais abaixo da meta).\n\n`;
    }

    texto += `⚖️ *Rebalanceamento:* o NOVA nunca sugere venda — só aponta onde os próximos aportes aproximam sua carteira da meta que você definiu.\n\n`;
    texto += `⚠️ Passado ≠ futuro. Isto é informação, não recomendação.`;

    return texto;
}

module.exports = {
    buscarCarteira,
    adicionarAtivo,
    removerAtivo,
    calcularAlocacao,
    formatarCarteira,
};
