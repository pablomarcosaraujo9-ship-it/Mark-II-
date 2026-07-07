const { Telegraf } = require('telegraf');
const express = require('express');

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

// Listas de validação criadas via array tradicional
const CAVALOS_AREA_1 = Array.of(8, 9, 18, 19, 28, 29);
const CAVALOS_AREA_2 = Array.of(7, 8, 27, 28);
const CAVALOS_AREA_3 = Array.of(1, 6, 9, 14, 17, 20, 31, 34);

// Variáveis de controle de tendência, PLACAR e SEGURANÇA
let ultimasAreas = []; 
let numHistorico = []; 
let alvosPendentes = []; 
let areaAlvoSetorPendente = null; // Guarda o setor do sinal ativo para o filtro de quebra
let contagemGreens = 0;
let contagemReds = 0;
let redsSeguidos = 0; // Contador de Stop-Loss
let modoAnaliseBloqueado = false; // Trava do Stop-Loss

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
  areaAlvoSetorPendente = null;
  contagemGreens = 0;
  contagemReds = 0;
  redsSeguidos = 0;
  modoAnaliseBloqueado = false;
}

bot.start(async (ctx) => {
  resetarDados();
  ctx.reply('🤖 *Projeto Mark II — Atualizado!*\n\nModo Ultra Precisão:\n📊 Placar zerado.\n🔒 Trava de Stop-Loss (2 Reds).\n🎯 Foco em Terminais Isolados.', { parse_mode: 'Markdown' });
});

