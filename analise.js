/**
 * MÓDULO DE ANÁLISE — NOVA
 * ==========================
 * Responsável por:
 * - Classificar a intensidade dos movimentos de mercado
 * - Separar altas e quedas relevantes (classificarCotacoes)
 * - Gerar o texto do ranking do dia (gerarRelatorioVarredura)
 * - Gerar o texto do relatório de orçamento, já convertendo
 *   ativos em USD para BRL antes de comparar (gerarRelatorioOrcamento)
 *
 * IMPORTANTE — formato de retorno:
 * O bot.js chama estas funções e passa o resultado DIRETO pro
 * ctx.reply(...), então gerarRelatorioVarredura e
 * gerarRelatorioOrcamento devem retornar sempre uma STRING
 * pronta em Markdown — nunca um objeto, nunca uma Promise não
 * resolvida.
 *
 * PRINCÍPIOS (não negociáveis — ver roadmap NOVA/SCANNER):
 * - Nunca recomenda compra ou venda.
 * - Nunca promete rentabilidade.
 * - Classificações são sempre descritivas, nunca prescritivas.
 * - Sempre deixa claro que é informação de mercado passada/atual,
 *   não previsão.
 */

const { buscarCotacaoUSDBRL } = require('./mercado');

// ------------------------------------------------------------
// LIMIARES DE CLASSIFICAÇÃO
// ------------------------------------------------------------

const LIMITE_RELEVANCIA = 1.5;          // abaixo disso, variação é tratada como ruído
const LIMITE_INTENSIDADE_FORTE = 4;     // |variação%| >= 4  → "forte"
const LIMITE_INTENSIDADE_MODERADA = 2;  // |variação%| >= 2  → "moderado"
// abaixo de 2% (mas acima do limite de relevância) → "normal"

// ------------------------------------------------------------
// CLASSIFICAÇÃO DE INTENSIDADE
// ------------------------------------------------------------

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

function emojiDirecao(variacaoPercentual) {
    if (variacaoPercentual > 0) return '🟢';
    if (variacaoPercentual < 0) return '🔴';
    return '⚪';
}

function ehRelevante(variacaoPercentual) {
    return Math.abs(variacaoPercentual) >= LIMITE_RELEVANCIA;
}

// ------------------------------------------------------------
// SEPARAÇÃO EM ALTAS / QUEDAS
// ------------------------------------------------------------

/**
 * Separa as cotações bem-sucedidas e relevantes em dois grupos:
 * quedas (variação negativa) e altas (variação positiva),
 * cada um já ordenado do movimento mais intenso para o menos intenso.
 *
 * @param {Array} cotacoes - resultado de mercado.buscarMultiplasCotacoes()
 * @returns {{ quedas: Array, altas: Array }}
 */
function classificarCotacoes(cotacoes) {
    const relevantes = (cotacoes || [])
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
        }));

    const quedas = relevantes
        .filter((c) => c.variacaoPercentual < 0)
        .sort((a, b) => a.variacaoPercentual - b.variacaoPercentual); // mais negativo primeiro

    const altas = relevantes
        .filter((c) => c.variacaoPercentual > 0)
        .sort((a, b) => b.variacaoPercentual - a.variacaoPercentual); // mais positivo primeiro

    return { quedas, altas };
}

// ------------------------------------------------------------
// TEXTO DO RANKING (usado logo após a varredura)
// ------------------------------------------------------------

/**
 * Gera o texto (Markdown) do ranking do dia — maiores altas e
 * maiores quedas relevantes. SÍNCRONA: retorna string direto,
 * pois o bot.js chama sem "await".
 *
 * @param {Array} cotacoes - resultado de mercado.buscarMultiplasCotacoes()
 * @param {number|null} valorInformado - não usado no ranking em si,
 *   mantido no parâmetro para compatibilidade com a chamada do bot.js
 * @returns {string}
 */
