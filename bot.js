// Arquivo: bot.js

// CAPTURA DE ERROS PARA APARECER NO LOG DO RENDER
process.on('uncaughtException', (err) => {
    console.error('ERRO NÃO CAPTURADO:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('PROMISE REJEITADA:', reason);
});

const express = require('express');
const { Telegraf } = require('telegraf');
const estrategias = require('./estrategias');
const estatisticas = require('./estatisticas');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

let contadorRedsSeguidos = 0;
let modoFantasmaAtivo = false;
let placarGreens = 0;
let placarReds = 0;
let historicoVisivel = [];

function obterTextoPlacar() {
    return `📊 Placar Atual: ${placarGreens} ✅ | ${placarReds} ❌`;
}

// DETERMINA A COR DO NÚMERO NA ROLETA EUROPEIA VIA LÓGICA MATEMÁTICA LIMPANDO ARRAYS
function obterBolaCor(n) {
    if (n === 0) return "🟢";
    
    // Regra do pano da roleta: define se o número é vermelho ou preto
    const ehVermelho = (n >= 1 && n <= 10 && n % 2 !== 0) || 
                       (n >= 11 && n <= 18 && n % 2 === 0) || 
                       (n >= 19 && n <= 28 && n % 2 !== 0) || 
                       (n >= 29 && n <= 36 && n % 2 === 0);
                       
    return ehVermelho ? "🔴" : "🔵";
}

// FUNÇÃO CENTRAL REUTILIZÁVEL PARA PROCESSAR CADA NÚMERO
async function processarEntradaNumero(numeroSurgido, chatIdDestino) {
    estatisticas.adicionarNovoGiro(numeroSurgido);
    const resultadoMesa = estrategias.processarEstrategias(numeroSurgido, "OUTRA");
    
    historicoVisivel.push(numeroSurgido);
    if (historicoVisivel.length > 6) historicoVisivel.shift();
    const textoGiros = historicoVisivel.join(' ➔ ');
    const bolaCor = obterBolaCor(numeroSurgido);

    // 1. CHECAGEM DOS RESULTADOS DE JOGADAS EM ANDAMENTO
    if (resultadoMesa.resultadoGale) {
        const statusRodada = resultadoMesa.resultadoGale;

        if (!modoFantasmaAtivo) {
            if (statusRodada === "GREEN_GALE") {
                placarGreens++;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(chatIdDestino, `✅ *GREEN NO GALE 1!* Saldo protegido com sucesso! 💰\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                placarReds++;
                contadorRedsSeguidos++;
                await bot.telegram.sendMessage(chatIdDestino, `❌ *RED CONFIRMADO NO GALE.*\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });

                if (contadorRedsSeguidos >= 2) {
                    modoFantasmaAtivo = true;
                    await bot.telegram.sendMessage(chatIdDestino, `⚠️ *STOP-LOSS ATIVADO (2 REDs)!*\nO bot entrou em modo de *Entrada Fantasma* de teste.\nO sistema analisará a mesa sem expor suas fichas.`, { parse_mode: 'Markdown' });
                }
            }
        } else {
            if (statusRodada === "GREEN_GALE") {
                modoFantasmaAtivo = false;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(chatIdDestino, `✅ *TESTE VIRTUAL DEU GREEN!*\nA estabilidade da mesa retornou.\n🔄 *Retornando às operações reais na próxima oportunidade.*`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                await bot.telegram.sendMessage(chatIdDestino, `🚨 *TESTE FALHOU (RED FANTASMA)!*\nA roleta continua instável.\n⚠️ *RECOMENDADO TROCAR DE MESA IMEDIATAMENTE!*`, { parse_mode: 'Markdown' });
            }
        }
    }

    // 2. DISPARO DE NOVOS ALERTAS CAPTURADOS PELO MOTOR SNIPER
    if (resultadoMesa.alerta) {
        if (!modoFantasmaAtivo) {
            await bot.telegram.sendMessage(chatIdDestino, resultadoMesa.alerta, { parse_mode: 'Markdown' });
        } else {
            console.log(`[Modo Fantasma] Testando parâmetros em silêncio para: ${resultadoMesa.alvos.join(', ')}`);
        }
    }

    // 3. RETORNO CURTO DE CONFIRMAÇÃO DE CATÁLOGO (IGUAL AO PROJETO ANTIGO)
    await bot.telegram.sendMessage(chatIdDestino, `${bolaCor} *REGISTRO*\nNúmero ${numeroSurgido} catalogado.\n\n${obterTextoPlacar()}\n⏱️ Últimos Giros: ${textoGiros}`, { parse_mode: 'Markdown' });
}

// COMANDOS DO TELEGRAM
bot.command('zerar', async (ctx) => {
    contadorRedsSeguidos = 0;
    modoFantasmaAtivo = false;
    placarGreens = 0;
    placarReds = 0;
    historicoVisivel = [];
    estrategias.resetarAusencias();
    try {
        await ctx.reply("🧹 *PROJETO MARK II REINICIADO!*\nSistemas e históricos zerados.", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Erro /zerar:", e.message);
    }
});

bot.command('stats', async (ctx) => {
    try {
        await ctx.reply(estatisticas.gerarPainelEstatistico(), { parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Erro /stats:", e.message);
    }
});

bot.start((ctx) => ctx.reply("🚀 Bot Mark II Ativo!\nDigite apenas o número que saiu na roleta para catalogar."));

// ESCUTADOR DE TEXTO: Captura quando você digita apenas o número no chat
bot.on('text', async (ctx) => {
    const texto = ctx.message.text.trim();
    const numero = parseInt(texto);

    if (!isNaN(numero) && numero >= 0 && numero <= 36) {
        await processarEntradaNumero(numero, ctx.chat.id);
    }
});

// RECEPTOR WEBHOOK (MANTIDO POR SEGURANÇA)
app.post('/webhook-roleta', async (req, res) => {
    if (!req.body || !req.body.numero) {
        return res.status(400).send({ status: "dados_invalidos" });
    }
    const numeroSurgido = parseInt(req.body.numero);
    const destinoID = CHAT_ID || req.body.chat_id;
    
    if (destinoID) {
        await processarEntradaNumero(numeroSurgido, destinoID);
    }
    res.status(200).send({ status: "processado" });
});

app.listen(PORT, () => {
    console.log(`Porta ${PORT}`);
    bot.launch()
        .then(() => console.log("Telegram Conectado!"))
        .catch((err) => console.error("Erro Telegraf:", err.message));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
