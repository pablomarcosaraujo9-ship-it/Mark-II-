const { Telegraf } = require('telegraf');
const express = require('express');
const estrategias = require('./estrategias');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const textoVoisins = "22,18,29,7,28,12,35,3,26,32,15,19,4,21,2,25,17,34";
const textoTiers = "6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9";

const AREA_1_VOISINS = textoVoisins.split(',').map(n => parseInt(n, 10));
const AREA_2_TIERS = textoTiers.split(',').map(n => parseInt(n, 10));

let numHistorico = []; 
let alvosPendentes = []; 
let contagemGreens = 0;
let contagemReds = 0;
let redsSeguidos = 0; 
let modoAnaliseBloqueado = false; 

app.get('/', (req, res) => {
  res.send('Projeto Mark II operando!');
});

const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

async function limparChatCompleto(ctx) {
  const messageIdAtual = ctx.message.message_id;
  for (let i = 0; i < 40; i++) {
    try { await ctx.deleteMessage(messageIdAtual - i); } catch (err) {}
  }
}

function resetarDados() {
  numHistorico = [];
  alvosPendentes = [];
  contagemGreens = 0;
  contagemReds = 0;
  redsSeguidos = 0;
  modoAnaliseBloqueado = false;
  estrategias.resetarAusencias();
}

bot.start(async (ctx) => {
  resetarDados();
  ctx.reply('🤖 *Projeto Mark II Ativado!*\n📊 Modo Adaptativo de Ausência Pronto.', { parse_mode: 'Markdown' });
});

bot.command('zerar', async (ctx) => {
  await limparChatCompleto(ctx);
  resetarDados();
  await ctx.reply('🔄 *Mesa Reiniciada!* Análise adaptativa limpa.', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();
  const numero = parseInt(texto, 10);

  if (isNaN(numero) || numero < 0 || numero > 36 || texto !== numero.toString()) {
    return ctx.reply('⚠️ Digite um número válido.');
  }

  let areaAtual = "OUTRA";
  if (AREA_1_VOISINS.includes(numero)) areaAtual = "VIZINHOS DO ZERO";
  if (AREA_2_TIERS.includes(numero)) areaAtual = "TIERS DO CILINDRO";

  if (modoAnaliseBloqueado) {
    return ctx.reply(`⚠️ *STOP-LOSS ATIVO*`, { parse_mode: 'Markdown' });
  }

  let mensagemResultado = "";

  // 1. VERIFICAÇÃO DO PLACAR DA RODADA ANTERIOR
  if (alvosPendentes.length > 0) {
    if (alvosPendentes.includes(numero)) {
      contagemGreens++;
      redsSeguidos = 0;
      mensagemResultado = "🎉 *GREEN CIRÚRGICO!* 💰\n\n";
      alvosPendentes = [];
    } else {
      mensagemResultado = "🔄 *Tentativa 1 Falhou. Protegendo no GALE 1...*\n\n";
    }
  }

  // Envia para o motor processar a inteligência dinâmica
  const resultadoTatico = estrategias.processarEstrategias(numero, areaAtual);

  // 2. VERIFICAÇÃO DO RESULTADO DO GALE
  if (resultadoTatico.resultadoGale) {
    if (resultadoTatico.resultadoGale === "GREEN_GALE") {
      contagemGreens++;
      redsSeguidos = 0;
      mensagemResultado = "✅ *GREEN NO GALE 1!* 💰\n\n";
    } else {
      contagemReds++;
      redsSeguidos++;
      mensagemResultado = "❌ *RED CONFIRMADO NO GALE.*\n\n";
    }
    alvosPendentes = []; 
  }

  if (redsSeguidos >= 2) {
    modoAnaliseBloqueado = true;
    return ctx.reply(`🚨 *STOP-LOSS ATIVADO!*`, { parse_mode: 'Markdown' });
  }

  numHistorico.push(numero);
  if (numHistorico.length > 6) numHistorico.shift();
  
  const stringPainel = `📊 *Placar:* ${contagemGreens} ✅ | ${contagemReds} ❌\n⏱️ *Últimos Giros:* ${numHistorico.join(' ➔ ')}`;

  if (resultadoTatico.alerta) {
    alvosPendentes = resultadoTatico.alvos;
  }

  ctx.reply(
    `${mensagemResultado}${resultadoTatico.alerta || ""}${areaAtual === "VIZINHOS DO ZERO" ? "🔴" : "🔵"} *REGISTRO*\nNúmero ${numero} catalogado.\n\n${stringPainel}`,
    { parse_mode: 'Markdown' }
  );
});

app.listen(PORT, async () => {
  if (process.env.RENDER_EXTERNAL_URL) {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${WEBHOOK_PATH}`;
    try { await bot.telegram.setWebhook(webhookUrl); } catch (err) {}
  }
});