function gerarRelatorioVarredura(cotacoes, valorInformado) {
    const { quedas, altas } = classificarCotacoes(cotacoes);

    if (quedas.length === 0 && altas.length === 0) {
        return (
            '📊 *Ranking do Dia*\n\n' +
            'Nenhuma variação relevante (acima de 1,5%) encontrada nesta varredura.\n\n' +
            '_Informação de mercado passada/atual — não é previsão nem recomendação._'
        );
    }

    let texto = '📊 *Ranking do Dia*\n\n';

    if (altas.length > 0) {
        texto += '🟢 *Maiores Altas*\n';
        altas.slice(0, 5).forEach((c) => {
            texto += `${c.emoji} \`${c.ticker}\` — ${c.variacaoPercentual.toFixed(2)}% (${c.intensidade})\n`;
        });
        texto += '\n';
    }

    if (quedas.length > 0) {
        texto += '🔴 *Maiores Quedas*\n';
        quedas.slice(0, 5).forEach((c) => {
            texto += `${c.emoji} \`${c.ticker}\` — ${c.variacaoPercentual.toFixed(2)}% (${c.intensidade})\n`;
        });
        texto += '\n';
    }

    texto += '_Informação de mercado passada/atual — não é previsão nem recomendação._';

    return texto;
}

// ------------------------------------------------------------
// CONVERSÃO DE MOEDA (Fase 1 do roadmap)
// ------------------------------------------------------------

function converterParaBRL(preco, moeda, cotacaoUSDBRL) {
    if (!moeda || moeda === 'BRL') {
        return preco;
    }
    if (moeda === 'USD') {
        return preco * cotacaoUSDBRL;
    }
    throw new Error(`Conversão não suportada para a moeda: ${moeda}`);
}

function formatarLinhaOrcamento(item) {
    if (item.moedaOriginal === 'BRL') {
        return `\`${item.ticker}\` — R$ ${item.precoOriginal.toFixed(2)}`;
    }
    return `\`${item.ticker}\` — ${item.moedaOriginal} ${item.precoOriginal.toFixed(2)} (≈ R$ ${item.precoConvertidoBRL.toFixed(2)})`;
}

// ------------------------------------------------------------
// TEXTO DO RELATÓRIO DE ORÇAMENTO
// ------------------------------------------------------------

/**
 * Gera o texto (Markdown) do relatório de orçamento, já com a
 * conversão correta USD→BRL (correção da Fase 1 do roadmap).
 *
 * ASSÍNCRONA: precisa buscar a cotação USD/BRL ao vivo, então
 * retorna uma Promise<string>. IMPORTANTE: a chamada em bot.js
 * precisa usar "await" aqui (ver instrução de patch abaixo).
 *
 * @param {Array} cotacoes - resultado de mercado.buscarMultiplasCotacoes()
 * @param {number|null} valorInformado - valor em reais digitado pelo usuário
 * @returns {Promise<string>}
 */
async function gerarRelatorioOrcamento(cotacoes, valorInformado) {
    if (!valorInformado) {
        return '💰 Nenhum orçamento foi informado nesta varredura.';
    }

    let cotacaoUSDBRL;
    try {
        cotacaoUSDBRL = await buscarCotacaoUSDBRL();
    } catch (erro) {
        return `⚠️ Não foi possível obter a cotação USD/BRL para calcular o orçamento (${erro.message}).`;
    }

    const itens = (cotacoes || [])
        .filter((c) => c.sucesso)
        .map((c) => {
            const precoConvertidoBRL = converterParaBRL(c.precoAtual, c.moeda, cotacaoUSDBRL);
            return {
                ticker: c.ticker,
                precoOriginal: c.precoAtual,
                moedaOriginal: c.moeda,
                precoConvertidoBRL: Number(precoConvertidoBRL.toFixed(2)),
                dentroDoOrcamento: precoConvertidoBRL <= valorInformado,
            };
        })
        .sort((a, b) => a.precoConvertidoBRL - b.precoConvertidoBRL);

    const dentro = itens.filter((i) => i.dentroDoOrcamento);

    let texto =
        `💰 *Relatório de Orçamento* (R$ ${valorInformado.toFixed(2)})\n` +
        `_Cotação USD/BRL usada: ${cotacaoUSDBRL.toFixed(2)}_\n\n`;

    if (dentro.length === 0) {
        texto += 'Nenhum ativo da lista está dentro desse orçamento no momento.';
        return texto;
    }

    texto += '✅ *Dentro do orçamento:*\n';
    dentro.forEach((item) => {
        texto += formatarLinhaOrcamento(item) + '\n';
    });

    return texto.trim();
}

module.exports = {
    classificarIntensidade,
    emojiDirecao,
    ehRelevante,
    classificarCotacoes,
    gerarRelatorioVarredura,
    converterParaBRL,
    gerarRelatorioOrcamento,
    LIMITE_RELEVANCIA,
    LIMITE_INTENSIDADE_FORTE,
    LIMITE_INTENSIDADE_MODERADA,
};
