/**
 * MÓDULO DE ANÁLISE — NOVA
 * ===========================
 * Filtra e organiza cotações com base em critérios OBJETIVOS
 * (variação percentual, volume). Não faz previsão de preço futuro.
 *
 * AVISO: Este módulo identifica MOVIMENTOS JÁ OCORRIDOS (fatos),
 * não prevê se um ativo vai subir ou cair. A decisão de investir
 * é sempre do usuário, com base nas informações apresentadas.
 * Isto não constitui recomendação de investimento.
 */

const LIMITE_QUEDA_RELEVANTE = -1.5; // % — queda a partir daqui é destacada
const LIMITE_ALTA_RELEVANTE = 1.5;   // % — alta a partir daqui é destacada

const LIMITE_MOVIMENTO_FORTE = 5;    // % (em módulo) — acima disso, "forte"
const LIMITE_MOVIMENTO_MODERADO = 3; // % (em módulo) — acima disso, "moderado"

/**
 * Classifica a intensidade de um movimento com base na variação %.
 * Retorna um rótulo textual + emoji, sem fazer previsão nenhuma —
 * só descreve o tamanho do movimento já ocorrido.
 */
function classificarIntensidade(variacaoPercentual) {
    const abs = Math.abs(variacaoPercentual);
    if (abs >= LIMITE_MOVIMENTO_FORTE) {
        return '🔥 Movimento forte (acima da média do dia)';
    }
    if (abs >= LIMITE_MOVIMENTO_MODERADO) {
        return '⚡ Movimento moderado';
    }
    return '➖ Movimento discreto';
}

function classificarCotacoes(cotacoes) {
    const validas = cotacoes.filter((c) => c.sucesso);
    const comErro = cotacoes.filter((c) => !c.sucesso);

    const quedas = validas
        .filter((c) => c.variacaoPercentual <= LIMITE_QUEDA_RELEVANTE)
        .sort((a, b) => a.variacaoPercentual - b.variacaoPercentual);

    const altas = validas
        .filter((c) => c.variacaoPercentual >= LIMITE_ALTA_RELEVANTE)
        .sort((a, b) => b.variacaoPercentual - a.variacaoPercentual);

    const estaveis = validas.filter(
        (c) => c.variacaoPercentual > LIMITE_QUEDA_RELEVANTE && c.variacaoPercentual < LIMITE_ALTA_RELEVANTE
    );

    return { quedas, altas, estaveis, comErro };
}

/**
 * Formata uma linha individual de ativo, com nota de oportunidade
 * (intensidade do movimento) junto do preço e variação.
 */
function formatarLinhaAtivo(cotacao) {
    const sinal = cotacao.variacaoPercentual >= 0 ? '+' : '';
    const emoji = cotacao.variacaoPercentual >= 0 ? '📈' : '📉';
    const intensidade = classificarIntensidade(cotacao.variacaoPercentual);

    return (
        `${emoji} \`${cotacao.ticker}\` ${cotacao.nome || ''}\n` +
        `   ${sinal}${cotacao.variacaoPercentual.toFixed(2)}% — ${cotacao.moeda} ${cotacao.precoAtual.toFixed(2)}\n` +
        `   ${intensidade}`
    );
}

/**
 * Gera o ranking em medalhas (top 3) das maiores quedas e altas.
 */
function formatarRanking(quedas, altas) {
    const medalhas = ['🥇', '🥈', '🥉'];
    let texto = '';

    if (quedas.length > 0) {
        texto += `\n🏆 *RANKING — Maiores Quedas do Dia*\n`;
        quedas.slice(0, 3).forEach((c, i) => {
            texto += `${medalhas[i]} \`${c.ticker}\` ${c.variacaoPercentual.toFixed(2)}%\n`;
        });
    }

    if (altas.length > 0) {
        texto += `\n🏆 *RANKING — Maiores Altas do Dia*\n`;
        altas.slice(0, 3).forEach((c, i) => {
            texto += `${medalhas[i]} \`${c.ticker}\` +${c.variacaoPercentual.toFixed(2)}%\n`;
        });
    }

    return texto;
}

/**
 * Gera o texto formatado em Markdown para o Telegram com o
 * resumo da varredura, usando linguagem factual (não preditiva).
 */
function gerarRelatorioVarredura(cotacoes, valorInvestir) {
    const { quedas, altas, estaveis, comErro } = classificarCotacoes(cotacoes);

    let texto = `📊 *VARREDURA DE MERCADO*\n`;
    texto += `───────────────────────\n`;
    if (valorInvestir) {
        texto += `💰 Valor informado: *R$ ${valorInvestir}*\n`;
    }
    texto += `Ativos analisados: *${cotacoes.length}*\n\n`;

    if (quedas.length > 0) {
        texto += `🔻 *Quedas relevantes (≥ ${Math.abs(LIMITE_QUEDA_RELEVANTE)}%):*\n\n`;
        quedas.forEach((c) => {
            texto += formatarLinhaAtivo(c) + '\n\n';
        });
    }

    if (altas.length > 0) {
        texto += `🔺 *Altas relevantes (≥ ${LIMITE_ALTA_RELEVANTE}%):*\n\n`;
        altas.forEach((c) => {
            texto += formatarLinhaAtivo(c) + '\n\n';
        });
    }

    if (quedas.length === 0 && altas.length === 0) {
        texto += `📎 Nenhum ativo com variação relevante hoje. ${estaveis.length} ativos com movimento dentro da faixa normal.\n\n`;
    } else {
        texto += formatarRanking(quedas, altas);
        texto += '\n';
    }

    if (comErro.length > 0) {
        texto += `⚠️ Não foi possível obter dados de: ${comErro.map((c) => c.ticker).join(', ')}\n\n`;
    }

    texto += `⚠️ *Nota:* Esta lista mostra movimentos que JÁ ocorreram, com base em dados públicos de mercado. ` +
        `Não é previsão de comportamento futuro nem recomendação de compra ou venda. ` +
        `A decisão de investir é sua — avalie fundamentos, contexto e seu próprio perfil de risco.`;

    return texto;
}

module.exports = {
    classificarCotacoes,
    classificarIntensidade,
    gerarRelatorioVarredura,
    LIMITE_QUEDA_RELEVANTE,
    LIMITE_ALTA_RELEVANTE,
};
