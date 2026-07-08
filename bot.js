const { Telegraf } = require('telegraf');
const express = require('express');
const estrategias = require('./estrategias'); // Puxa o arquivo de regras

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Setores do Cilindro
const textoVoisins = "22,18,29,7,28,12,35,3,26,32,15,19,4,21,2,25,17,34";
const textoTiers = "6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9";
const textoOrfaos = "1,20,14,31,9,17,34,6"; 

const AREA_1_VOISINS = textoVoisins.split(',').map(n => parseInt(n, 10));
const AREA_2_TIERS = textoTiers.split(',').map(n => parseInt(n, 10));
const AREA_3_ORFAOS = textoOrfaos.split(',').map(n => parseInt(n, 10));

// Variáveis de controle de tendência, PLACAR e SEGURANÇA
let ultimasAreas = []; 
let numHistorico = []; 
let alvosPendentes = []; 
let contagemGreens = 0;
let contagemReds = 0;
let redsSeguidos = 0; 
let modoAnaliseBloqueado = false; 

app.get('/', (req, res) => {
  res.send('Projeto Mark II online e operando!');
});

const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Função para varrer e limpar o chat em lote
async function limparChatCompleto(ctx) {
  const messageIdAtual = ctx.message.message_id;
  for (let i = 0; i < 40; i++) {
    try { await ctx.deleteMessage(messageIdAtual - i); } catch (err) {}
  }
}

function resetarDados() {
  ultimasAreas = [];
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
  ctx.reply('🤖 *Projeto Mark II — Sistema de Exaustão!*\n\nModo Inteligente Ativo:\n📊 Placar zerado.\n🔒 Regra de Ausência (3 a 4 Casas).\n🎰 Martingale (Gale 1) Integrado.', { parse_mode: 'Markdown' });
});

bot.command('zerar', async (ctx) => {
  await limparChatCompleto(ctx);
  resetarDados();
  await ctx.reply('🔄 *Mesa Reiniciada!*\nFiltros limpos, histórico resetado e prontos para nova análise.', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();
  const numero = parseInt(texto, 10);

  if (isNaN(numero) || numero < 0 || numero > 36 || texto !== numero.toString()) {
    return ctx.reply('⚠️ Digite apenas um número válido entre 0 e 36.');
  }

  // Identificação do Setor
  let areaAtual = "OUTRA";
  if (AREA_1_VOISINS.includes(numero)) areaAtual = "VIZINHOS DO ZERO";
  if (AREA_2_TIERS.includes(numero)) areaAtual = "TIERS DO CILINDRO";
  if (AREA_3_ORFAOS.includes(numero) && areaAtual === "OUTRA") areaAtual = "ÓRFÃOS";

  const terminalAtual = numero % 10;

  if (modoAnaliseBloqueado) {
    numHistorico.push(numero);
    if (numHistorico.length > 6) numHistorico.shift();
    return ctx.reply(`⚠️ *BOT EM MODO DE ANÁLISE*\nStop-Loss ativo. Digite /zerar para destravar.\n\n🔢 Número: ${numero} (${areaAtual})`, { parse_mode: 'Markdown' });
  }

  let mensagemResultado = "";

  // 1. ANÁLISE DE PLACAR STANDARD (SINAIS NORMAIS)
  if (alvosPendentes.length > 0) {
    if (alvosPendentes.includes(numero)) {
      contagemGreens++;
      redsSeguidos = 0;
      mensagemResultado = "🎉 *GREEN CIRÚRGICO ATINGIDO!* 💰\n\n";
      alvosPendentes = [];
    } else {
      mensagemResultado = "🔄 *Rodada 1 Falhou.* Entrando com proteção de GALE 1 na sequência!\n\n";
      // Mantém os alvos abertos na memória para a próxima rodada (Gale 1)
    }
  }

  // Atualização Antecipada do Histórico Local (Garante sincronia com o motor)
  if (numero !== 0) {
    ultimasAreas.push(areaAtual);
    if (ultimasAreas.length > 6) ultimasAreas.shift();
  }
  numHistorico.push(numero);
  if (numHistorico.length > 6) numHistorico.shift();

  // Executa os cálculos matemáticos da outra pasta (estrategias.js)
  const resultadoTatico = estrategias.processarEstrategias(numero, areaAtual, numHistorico, ultimasAreas);

  // 2. ANÁLISE DE PLACAR DE GALE (SINAIS DE SEGUNDA CHANCE)
  if (resultadoTatico.resultadoGale) {
    if (resultadoTatico.resultadoGale === "GREEN_GALE") {
      contagemGreens++;
      redsSeguidos = 0;
      mensagemResultado = "✅ *GREEN NO GALE 1!* Saldo protegido com sucesso! 💰\n\n";
    } else {
      contagemReds++;
      redsSeguidos++;
      mensagemResultado = "❌ *RED CONFIRMADO.* O Gale 1 não sustentou o retorno.\n\n";
    }
    alvosPendentes = []; // Limpa de vez após o Gale rodar
  }

  // Verificação de Stop-Loss (2 Reds Seguidos)
  if (redsSeguidos >= 2) {
    modoAnaliseBloqueado = true;
    return ctx.reply(`🚨 *STOP-LOSS ATIVADO!* 🚨\nBanca protegida. O robô congelou para análise.\n\n🔄 Digite /zerar quando o fluxo normalizar.`, { parse_mode: 'Markdown' });
  }
  
  const stringPainel = `📊 *Placar:* ${contagemGreens} ✅ | ${contagemReds} ❌\n⏱️ *Últimos Giros:* ${numHistorico.join(' ➔ ')}`;

  if (numero === 0) {
    alvosPendentes = [];
    return ctx.reply(`${mensagemResultado}🟢 *Número 0 (Coringa)*\nO zero resetou as análises.\n\n${stringPainel}`, { parse_mode: 'Markdown' });
  }

  // Se a estratégia encontrou um sinal novo na rodada atual
  let analiseDestaque = "";
  if (resultadoTatico.alerta) {
    analiseDestaque = resultadoTatico.alerta;
    alvosPendentes = resultadoTatico.alvos;
  }

  let emojiSetor = areaAtual === "VIZINHOS DO ZERO" ? "🔴" : areaAtual === "TIERS DO CILINDRO" ? "🔵" : "🟡";
  if (areaAtual === "OUTRA") emojiSetor = "⚪";

  ctx.reply(
    `${mensagemResultado}${analiseDestaque}${emojiSetor} *REGISTRO: ${areaAtual}*\n` +
    `Número ${numero} catalogado (Terminal ${terminalAtual}).\n\n${stringPainel}`,
    { parse_mode: 'Markdown' }
  );
});

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.env.RENDER_EXTERNAL_URL) {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${WEBHOOK_PATH}`;
    try { await bot.telegram.setWebhook(webhookUrl); } catch (err) {}
  }
});
