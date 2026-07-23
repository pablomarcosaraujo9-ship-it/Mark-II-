/**
 * MÓDULO DE ANÁLISE — NOVA
 * ==========================
 * Responsável por:
 * - Classificar a intensidade dos movimentos de mercado
 * - Filtrar o que é relevante (ignora ruído de variações pequenas)
 * - Gerar ranking dos ativos com maior movimento
 * - Gerar relatório de orçamento (o que cabe no valor informado
 *   pelo usuário), com conversão correta de moeda (Fase 1 do roadmap)
 *
 * PRINCÍPIOS (não negociáveis — ver roadmap NOVA/SCANNER):
 * - Nunca recomenda compra ou venda.
 * - Nunca promete rentabilidade.
 * - Classificações são sempre descritivas, nunca prescritivas
 *   (ex: "movimento forte", nunca "boa oportunidade" ou pontuação
 *   tipo "82/100").
 * - Sempre deixa claro que é informação de mercado passada/atual,
 *   não previsão.
 */

const { buscarCotacaoUSDBRL } = require('./mercado');

// ------------------------------------------------------------
// LIMIARES DE CLASSIFICAÇÃO
// ------------------------------------------------------------

const LIMITE_RELEVANCIA = 1.5;   // abaixo disso, variação é tratada como ruído
const LIMITE_INTENSIDADE_FORTE = 4;     // |variação%| >= 4  → "forte"
const LIMITE_INTENSIDADE_MODERADA = 2;  // |variação%| >= 2  → "moderado"
// abaixo de 2% (mas acima do limite de relevância) → "normal"

// ------------------------------------------------------------
// CLASSIFICAÇÃO DE INTENSIDADE
// ------------------------------------------------------------

/**
 * Classifica a intensidade de um movimento com base na variação
 * percentual absoluta. Retorna sempre um rótulo descritivo,
 * nunca uma recomendação.
 *
 * @param {number} variacaoPercentual
 * @returns {"forte"|"moderado"|"normal"}
 */
function classificarIntensidade(variacaoPercentual) {
    const variacaoAbsoluta = Math.abs(variacaoPercentual);

    if (variacaoAbsoluta >= LIMITE_INTENSIDADE_FORTE) {
        return 'forte';
    }
    if (variacaoAbsoluta >= LIMITE_INTENSIDADE_MODERADA) {
        return 'moderado';
    }
    return 'normal';
}

/**
 * Retorna um emoji descritivo para a direção do movimento.
 * Puramente visual — não é indicativo de recomendação.
 */
function emojiDirecao(variacaoPercentual) {
    if (variacaoPercentual > 0) return '🟢';
    if (variacaoPercentual < 0) return '🔴';
    return '⚪';
}

/**
 * Verifica se a variação de um ativo é relevante o suficiente
 * para aparecer em destaque no ranking (filtra ruído).
 */
function ehRelevante(variacaoPercentual) {
    return Math.abs(variacaoPercentual) >= LIMITE_RELEVANCIA;
}

// ------------------------------------------------------------
// RANKING
// ------------------------------------------------------------

/**
 * Gera um ranking dos ativos com maior variação absoluta,
 * a partir da lista de cotações já buscadas (ver mercado.js).
 * Ignora ativos com erro de busca e ativos abaixo do limite
 * de relevância.
 *
 * @param {Array} cotacoes - resultado de buscarMultiplasCotacoes()
 * @returns {Array} ranking ordenado do maior para o menor movimento absoluto
 */
function gerarRanking(cotacoes) {
    return cotacoes
        .filter((c) => c.sucesso && ehRelevante(c.variacaoPercentual))
        .map((c) => ({
            ticker: c.ticker,
            nome: c.nome,
            precoAtual: c.precoAtual,
            variacaoPercentual: c.variacaoPercentual,
            intensidade: classificarIntensidade(c.variacaoPercentual),
            emoji: emojiDirecao(c.variacaoPercentual),
            moeda: c.moeda,
            mercado: c.mercado,
        }))
        .sort((a, b) => Math.abs(b.variacaoPercentual) - Math.abs(a.variacaoPercentual));
}

// ------------------------------------------------------------
// CONVERSÃO DE MOEDA (Fase 1 do roadmap)
// ------------------------------------------------------------

