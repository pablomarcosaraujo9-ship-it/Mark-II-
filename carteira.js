// Arquivo: carteira.js — NOVA (Carteira em arquivo local, sem Supabase)

const fs = require('fs');
const path = require('path');

const CARTEIRA_PATH = path.join(__dirname, 'carteira.json');

// ─── Helpers ─────────────────────────────────────────────
function lerCarteira() {
    try {
        if (!fs.existsSync(CARTEIRA_PATH)) return [];
        const raw = fs.readFileSync(CARTEIRA_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('Erro ao ler carteira:', e.message);
        return [];
    }
}

function salvarCarteira(carteira) {
    try {
        fs.writeFileSync(CARTEIRA_PATH, JSON.stringify(carteira, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar carteira:', e.message);
        return false;
    }
}

async function buscarPreco(ticker) {
    try {
        const symbol = ticker.toUpperCase();
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const res = await fetch(url);
        const data = await res.json();
        const preco = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (!preco) throw new Error('Preço não disponível');
        return parseFloat(preco);
    } catch (e) {
        console.error(`Erro ao buscar ${ticker}:`, e.message);
        return null;
    }
}

// ─── Funções principais ──────────────────────────────────

async function calcularAlocacao() {
    const carteira = lerCarteira();
    if (carteira.length === 0) {
        return { ativos: [], total: 0, vazio: true };
    }

    const ativosComPreco = [];
    let total = 0;

    for (const item of carteira) {
        const preco = await buscarPreco(item.ticker);
        const valor = preco ? preco * item.quantidade : 0;
        ativosComPreco.push({
            ticker: item.ticker,
            quantidade: item.quantidade,
            metaPercentual: item.metaPercentual,
            preco: preco,
            valor: valor,
        });
        total += valor;
    }

    // Calcula percentuais reais
    for (const ativo of ativosComPreco) {
        ativo.percentualReal = total > 0 ? ((ativo.valor / total) * 100).toFixed(2) : '0.00';
        ativo.diferenca = (parseFloat(ativo.percentualReal) - ativo.metaPercentual).toFixed(2);
    }

    return { ativos: ativosComPreco, total: total.toFixed(2), vazio: false };
}

function formatarCarteira(resultado) {
    if (resultado.vazio) {
        return `📂 *Sua Carteira*\n\n` +
            `_Carteira vazia._\n\n` +
            `Use /carteira_add para adicionar ativos.`;
    }

    let texto = `📂 *Sua Carteira*\n` +
        `💰 Valor total: R$ / US$ ${resultado.total}\n` +
        `───────────────────────\n\n`;

    for (const a of resultado.ativos) {
        const precoStr = a.preco ? `R$ / US$ ${a.preco.toFixed(2)}` : 'Preço indisponível';
        const emojiDiff = parseFloat(a.diferenca) > 0 ? '🟢' : parseFloat(a.diferenca) < 0 ? '🔴' : '⚪';
        texto += `• *${a.ticker}*\n` +
            `  Quantidade: ${a.quantidade}\n` +
            `  Preço atual: ${precoStr}\n` +
            `  Valor: ${a.valor.toFixed(2)}\n` +
            `  Meta: ${a.metaPercentual}% | Real: ${a.percentualReal}%\n` +
            `  ${emojiDiff} Diferença: ${a.diferenca}%\n\n`;
    }

    texto += `⚠️ _Alocação calculada com base nos preços atuais do mercado._`;
    return texto;
}

async function adicionarAtivo(ticker, quantidade, metaPercentual) {
    const carteira = lerCarteira();
    const idx = carteira.findIndex(a => a.ticker.toUpperCase() === ticker.toUpperCase());

    if (idx >= 0) {
        carteira[idx].quantidade = quantidade;
        carteira[idx].metaPercentual = metaPercentual;
    } else {
        carteira.push({
            ticker: ticker.toUpperCase(),
            quantidade: quantidade,
            metaPercentual: metaPercentual,
            criadoEm: new Date().toISOString(),
        });
    }

    const ok = salvarCarteira(carteira);
    return { sucesso: ok, erro: ok ? null : 'Falha ao salvar arquivo' };
}

async function removerAtivo(ticker) {
    let carteira = lerCarteira();
    const antes = carteira.length;
    carteira = carteira.filter(a => a.ticker.toUpperCase() !== ticker.toUpperCase());

    if (carteira.length === antes) {
        return { sucesso: false, erro: 'Ativo não encontrado' };
    }

    const ok = salvarCarteira(carteira);
    return { sucesso: ok, erro: ok ? null : 'Falha ao salvar arquivo' };
}

module.exports = {
    calcularAlocacao,
    formatarCarteira,
    adicionarAtivo,
    removerAtivo,
};