bot.command('zerar', async (ctx) => {
  await limparChatCompleto(ctx);
  resetarDados();
  await ctx.reply('🔄 *Mesa Reiniciada com Sucesso!*\nTrava de segurança liberada e histórico resetado.', { parse_mode: 'Markdown' });
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

  // Se o bot estiver travado por Stop-Loss, ele apenas cataloga sem mandar sinais
  if (modoAnaliseBloqueado) {
    numHistorico.push(numero);
    if (numHistorico.length > 6) numHistorico.shift();
    return ctx.reply(`⚠️ *BOT EM MODO DE ANÁLISE (PROTEÇÃO DE BANCA)*\nO Stop-Loss foi atingido. Digite /zerar para liberar o bot.\n\n🔢 Número catalogado: ${numero} (${areaAtual})`, { parse_mode: 'Markdown' });
  }

  // 1. SISTEMA DE PLACAR INTELIGENTE COM FILTROS DE QUEBRA
  let mensagemResultado = "";
  if (alvosPendentes.length > 0) {
    if (alvosPendentes.includes(numero)) {
      contagemGreens++;
      redsSeguidos = 0; // Reseta os reds seguidos pois deu Green
      mensagemResultado = "🎉 *GREEN DETECTADO! Alvo cirúrgico cravado!* 💰\n\n";
    } else {
      // FILTRO DE QUEBRA DE SETOR: Se o sinal era de um setor e saiu outro, cancela imediatamente
      if (areaAlvoSetorPendente !== null && areaAtual !== areaAlvoSetorPendente && numero !== 0) {
        mensagemResultado = "⚠️ *SINAL CANCELADO:* O setor quebrou o padrão antes do tempo. Entrada protegida!\n\n";
      } else if (numero !== 0) {
        contagemReds++;
        redsSeguidos++;
        mensagemResultado = "⚪ *Red na rodada.* O terminal/setor falhou no primeiro teste.\n\n";
      }
    }
    alvosPendentes = []; 
    areaAlvoSetorPendente = null;
  }

  // Verificação da Trava de Stop-Loss (2 Reds Seguidos)
  if (redsSeguidos >= 2) {
    modoAnaliseBloqueado = true;
    return ctx.reply(`🚨 *STOP-LOSS ATIVADO!* 🚨\nForam detectados ${redsSeguidos} Reds seguidos. O robô congelou as entradas para proteger seu saldo.\n\n🔄 Analise a mesa e digite /zerar quando o fluxo normalizar.`, { parse_mode: 'Markdown' });
  }

  // Atualização do Histórico
  if (numero !== 0) {
    ultimasAreas.push(areaAtual);
    if (ultimasAreas.length > 6) ultimasAreas.shift();
  }
  numHistorico.push(numero);
  if (numHistorico.length > 6) numHistorico.shift();
  
  const stringPainel = `📊 *Placar:* ${contagemGreens} ✅ | ${contagemReds} ❌\n⏱️ *Últimos Giros:* ${numHistorico.join(' ➔ ')}`;

  if (numero === 0) {
    alvosPendentes = [];
    areaAlvoSetorPendente = null;
    return ctx.reply(`${mensagemResultado}🟢 *Número 0 (Coringa)*\nO zero resetou as análises táticas.\n\n${stringPainel}`, { parse_mode: 'Markdown' });
  }

  let analiseDestaque = "";
  const totalGiro = numHistorico.length;

  // 2. DISPARADOR DE PADRÕES ULTRA-FILTRADOS

  // PADRÃO PRINCIPAL: TERMINAIS REPETIDOS ISOLADOS (Maior precisão do bot)
  if (totalGiro >= 2 && analiseDestaque === "") {
    const n2 = numHistorico[totalGiro - 2];
    const n1 = numHistorico[totalGiro - 1];
    if (n2 % 10 === n1 % 10) {
      const termo = n1 % 10;
      let numerosAlvo = [];
      for (let i = termo; i <= 36; i += 10) {
        numerosAlvo.push(i);
      }

      analiseDestaque = `🎯 *ALERTA: TERMINAIS ISOLADOS!*\nO dígito final [${termo}] repetiu em sequência (${n2} ➔ ${n1}).\n🎯 *PRÓXIMA RODADA:* Tiro seco nos números do terminal *${termo}*!\n\n💵 *Aposte nos Números exatos:* ${numerosAlvo.join(', ')}\n\n`;
      alvosPendentes = numerosAlvo;
    }
  }

  // PADRÃO SECUNDÁRIO: FINAIS CAVALO / SPLIT (Distância de rua no tabuleiro)
  if (totalGiro >= 2 && analiseDestaque === "") {
    const n2 = numHistorico[totalGiro - 2] % 10;
    const n1 = numHistorico[totalGiro - 1] % 10;
    
    if (Math.abs(n2 - n1) === 3) {
      let menorFinal = Math.min(n2, n1);
      let alvosSplit = [];
      for (let i = menorFinal; i <= 36; i += 10) {
        alvosSplit.push(i);
        if (i + 3 <= 36) alvosSplit.push(i + 3);
      }

      analiseDestaque = `⚡ *ALERTA: FINAIS CAVALO (SPLIT)!*\nDistância de rua identificada entre dígitos (${numHistorico[totalGiro-2]} ➔ ${numHistorico[totalGiro-1]}).\n🎯 *PRÓXIMA RODADA:* Cobrir cavalos de final *${menorFinal}/${menorFinal+3}*.\n\n`;
      alvosPendentes = alvosSplit;
    }
  }

  // PADRÃO COMPLEMENTAR: SURFE DE SETORES CURTO (Máximo 1 rodada de busca)
  if (ultimasAreas.length >= 3 && analiseDestaque === "") {
    const a3 = ultimasAreas[ultimasAreas.length - 3];
    const a2 = ultimasAreas[ultimasAreas.length - 2];
    const a1 = ultimasAreas[ultimasAreas.length - 1];

    if (a3 === a2 && a2 === a1 && a1 !== "OUTRA") {
      let cavalos = [];
      let textoCavalos = "";

      if (a1 === "VIZINHOS DO ZERO") {
        cavalos = CAVALOS_AREA_1;
        textoCavalos = "• 8/9, 18/19 e 28/29";
      } else if (a1 === "TIERS DO CILINDRO") {
        cavalos = CAVALOS_AREA_2;
        textoCavalos = "• 7/8 e 27/28";
      } else {
        cavalos = CAVALOS_AREA_3;
        textoCavalos = "• Plenas/Cavalos nos Órfãos";
      }
      
      analiseDestaque = `🔥 *ALERTA: FLUXO DE SETOR CURTO!*\nO setor *${a1}* esticou. Tentativa de 1 rodada de surfe ativa!\n🎯 *PRÓXIMA RODADA:* Entrada na força do setor.\n\n💵 *Sugestão:* \n${textoCavalos}\n\n`;
      alvosPendentes = cavalos;
      areaAlvoSetorPendente = a1; // Salva o setor para cancelamento se quebrar
    }
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
