/**
 * MÓDULO DE GRÁFICO — NOVA
 * ===========================
 * Busca o histórico de preços (últimos 30 dias) e gera uma URL de
 * gráfico via QuickChart (serviço gratuito, sem necessidade de
 * biblioteca pesada de renderização no servidor).
 */

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';

/**
 * Busca histórico de um ticker brasileiro (Brapi), últimos 30 dias.
 */
async function buscarHistoricoBrasil(tickerSemSufixo) {
    try {
        const url = `${BRAPI_BASE_URL}/quote/${encodeURIComponent(tickerSemSufixo)}?range=1mo&interval=1d&token=${BRAPI_TOKEN}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.results || !dados.results[0] || !dados.results[0].historicalDataPrice) {
            return { sucesso: false, erro: 'Histórico não disponível' };
        }

        const historico = dados.results[0].historicalDataPrice;
        const datas = historico.map((h) => new Date(h.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        const precos = historico.map((h) => h.close);

        return { sucesso: true, datas, precos };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Busca histórico de um ticker global (Twelve Data), últimos 30 dias.
 */
async function buscarHistoricoGlobal(ticker) {
    try {
        const url = `${TWELVEDATA_BASE_URL}/time_series?symbol=${encodeURIComponent(ticker)}&interval=1day&outputsize=30&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.status === 'error' || !dados.values) {
            return { sucesso: false, erro: dados.message || 'Histórico não disponível' };
        }

        const valoresOrdenados = [...dados.values].reverse(); // API retorna do mais recente ao mais antigo
        const datas = valoresOrdenados.map((v) => {
            const d = new Date(v.datetime);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });
        const precos = valoresOrdenados.map((v) => parseFloat(v.close));

        return { sucesso: true, datas, precos };
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

/**
 * Ponto de entrada único: decide a fonte com base no formato do ticker.
 */
async function buscarHistorico(ticker) {
    if (ticker.toUpperCase().endsWith('.SA')) {
        const tickerSemSufixo = ticker.slice(0, -3);
        return buscarHistoricoBrasil(tickerSemSufixo);
    }
    return buscarHistoricoGlobal(ticker);
}

/**
 * Monta a URL do Yahoo Finance para o ticker, para consulta
 * interativa (zoom, períodos diferentes) fora do Telegram.
 */
function gerarUrlYahooFinance(ticker) {
    return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`;
}

/**
 * Monta a URL do QuickChart a partir do histórico de datas/preços.
 */
function gerarUrlGrafico(ticker, datas, precos) {
    const config = {
        type: 'line',
        data: {
            labels: datas,
            datasets: [
                {
                    label: ticker,
                    data: precos,
                    fill: false,
                    borderColor: 'rgb(75, 139, 235)',
                    tension: 0.1,
                },
            ],
        },
        options: {
            title: {
                display: true,
                text: `${ticker} — Últimos 30 dias`,
            },
        },
    };

    const configCodificado = encodeURIComponent(JSON.stringify(config));
    return `https://quickchart.io/chart?c=${configCodificado}&width=700&height=400`;
}

module.exports = {
    buscarHistorico,
    gerarUrlGrafico,
    gerarUrlYahooFinance,
};
