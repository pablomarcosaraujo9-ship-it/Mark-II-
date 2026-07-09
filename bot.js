// Arquivo: bot.js
const express = require('express');
const { Telegraf } = require('telegraf');
const estrategias = require('./estrategias');

// Lendo as credenciais seguras diretamente de dentro do painel do Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

// Controle de Stop-Loss e Entrada Fantasma (Otimizado para RAM)
let contadorRedsSeguidos = 0;
let modoFantasmaAtivo = false;
let placarGreens = 0;
let placarReds = 0;

function obterTextoPlacar() {
    return `📊 Placar Atual: ${placarGreens} ✅ | ${placarReds} ❌`;
}

// Comando /zerar - Limpa o chat e reinicia os estados do robô
bot.command('zerar', async (ctx) => {
    contadorRedsSeguidos = 0;
    modoFantasmaAtivo = false;
    placarGreens = 0;
    placarReds = 0;
    estrategias.resetarAusencias();
    try {
        await ctx.reply("🧹 *PROJETO MARK II REINICIADO!*\nSistemas e históricos recalibrados com sucesso.", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Erro no comando zerar:", e.message);
    }
});

// Comando /start - Teste rápido para ver se o robô está acordado
bot.start((ctx) => ctx.reply("🚀 Bot Mark II Ativo e Pronto para monitorar os Terminais Gêmeos!"));

// Webhook que recebe as jogadas da roleta ao vivo
app.post('/webhook-roleta', async (req, res) => {
    if (!req.body || !req.body.numero) {
        return res.status(400).send({ status: "dados_invalidos" });
    }

    const numeroSurgido = parseInt(req.body.numero);
    const areaCilindro = req.body.area || "OUTRA";
    const resultadoMesa = estrategias.processarEstrategias(numeroSurgido, areaCilindro);

    // 1. ANÁLISE DE RESULTADO DE GALE (MESA REAL OU FANTASMA)
    if (resultadoMesa.resultadoGale) {
        const statusRodada = resultadoMesa.resultadoGale;

        if (!modoFantasmaAtivo) {
            // Operação com dinheiro real
            if (statusRodada === "GREEN_GALE") {
                placarGreens++;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(CHAT_ID, `✅ *GREEN NO GALE 1!*\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                placarReds++;
                contadorRedsSeguidos++;
                await bot.telegram.sendMessage(CHAT_ID, `❌ *RED CONFIRMADO NO GALE.*\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });

                // Ativação automática do Stop-Loss técnico após 2 REDs
                if (contadorRedsSeguidos >= 2) {
                    modoFantasmaAtivo = true;
                    await bot.telegram.sendMessage(CHAT_ID, `⚠️ *STOP-LOSS ATIVADO (2 REDs)!*\nO bot entrou em modo de *Entrada Fantasma* de teste.\nO sistema analisará a mesa sem expor suas fichas.`, { parse_mode: 'Markdown' });
                }
            }
        } else {
            // Operação em modo teste de segurança
            if (statusRodada === "GREEN_GALE") {
                modoFantasmaAtivo = false;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(CHAT_ID, `✅ *TESTE VIRTUAL DEU GREEN!*\nA estabilidade da mesa retornou.\n🔄 *Retornando às operações reais na próxima oportunidade.*`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                await bot.telegram.sendMessage(CHAT_ID, `🚨 *TESTE FALHOU (RED FANTASMA)!*\nA roleta continua quebrando padrões.\n⚠️ *RECOMENDADO TROCAR DE MESA IMEDIATAMENTE!*`, { parse_mode: 'Markdown' });
            }
        }
    }

    // 2. DISPARO DE ALERTAS CAPTURADOS PELO MOTOR SNIPER
    if (resultadoMesa.alerta) {
        if (!modoFantasmaAtivo) {
            await bot.telegram.sendMessage(CHAT_ID, resultadoMesa.alerta, { parse_mode: 'Markdown' });
        } else {
            console.log(`[Modo Fantasma] Testando parâmetros em silêncio para: ${resultadoMesa.alvos.join(', ')}`);
        }
    }

    res.status(200).send({ status: "processado" });
});

// Inicialização estável do servidor e do Telegraf
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    bot.launch()
        .then(() => console.log("Telegram Conectado com as credenciais do Render!"))
        .catch((err) => console.error("Erro na conexão do Telegraf:", err.message));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
