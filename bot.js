// Arquivo: bot.js — NOVA (Bot de Análise de Mercado)

// CAPTURA DE ERROS PARA APARECER NO LOG DO RENDER
process.on('uncaughtException', (err) => {
    console.error('ERRO NÃO CAPTURADO:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('PROMISE REJEITADA:', reason);
});

const express = require('express');
const { Telegraf } = require('telegraf');
const mercado = require('./mercado');
const listaPadrao = require('./listaPadrao');
const analise = require('./analise');
const indices = require('./indices');
const grafico = require('./grafico');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

const estadoConversa = new Map();

bot.start((ctx) => ctx.reply(
    "🚀 *NOVA Ativo!*\n\nSou seu bot de análise de mercado global (ações Brasil + EUA).\n\n" +
    "Comandos disponíveis:\n" +
    "/investir — varredura completa de mercado\n" +
    "/grafico — gráfico dos últimos 30 dias de um ativo",
    { parse_mode: 'Markdown' }
));

bot.command('investir', async (ctx) => {
    estadoConversa.set(ctx.chat.id, { etapa: 'aguardando_valor' });
    await ctx.reply(
        "💰 Qual valor você pretende investir?\n\n(Digite apenas o número, ex: 100. Ou digite *pular* se não quiser informar.)",
        { parse_mode: 'Markdown' }
    );
});

bot.command('grafico', async (ctx) => {
    estadoConversa.set(ctx.chat.id, { etapa: 'aguardando_ticker_grafico' });
    await ctx.reply(
        "📈 Qual ativo você quer ver no gráfico?\n\n(Ex: *PETR4.SA*, *AAPL*, *VALE3.SA*)",
        { parse_mode: 'Markdown' }
    );
});

bot.command('cancelar', async (ctx) => {
    estadoConversa.delete(ctx.chat.id);
    await ctx.reply("❌ Operação cancelada.");
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const texto = ctx.message.text.trim();
    const estado = estadoConversa.get(chatId);

    if (!estado) return;

    if (estado.etapa === 'aguardando_valor') {
        const valorInformado = texto.toLowerCase() === 'pular' ? null : texto;
        estadoConversa.set(chatId, { etapa: 'aguardando_tickers_extra', valorInvestir: valorInformado });
        await ctx.reply(
            "📈 Quer adicionar algum ticker específico além da lista padrão?\n\n" +
            "(Ex: *KO, NFLX, SAP.DE* — separados por vírgula. Ou digite *não* para usar só a lista padrão.)",
            { parse_mode: 'Markdown' }
        );
        return;
    }

    if (estado.etapa === 'aguardando_tickers_extra') {
        const tickersExtras = texto.toLowerCase() === 'não' || texto.toLowerCase() === 'nao'
            ? []
            : texto.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);

        const listaCompleta = [...listaPadrao.LISTA_PADRAO_COMPLETA, ...tickersExtras];
        estadoConversa.delete(chatId);

        const tempoEstimadoMin = Math.ceil(((listaCompleta.length + 4) * 8) / 60);
        await ctx.reply(
            `🔍 *Varredura iniciada* — ${listaCompleta.length} ativos + índices.\nTempo estimado: ~${tempoEstimadoMin} min (respeitando limite da API).\nAguarde...`,
            { parse_mode: 'Markdown' }
        );

        try {
            const indicesResultado = await indices.buscarTodosIndices();
            const textoIndices = indices.formatarIndices(indicesResultado);
            await ctx.reply(textoIndices, { parse_mode: 'Markdown' });

            const cotacoes = await mercado.buscarMultiplasCotacoes(listaCompleta);
            const relatorio = analise.gerarRelatorioVarredura(cotacoes, estado.valorInvestir);
            await ctx.reply(relatorio, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error("Erro na varredura:", e.message);
            await ctx.reply("⚠️ Ocorreu um erro durante a varredura. Tente novamente com /investir.");
        }
        return;
    }

    if (estado.etapa === 'aguardando_ticker_grafico') {
        const ticker = texto.toUpperCase();
        estadoConversa.delete(chatId);

        await ctx.reply(`🔍 Buscando histórico de *${ticker}*...`, { parse_mode: 'Markdown' });

        try {
            const historico = await grafico.buscarHistorico(ticker);

            if (!historico.sucesso) {
                await ctx.reply(`⚠️ Não foi possível obter o histórico de ${ticker}: ${historico.erro}`);
                return;
            }

            const urlGrafico = grafico.gerarUrlGrafico(ticker, historico.datas, historico.precos);
            const urlYahoo = grafico.gerarUrlYahooFinance(ticker);
            await ctx.replyWithPhoto(urlGrafico, {
                caption: `📈 *${ticker}* — Últimos 30 dias\n\n` +
                    `🔗 [Ver gráfico interativo no Yahoo Finance](${urlYahoo})\n\n` +
                    `⚠️ Movimento histórico, sem previsão de comportamento futuro.`,
                parse_mode: 'Markdown',
            });
        } catch (e) {
            console.error("Erro no gráfico:", e.message);
            await ctx.reply("⚠️ Ocorreu um erro ao gerar o gráfico. Tente novamente com /grafico.");
        }
        return;
    }
});

app.listen(PORT, () => {
    console.log(`Porta ${PORT}`);
    bot.launch()
        .then(() => console.log("Telegram Conectado!"))
        .catch((err) => console.error("Erro Telegraf:", err.message));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
