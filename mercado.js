/**
 * MÓDULO DE MERCADO — NOVA
 * ==========================
 * Conecta com a API da Twelve Data para buscar cotações de ações
 * globais (Brasil, EUA, e outros mercados suportados).
 *
 * Documentação: https://twelvedata.com/docs
 */

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;
const BASE_URL = 'https://api.twelvedata.com';

/**
 * Busca a cotação atual (preço, variação %, volume) de um ticker.
 * Exemplos de ticker: "PETR4.SA" (Brasil), "AAPL" (EUA), "SAP.DE" (Alemanha)
 */
async function buscarCotacao(ticker) {
    try {
        const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.status === 'error' || dados.code) {
            return { sucesso: false, ticker, erro: dados.message || 'Erro desconhecido na API' };
        }

        return {
            sucesso: true,
            ticker: dados.symbol,
            nome: dados.name,
            precoAtual: parseFloat(dados.close),
            variacaoPercentual: parseFloat(dados.percent_change),
            variacaoAbsoluta: parseFloat(dados.change),
            volume: dados.volume ? parseInt(dados.volume) : null,
            moeda: dados.currency,
            mercado: dados.exchange,
        };
    } catch (erro) {
        return { sucesso: false, ticker, erro: erro.message };
    }
}

/**
 * Busca cotações de múltiplos tickers, respeitando o limite de
 * 8 requisições por minuto do plano gratuito da Twelve Data.
 * Espaça as chamadas em ~8 segundos cada para ficar dentro do limite.
 */
async function buscarMultiplasCotacoes(tickers) {
    const resultados = [];
    const INTERVALO_MS = 8000; // ~8s entre chamadas = até 7-8 por minuto

    for (let i = 0; i < tickers.length; i++) {
        const cotacao = await buscarCotacao(tickers[i]);
        resultados.push(cotacao);

        // Não espera depois da última chamada
        if (i < tickers.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
        }
    }

    return resultados;
}

module.exports = {
    buscarCotacao,
    buscarMultiplasCotacoes,
};
