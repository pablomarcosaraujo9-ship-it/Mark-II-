/**
 * MÓDULO DE MERCADO — NOVA
 * ==========================
 * Conecta com DUAS fontes de dados, escolhendo automaticamente
 * a fonte certa conforme o ticker:
 *
 * - Tickers terminados em ".SA" (ex: "PETR4.SA") → Brapi (Brasil/B3)
 * - Qualquer outro ticker (ex: "AAPL", "SAP.DE") → Twelve Data (Global)
 *
 * Documentação:
 * Brapi: https://brapi.dev/docs
 * Twelve Data: https://twelvedata.com/docs
 */

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';

/**
 * Busca cotação de um ticker brasileiro via Brapi.
 * Recebe o ticker JÁ SEM o sufixo ".SA" (ex: "PETR4").
 */
async function buscarCotacaoBrasil(tickerSemSufixo) {
    try {
        const url = `${BRAPI_BASE_URL}/quote/${encodeURIComponent(tickerSemSufixo)}?token=${BRAPI_TOKEN}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.results || dados.results.length === 0) {
            const mensagemErro = dados.message || 'Ticker não encontrado';
            return { sucesso: false, ticker: `${tickerSemSufixo}.SA`, erro: mensagemErro };
        }

        const resultado = dados.results[0];

        return {
            sucesso: true,
            ticker: `${resultado.symbol}.SA`,
            nome: resultado.longName || resultado.shortName,
            precoAtual: resultado.regularMarketPrice,
            variacaoPercentual: resultado.regularMarketChangePercent,
            variacaoAbsoluta: resultado.regularMarketChange,
            volume: resultado.regularMarketVolume || null,
            moeda: resultado.currency || 'BRL',
            mercado: 'B3',
        };
    } catch (erro) {
        return { sucesso: false, ticker: `${tickerSemSufixo}.SA`, erro: erro.message };
    }
}

/**
 * Busca cotação de um ticker global (não-brasileiro) via Twelve Data.
 */
async function buscarCotacaoGlobal(ticker) {
    try {
        const url = `${TWELVEDATA_BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${TWELVEDATA_API_KEY}`;
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
 * NOVO — Busca a cotação atual USD/BRL via Twelve Data.
 * Usada para converter preços de ativos americanos para reais
 * antes de comparar com o orçamento do usuário (Fase 1 do roadmap).
 *
 * Retorna um número (ex: 5.42) ou lança erro se não conseguir obter.
 */
async function buscarCotacaoUSDBRL() {
    try {
        const url = `${TWELVEDATA_BASE_URL}/exchange_rate?symbol=USD/BRL&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        const cotacao = parseFloat(dados.rate);

        if (!cotacao || isNaN(cotacao)) {
            throw new Error(dados.message || 'Não foi possível obter a cotação USD/BRL');
        }

        return cotacao;
    } catch (erro) {
        // Repropaga o erro para quem chamou decidir como tratar
        // (ex: analise.js pode decidir abortar ou usar um valor de fallback)
        throw new Error(`Falha ao buscar cotação USD/BRL: ${erro.message}`);
    }
}

/**
 * Ponto de entrada único: decide automaticamente qual fonte usar
 * com base no formato do ticker.
 */
async function buscarCotacao(ticker) {
    if (ticker.toUpperCase().endsWith('.SA')) {
        const tickerSemSufixo = ticker.slice(0, -3); // remove ".SA"
        return buscarCotacaoBrasil(tickerSemSufixo);
    }
    return buscarCotacaoGlobal(ticker);
}

/**
 * Busca cotações de múltiplos tickers, espaçando as chamadas para
 * respeitar limites de requisições por minuto de ambas as APIs.
 */
async function buscarMultiplasCotacoes(tickers) {
    const resultados = [];
    const INTERVALO_MS = 8000; // ~8s entre chamadas

    for (let i = 0; i < tickers.length; i++) {
        const cotacao = await buscarCotacao(tickers[i]);
        resultados.push(cotacao);

        if (i < tickers.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
        }
    }

    return resultados;
}

module.exports = {
    buscarCotacao,
    buscarMultiplasCotacoes,
    buscarCotacaoUSDBRL,
};
