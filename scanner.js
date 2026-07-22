/**
 * MÓDULO SCANNER — NOVA
 * ========================
 * Análise individual de um ativo: movimento do dia + saúde financeira
 * (quando disponível) + classificação DESCRITIVA do tipo de movimento.
 *
 * IMPORTANTE: a classificação nunca recomenda compra/venda. Ela apenas
 * descreve se o movimento de preço é compatível com volatilidade normal
 * ou se coincide com fundamentos fracos — a decisão é sempre do usuário.
 */

const mercado = require('./mercado');
const fundamentos = require('./fundamentos');

const LIMITE_MOVIMENTO_FORTE = 5; // % — mesmo padrão usado no restante do NOVA

/**
 * Classifica o TIPO de movimento cruzando magnitude da variação
 * do dia com o status de saúde financeira (quando disponível).
 * Puramente descritivo — sem julgamento de "oportunidade".
 */
function classificarTipoMovimento(variacaoPercentual, statusFundamentos) {
    const movimentoForte = Math.abs(variacaoPercentual) >= LIMITE_MOVIMENTO_FORTE;

    if (!movimentoForte) {
        return { icone: '🟢', texto: 'Movimento compatível com volatilidade normal' };
    }

    if (statusFundamentos === 'sem_dados') {
        return {
            icone: '⚪',
            texto: 'Movimento forte — não foi possível classificar por falta de dados de fundamentos',
        };
    }

    if (statusFundamentos === 'saudavel') {
        return {
            icone: '🟡',
            texto: 'Movimento forte, porém fundamentos permanecem saudáveis — pode ser oscilação pontual',
        };
    }

    if (statusFundamentos === 'atencao') {
        return {
            icone: '🟡',
            texto: 'Movimento forte, com alguns sinais de atenção nos fundamentos — acompanhar',
        };
    }

    return {
        icone: '🔴',
        texto: 'Movimento forte coincide com fundamentos fracos — vale investigar mais a fundo',
    };
}

/**
 * Gera o relatório completo do SCANNER para um ticker.
 */
async function gerarRelatorioScanner(ticker) {
    const cotacao = await mercado.buscarCotacao(ticker);
    if (!cotacao.sucesso) {
        return `⚠️ Não foi possível obter cotação de ${ticker}: ${cotacao.erro}`;
    }

    const fund = await fundamentos.buscarFundamentos(ticker);
    const saude = fundamentos.classificarSaudeFinanceira(fund);
    const tipoMovimento = classificarTipoMovimento(cotacao.variacaoPercentual, saude.status);

    let texto = `⚡ *SCANNER — \`${cotacao.ticker}\`*\n`;
    texto += `${cotacao.nome || ''}\n`;
    texto += `───────────────────────\n\n`;

    const sinal = cotacao.variacaoPercentual >= 0 ? '+' : '';
    const emojiPreco = cotacao.variacaoPercentual >= 0 ? '📈' : '📉';
    texto += `📊 *Movimento do Dia*\n${emojiPreco} ${sinal}${cotacao.variacaoPercentual.toFixed(2)}% — ${cotacao.moeda} ${cotacao.precoAtual.toFixed(2)}\n\n`;

    if (saude.status !== 'sem_dados') {
        texto += `🏢 *Saúde Financeira*\n`;
        saude.linhas.forEach((l) => {
            texto += `${l}\n`;
        });
        texto += `\n`;
    } else if (fund.motivo) {
        texto += `❓ *Fundamentos:* dados insuficientes\n_${fund.motivo}_\n\n`;
    }

    texto += `🚦 *Tipo de Movimento*\n${tipoMovimento.icone} ${tipoMovimento.texto}\n\n`;
    texto += `⚠️ *Passado ≠ futuro.* Isto é informação, não recomendação de compra ou venda.`;

    return texto;
}

module.exports = {
    classificarTipoMovimento,
    gerarRelatorioScanner,
};
