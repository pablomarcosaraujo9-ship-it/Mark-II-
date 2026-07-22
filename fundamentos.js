/**
 * MÓDULO DE FUNDAMENTOS — NOVA (SCANNER)
 * ==========================================
 * Busca dados fundamentalistas REAIS (não mock) via Brapi, módulo
 * financialData. Disponível apenas para ativos do Brasil nesta
 * versão — não há fonte gratuita confirmada de fundamentos para
 * ativos dos EUA/globais.
 */

const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
const BRAPI_BASE_URL = 'https://brapi.dev/api';

/**
 * Busca fundamentos de um ticker. Retorna { disponivel: false, motivo }
 * se não for possível (ticker não-BR, dado ausente, erro de API).
 */
async function buscarFundamentos(ticker) {
    if (!ticker.toUpperCase().endsWith('.SA')) {
        return {
            disponivel: false,
            motivo: 'Fundamentos automáticos disponíveis apenas para ativos do Brasil nesta versão.',
        };
    }

    const tickerSemSufixo = ticker.slice(0, -3);

    try {
        const url = `${BRAPI_BASE_URL}/quote/${encodeURIComponent(tickerSemSufixo)}?modules=financialData,defaultKeyStatistics&token=${BRAPI_TOKEN}`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.results || !dados.results[0]) {
            return { disponivel: false, motivo: 'Dados fundamentalistas não retornados pela API.' };
        }

        const r = dados.results[0];
        const fd = r.financialData || {};
        const dks = r.defaultKeyStatistics || {};

        const temAlgumDado = [fd.profitMargins, fd.debtToEquity, dks.returnOnEquity].some(
            (v) => v !== undefined && v !== null
        );

        if (!temAlgumDado) {
            return {
                disponivel: false,
                motivo: 'Módulo de fundamentos retornou vazio (pode exigir plano superior da Brapi).',
            };
        }

        return {
            disponivel: true,
            lucroMargem: fd.profitMargins ?? null,
            dividaPatrimonio: fd.debtToEquity ?? null,
            retornoPatrimonio: fd.returnOnEquity ?? dks.returnOnEquity ?? null,
        };
    } catch (erro) {
        return { disponivel: false, motivo: erro.message };
    }
}

/**
 * Classifica a saúde financeira com base em limiares simples,
 * sem julgamento de "comprar ou não" — só descreve o estado atual.
 */
function classificarSaudeFinanceira(fund) {
    if (!fund.disponivel) {
        return { status: 'sem_dados', linhas: [] };
    }

    const linhas = [];
    let sinaisNegativos = 0;
    let sinaisTotal = 0;

    if (fund.lucroMargem !== null) {
        sinaisTotal++;
        if (fund.lucroMargem > 0) {
            linhas.push(`✅ Margem de lucro: ${(fund.lucroMargem * 100).toFixed(1)}% (positiva)`);
        } else {
            linhas.push(`❌ Margem de lucro: ${(fund.lucroMargem * 100).toFixed(1)}% (negativa)`);
            sinaisNegativos++;
        }
    }

    if (fund.dividaPatrimonio !== null) {
        sinaisTotal++;
        if (fund.dividaPatrimonio < 100) {
            linhas.push(`✅ Dívida/Patrimônio: ${fund.dividaPatrimonio.toFixed(1)} (controlada)`);
        } else if (fund.dividaPatrimonio < 200) {
            linhas.push(`⚠️ Dívida/Patrimônio: ${fund.dividaPatrimonio.toFixed(1)} (elevada)`);
        } else {
            linhas.push(`❌ Dívida/Patrimônio: ${fund.dividaPatrimonio.toFixed(1)} (alta)`);
            sinaisNegativos++;
        }
    }

    if (fund.retornoPatrimonio !== null) {
        sinaisTotal++;
        if (fund.retornoPatrimonio > 0.1) {
            linhas.push(`✅ Retorno sobre patrimônio (ROE): ${(fund.retornoPatrimonio * 100).toFixed(1)}%`);
        } else if (fund.retornoPatrimonio > 0) {
            linhas.push(`⚠️ Retorno sobre patrimônio (ROE): ${(fund.retornoPatrimonio * 100).toFixed(1)}% (modesto)`);
        } else {
            linhas.push(`❌ Retorno sobre patrimônio (ROE): ${(fund.retornoPatrimonio * 100).toFixed(1)}% (negativo)`);
            sinaisNegativos++;
        }
    }

    if (sinaisTotal === 0) {
        return { status: 'sem_dados', linhas: [] };
    }

    let status;
    if (sinaisNegativos === 0) status = 'saudavel';
    else if (sinaisNegativos < sinaisTotal) status = 'atencao';
    else status = 'deteriorado';

    return { status, linhas };
}

module.exports = {
    buscarFundamentos,
    classificarSaudeFinanceira,
};
