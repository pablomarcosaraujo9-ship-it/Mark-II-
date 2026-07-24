// Arquivo: api/investir.js — endpoint do site NOVA Web (Vercel)
//
// IMPORTANTE: este arquivo reaproveita o MESMO mercado.js e
// analise.js que o bot de Telegram usa (por isso o require com
// "../"). Segue os mesmos princípios do bot:
// - Nunca recomenda compra ou venda.
// - Nunca mostra "potencial" ou "preço-alvo".
// - Informação de mercado passada/atual, sempre descritiva.

const mercado = require('../mercado');
const analise = require('../analise');
const listaPadrao = require('../listaPadrao');

module.exports = async (req, res) => {
    try {
        const tickers = listaPadrao.LISTA_PADRAO_COMPLETA;

        // Usa a versão em lotes paralelos (não a sequencial do bot),
        // porque a Vercel no plano grátis corta a função em 10s.
        const cotacoes = await mercado.buscarMultiplasCotacoesParalelo(tickers);

        // Mesmo texto de ranking que o bot manda no Telegram —
        // sem valor de orçamento aqui, só o ranking do dia.
        const texto = analise.gerarRelatorioVarredura(cotacoes, null);

        res.status(200).json({ texto });
    } catch (error) {
        console.error('Erro no endpoint /api/investir:', error);
        res.status(500).json({
            texto: `⚠️ Erro ao buscar dados de mercado: ${error.message}`,
        });
    }
};
