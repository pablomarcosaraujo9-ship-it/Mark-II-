/**
 * MÓDULO DE ÍNDICES — NOVA
 * ===========================
 * Busca o "termômetro geral" do mercado: principais índices e câmbio.
 * Ajuda a interpretar se um movimento individual é isolado ou reflete
 * uma tendência mais ampla do mercado como um todo.
 */

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';

/**
 * Busca o Ibovespa via Brapi.
 */
async function buscarIbovespa() {
    try {
        const url = `${BRAPI_BASE_URL}/quote/^BVSP?token=${BRAPI_TOKEN}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.results || dados.results.length === 0) {
            return { sucesso: false, nome: 'Ibovespa', erro: dados.message || 'Não disponível' };
        }

        const r = dados.results[0];
        return {
            sucesso: true,
            nome: 'Ibovespa',
            valor: r.regularMarketPrice,
            variacaoPercentual: r.regularMarketChangePercent,
        };
    } catch (erro) {
        return { sucesso: false, nome: 'Ibovespa', erro: erro.message };
    }
}

/**
 * Busca um índice global (S&P 500 ou Nasdaq) via Twelve Data.
 */
async function buscarIndiceGlobal(simbolo, nomeExibicao) {
    try {
        const url = `${TWELVEDATA_BASE_URL}/quote?symbol=${encodeURIComponent(simbolo)}&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.status === 'error' || dados.code) {
            return { sucesso: false, nome: nomeExibicao, erro: dados.message || 'Não disponível' };
        }

        return {
            sucesso: true,
            nome: nomeExibicao,
            valor: parseFloat(dados.close),
            variacaoPercentual: parseFloat(dados.percent_change),
        };
    } catch (erro) {
        return { sucesso: false, nome: nomeExibicao, erro: erro.message };
    }
}

/**
 * Busca a cotação do Dólar (USD/BRL) via Twelve Data.
 */
async function buscarDolar() {
    try {
        const url = `${TWELVEDATA_BASE_URL}/quote?symbol=USD/BRL&apikey=${TWELVEDATA_API_KEY}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (dados.status === 'error' || dados.code) {
            return { sucesso: false, nome: 'Dólar (USD/BRL)', erro: dados.message || 'Não disponível' };
        }

        return {
            sucesso: true,
            nome: 'Dólar (USD/BRL)',
            valor: parseFloat(dados.close),
            variacaoPercentual: parseFloat(dados.percent_change),
        };
    } catch (erro) {
        return { sucesso: false, nome: 'Dólar (USD/BRL)', erro: erro.message };
    }
}

/**
 * Busca todos os índices de uma vez, espaçando as chamadas
 * para respeitar limites de requisições por minuto.
 */
async function buscarTodosIndices() {
    const resultados = [];

    resultados.push(await buscarIbovespa());
    await new Promise((r) => setTimeout(r, 8000));

    resultados.push(await buscarIndiceGlobal('SPY', 'S&P 500 (via ETF SPY)'));
    await new Promise((r) => setTimeout(r, 8000));

    resultados.push(await buscarIndiceGlobal('QQQ', 'Nasdaq (via ETF QQQ)'));
    await new Promise((r) => setTimeout(r, 8000));

    resultados.push(await buscarDolar());

    return resultados;
}

/**
 * Formata os índices em texto Markdown para o Telegram.
 */
function formatarIndices(indices) {
    let texto = `🌎 *ÍNDICES DE MERCADO*\n───────────────────────\n`;

    indices.forEach((idx) => {
        if (idx.sucesso) {
            const sinal = idx.variacaoPercentual >= 0 ? '+' : '';
            const emoji = idx.variacaoPercentual >= 0 ? '🟢' : '🔴';
            texto += `${emoji} *${idx.nome}:* ${idx.valor.toFixed(2)} (${sinal}${idx.variacaoPercentual.toFixed(2)}%)\n`;
        } else {
            texto += `⚪ *${idx.nome}:* indisponível no momento\n`;
        }
    });

    return texto;
}

module.exports = {
    buscarTodosIndices,
    formatarIndices,
};
