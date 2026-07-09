// Arquivo: bot.js
const express = require('express');
const { Telegraf } = require('telegraf');
const estrategias = require('./estrategias');

// Configure com suas variáveis ou coloque os textos direto entre as aspas
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "SEU_TOKEN_TELEGRAM";
const CHAT_ID = process.env.CHAT_ID || "SEU_CHAT_ID";
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

let contadorRedsSeguidos = 0;
let modoFantasmaAtivo = false;
let placarGreens = 0;
let placarReds = 0;

function obterTextoPlacar() {
    return `📊 Placar Atual: ${placarGreens} ✅ | ${placarReds} ❌`;
}

// Comando de inicialização e limpeza do bot
bot.command('zerar', async (ctx) => {
    contadorRedsSeguidos = 0;
    modoFantasmaAtivo = false;
    placarGreens = 0;
    placarReds = 0;
    estrategias.resetarAusencias();
    try {
        await ctx.reply("🧹 *PROJETO MARK II REINICIADO!*\nSistemas recalibrados.", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error(e);
    }
});

// Suporte ao comando start para testar se o bot está vivo
bot.start((ctx) => ctx.reply("🚀 Bot Mark II Ativo e Pronto!"));

app.post('/webhook-roleta', async (req, res) => {
    if (!req.body || !req.body.numero) {
        return res.status(400).send({ status: "dados_invalidos" });
    }

    const numeroSurgido = parseInt(req.body.numero);
    const areaCilindro = req.body.area || "OUTRA";
    const resultadoMesa = estrategias.processarEstrategias(numeroSurgido, areaCilindro);

    if (resultadoMesa.resultadoGale) {
        const statusRodada = resultadoMesa.resultadoGale;

        if (!modoFantasmaAtivo) {
            if (statusRodada === "GREEN_GALE") {
                placarGreens++;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(CHAT_ID, `✅ *GREEN NO GALE 1!*\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                placarReds++;
                contadorRedsSeguidos++;
                await bot.telegram.sendMessage(CHAT_ID, `❌ *RED CONFIRMADO NO GALE.*\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });

                if (contadorRedsSeguidos >= 2) {
                    modoFantasmaAtivo = true;
                    await bot.telegram.sendMessage(CHAT_ID, `⚠️ *STOP-LOSS (2 REDs)!*\nEntrando em modo de *Entrada Fantasma* de teste.`, { parse_mode: 'Markdown' });
                }
            }
        } else {
            if (statusRodada === "GREEN_GALE") {
                modoFantasmaAtivo = false;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(CHAT_ID, `✅ *TESTE VIRTUAL DEU GREEN!*\n🔄 *Retornando às operações reais.*`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                await bot.telegram.sendMessage(CHAT_ID, `🚨 *TESTE FALHOU (RED FANTASMA)!*\n⚠️ *RECOMENDADO TROCAR DE MESA!*`, { parse_mode: 'Markdown' });
            }
        }
    }

    if (resultadoMesa.alerta) {
        if (!modoFantasmaAtivo) {
            await bot.telegram.sendMessage(CHAT_ID, resultadoMesa.alerta, { parse_mode: 'Markdown' });
        }
    }

    res.status(200).send({ status: "processado" });
});

app.listen(PORT, () => {
    console.log(`Porta ${PORT}`);
    bot.launch()
        .then(() => console.log("Telegram Conectado!"))
        .catch((err) => console.error(err));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