/**
 * Converte um preço para BRL, se necessário.
 *
 * @param {number} preco
 * @param {string} moeda - "BRL", "USD", etc (vem de mercado.js)
 * @param {number} cotacaoUSDBRL
 * @returns {number} preço em BRL
 */
function converterParaBRL(preco, moeda, cotacaoUSDBRL) {
    if (!moeda || moeda === 'BRL') {
        return preco;
    }
    if (moeda === 'USD') {
        return preco * cotacaoUSDBRL;
    }
    // Outras moedas (ex: EUR) não são suportadas ainda —
    // melhor sinalizar isso do que assumir conversão incorreta.
    throw new Error(`Conversão não suportada para a moeda: ${moeda}`);
}

// ------------------------------------------------------------
// RELATÓRIO DE ORÇAMENTO
// ------------------------------------------------------------

/**
 * Gera o relatório de orçamento: para cada ativo buscado, informa
 * se ele cabe no valor que o usuário digitou no /investir — já
 * convertendo corretamente ativos americanos (USD) para reais
 * antes de comparar (correção da Fase 1).
 *
 * @param {number} orcamentoBRL - valor informado pelo usuário, em reais
 * @param {Array} cotacoes - resultado de buscarMultiplasCotacoes()
 * @returns {Promise<object>} { cotacaoUSDBRL, itens }
 */
async function gerarRelatorioOrcamento(orcamentoBRL, cotacoes) {
    const cotacaoUSDBRL = await buscarCotacaoUSDBRL();

    const itens = cotacoes
        .filter((c) => c.sucesso)
        .map((c) => {
            const precoConvertidoBRL = converterParaBRL(
                c.precoAtual,
                c.moeda,
                cotacaoUSDBRL
            );

            return {
                ticker: c.ticker,
                nome: c.nome,
                precoOriginal: c.precoAtual,
                moedaOriginal: c.moeda,
                precoConvertidoBRL: Number(precoConvertidoBRL.toFixed(2)),
                dentroDoOrcamento: precoConvertidoBRL <= orcamentoBRL,
            };
        })
        .sort((a, b) => a.precoConvertidoBRL - b.precoConvertidoBRL);

    return { cotacaoUSDBRL, itens };
}

/**
 * Formata uma linha de texto para exibir um item do relatório de
 * orçamento no Telegram, deixando explícita a conversão de moeda
 * (transparência para o usuário, conforme sugerido no patch da Fase 1).
 */
function formatarLinhaOrcamento(item) {
    const status = item.dentroDoOrcamento ? '✅ dentro do orçamento' : '⛔ fora do orçamento';

    if (item.moedaOriginal === 'BRL') {
        return `${item.ticker} — R$ ${item.precoOriginal.toFixed(2)} — ${status}`;
    }

    return `${item.ticker} — ${item.moedaOriginal} ${item.precoOriginal.toFixed(2)} ` +
        `(≈ R$ ${item.precoConvertidoBRL.toFixed(2)}) — ${status}`;
}

// ------------------------------------------------------------
// RELATÓRIO COMPLETO DE VARREDURA (usado pelo /investir)
// ------------------------------------------------------------

/**
 * Combina ranking + relatório de orçamento em um único resultado,
 * pronto para ser formatado e enviado pelo bot.js.
 *
 * @param {number} orcamentoBRL
 * @param {Array} cotacoes - resultado de buscarMultiplasCotacoes()
 */
async function gerarRelatorioVarredura(orcamentoBRL, cotacoes) {
    const ranking = gerarRanking(cotacoes);
    const relatorioOrcamento = await gerarRelatorioOrcamento(orcamentoBRL, cotacoes);

    const erros = cotacoes
        .filter((c) => !c.sucesso)
        .map((c) => ({ ticker: c.ticker, erro: c.erro }));

    return {
        ranking,
        relatorioOrcamento,
        erros,
        avisoPadrao:
            'Informação com base em dados de mercado passados/atuais. ' +
            'Isso não é previsão de comportamento futuro nem recomendação de compra ou venda.',
    };
}

module.exports = {
    classificarIntensidade,
    emojiDirecao,
    ehRelevante,
    gerarRanking,
    converterParaBRL,
    gerarRelatorioOrcamento,
    formatarLinhaOrcamento,
    gerarRelatorioVarredura,
    LIMITE_RELEVANCIA,
    LIMITE_INTENSIDADE_FORTE,
    LIMITE_INTENSIDADE_MODERADA,
};
