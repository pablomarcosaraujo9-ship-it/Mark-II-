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

const LIMITE_QUEDA_RELEVANTE = -3; // % — queda a partir daqui é destacada
const LIMITE_ALTA_RELEVANTE = 3;   // % — alta a partir daqui é destacada

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

function gerarRelatorioVarredura(cotacoes, valorInvestir) {
    const { quedas, altas, estaveis, comErro } = classificarCotacoes(cotacoes);

    let texto = `📊 *VARREDURA DE MERCADO*\n`;
    texto += `───────────────────────\n`;
    if (valorInvestir) {
        texto += `💰 Valor informado: *R$ ${valorInvestir}*\n`;
    }
    texto += `Ativos analisados: *${cotacoes.length}*\n\n`;

    if (quedas.length > 0) {
        texto += `🔻 *Quedas relevantes (≥ ${Math.abs(LIMITE_QUEDA_RELEVANTE)}%):*\n`;
        quedas.forEach((c) => {
            texto += `• \`${c.ticker}\` ${c.nome || ''} — ${c.variacaoPercentual.toFixed(2)}% (${c.moeda} ${c.precoAtual.toFixed(2)})\n`;
        });
        texto += `\n`;
    }

    if (altas.length > 0) {
        texto += `🔺 *Altas relevantes (≥ ${LIMITE_ALTA_RELEVANTE}%):*\n`;
        altas.forEach((c) => {
            texto += `• \`${c.ticker}\` ${c.nome || ''} — +${c.variacaoPercentual.toFixed(2)}% (${c.moeda} ${c.precoAtual.toFixed(2)})\n`;
        });
        texto += `\n`;
    }

    if (quedas.length === 0 && altas.length === 0) {
        texto += `📎 Nenhum ativo com variação relevante hoje. ${estaveis.length} ativos com movimento dentro da faixa normal.\n\n`;
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
    gerarRelatorioVarredura,
    LIMITE_QUEDA_RELEVANTE,
    LIMITE_ALTA_RELEVANTE,
};
