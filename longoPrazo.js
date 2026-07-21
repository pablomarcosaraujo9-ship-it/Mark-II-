/**
 * MÓDULO DE LONGO PRAZO — NOVA
 * ===============================
 * Complementa a análise diária com contexto de 12 meses, permitindo
 * distinguir ruído de curto prazo de tendência estrutural do ativo.
 *
 * Usado apenas nos ativos que já apareceram no ranking do dia
 * (top 3 quedas / top 3 altas), para não estourar limite de API.
 */

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';

/**
 * Busca variação de ~12 meses de um ticker brasileiro via Brapi.
 */
async function buscarVariacaoAnualBrasil(tickerSemSufixo) {
    try {
        const url = `${BRAPI_BASE_URL}/quote/${encodeURIComponent(tickerSemSufixo)}?range=1y&interval=1mo&token=${BRAPI_TOKEN}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.results || !dados.results[0] || !dados.results[0].historicalDataPrice) {
            return { sucesso: false, erro: 'Histórico anual não disponível' };
        }

        const historico = dados.results[0].historicalDataPrice;
        const precoInicial = historico[0].close;
        const precoFinal = historico[historico.length - 1].close;
        const variacaoPercentual = ((precoFinal - precoInicial) / precoInicial) * 100;

        return { sucesso: true, variacaoPercentual };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Busca variação de ~12 meses de um ticker global via Twelve Data.
 */
async function buscarVariacaoAnualGlobal(ticker) {
    try {
        const url = `${TWELVEDATA_BASE_URL}/time_series?symbol=${encodeURIComponent(ticker)}&interval=1month&outputsize=13&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.status === 'error' || !dados.values || dados.values.length < 2) {
            return { sucesso: false, erro: dados.message || 'Histórico anual não disponível' };
        }

        const valoresOrdenados = [...dados.values].reverse(); // do mais antigo ao mais recente
        const precoInicial = parseFloat(valoresOrdenados[0].close);
        const precoFinal = parseFloat(valoresOrdenados[valoresOrdenados.length - 1].close);
        const variacaoPercentual = ((precoFinal - precoInicial) / precoInicial) * 100;

        return { sucesso: true, variacaoPercentual };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Ponto de entrada único: decide a fonte com base no formato do ticker.
 */
async function buscarVariacaoAnual(ticker) {
    if (ticker.toUpperCase().endsWith('.SA')) {
        const tickerSemSufixo = ticker.slice(0, -3);
        return buscarVariacaoAnualBrasil(tickerSemSufixo);
    }
    return buscarVariacaoAnualGlobal(ticker);
}

/**
 * Busca variação de ~5 anos de um ticker brasileiro via Brapi.
 */
async function buscarVariacaoCincoAnosBrasil(tickerSemSufixo) {
    try {
        const url = `${BRAPI_BASE_URL}/quote/${encodeURIComponent(tickerSemSufixo)}?range=5y&interval=3mo&token=${BRAPI_TOKEN}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.results || !dados.results[0] || !dados.results[0].historicalDataPrice) {
            return { sucesso: false, erro: 'Histórico de 5 anos não disponível' };
        }

        const historico = dados.results[0].historicalDataPrice;
        const precoInicial = historico[0].close;
        const precoFinal = historico[historico.length - 1].close;
        const variacaoPercentual = ((precoFinal - precoInicial) / precoInicial) * 100;

        return { sucesso: true, variacaoPercentual };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Busca variação de ~5 anos de um ticker global via Twelve Data.
 */
async function buscarVariacaoCincoAnosGlobal(ticker) {
    try {
        const url = `${TWELVEDATA_BASE_URL}/time_series?symbol=${encodeURIComponent(ticker)}&interval=1month&outputsize=60&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.status === 'error' || !dados.values || dados.values.length < 2) {
            return { sucesso: false, erro: dados.message || 'Histórico de 5 anos não disponível' };
        }

        const valoresOrdenados = [...dados.values].reverse();
        const precoInicial = parseFloat(valoresOrdenados[0].close);
        const precoFinal = parseFloat(valoresOrdenados[valoresOrdenados.length - 1].close);
        const variacaoPercentual = ((precoFinal - precoInicial) / precoInicial) * 100;

        return { sucesso: true, variacaoPercentual };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

async function buscarVariacaoCincoAnos(ticker) {
    if (ticker.toUpperCase().endsWith('.SA')) {
        const tickerSemSufixo = ticker.slice(0, -3);
        return buscarVariacaoCincoAnosBrasil(tickerSemSufixo);
    }
    return buscarVariacaoCincoAnosGlobal(ticker);
}

/**
 * Busca contexto de longo prazo (12 meses E 5 anos) para uma lista
 * de tickers, espaçando as chamadas para respeitar limites de API.
 */
async function buscarContextoLongoPrazo(tickers) {
    const resultados = [];
    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];

        const variacao12m = await buscarVariacaoAnual(ticker);
        await new Promise((r) => setTimeout(r, 8000));

        const variacao5a = await buscarVariacaoCincoAnos(ticker);
        resultados.push({ ticker, variacao12m, variacao5a });

        if (i < tickers.length - 1) {
            await new Promise((r) => setTimeout(r, 8000));
        }
    }
    return resultados;
}

/**
 * Formata o contexto de longo prazo (12 meses + 5 anos) em texto
 * Markdown, de forma neutra — sem rotular como "oportunidade".
 */
function formatarContextoLongoPrazo(contextos) {
    let texto = `📅 *CONTEXTO DE LONGO PRAZO*\n───────────────────────\n`;
    texto += `Ajuda a distinguir ruído do dia de tendência estrutural. ` +
        `Avalie se a queda/alta recente reflete algo pontual ou estrutural antes de decidir.\n\n`;

    contextos.forEach((c) => {
        const fmt = (v) => {
            if (!v.sucesso) return 'indisponível';
            const sinal = v.variacaoPercentual >= 0 ? '+' : '';
            return `${sinal}${v.variacaoPercentual.toFixed(1)}%`;
        };

        texto += `\`${c.ticker}\`\n`;
        texto += `   📆 12 meses: ${fmt(c.variacao12m)}\n`;
        texto += `   📆 5 anos: ${fmt(c.variacao5a)}\n\n`;
    });

    return texto;
}

module.exports = {
    buscarVariacaoAnual,
    buscarVariacaoCincoAnos,
    buscarContextoLongoPrazo,
    formatarContextoLongoPrazo,
};
