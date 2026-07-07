const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Setores do Cilindro
const textoVoisins = "22,18,29,7,28,12,35,3,26,32,15,19,4,21,2,25,17,34";
const textoTiers = "6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9";
const textoOrfaos = "1,20,14,31,9,17,34,6"; // Ajustado para intersecção padrão europeia

const AREA_1_VOISINS = textoVoisins.split(',').map(n => parseInt(n, 10));
const AREA_2_TIERS = textoTiers.split(',').map(n => parseInt(n, 10));
const AREA_3_ORFAOS = textoOrfaos.split(',').map(n => parseInt(n, 10));

// Variáveis de controle de tendência e PLACAR
let ultimasAreas = []; 
let numHistorico = []; 
let alvosPendentes = []; // Lista de números exatos que dão GREEN na rodada
let contagemGreens = 0;
let contagemReds = 0;

app.get('/', (req, res) => {
  res.send('Projeto Mark II online e operando!');
});

const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Função para varrer e limpar o chat em lote (apaga as últimas 40 mensagens)
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
}

bot.start(async (ctx) => {
  resetarDados();
  ctx.reply('🤖 *Projeto Mark II — Versão Multi-Padrões!*\n\nModo Tático Ativo:\n📊 Placar zerado.\n🎰 Monitorando: Setores, Terminais e Finais Cavalo.', { parse_mode: 'Markdown' });
});

bot.command('zerar', async (ctx) => {
  await limparChatCompleto(ctx);
  resetarDados();
  await ctx.reply('🔄 *Mesa Reiniciada!*\nHistórico visual limpo e placar zerado para novos padrões.', { parse_mode: 'Markdown' });
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

  // Identificação do Terminal (Finais)
  const terminalAtual = numero % 10;

  // 1. SISTEMA DE PLACAR INTELIGENTE (CHECA NÚMEROS EXATOS)
  let mensagemResultado = "";
  if (alvosPendentes.length > 0) {
    if (alvosPendentes.includes(numero)) {
      contagemGreens++;
      mensagemResultado = "🎉 *GREEN DETECTADO! Alvo cravado com sucesso!* 💰\n\n";
    } else if (numero !== 0) {
      contagemReds++;
      mensagemResultado = "⚪ *Red na rodada.* O número ficou fora do padrão sugerido.\n\n";
    }
    alvosPendentes = []; 
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
    return ctx.reply(`${mensagemResultado}🟢 *Número 0 (Coringa)*\nO zero resetou as análises de setor.\n\n${stringPainel}`, { parse_mode: 'Markdown' });
  }

  let analiseDestaque = "";

  // 2. DISPARADOR DE PADRÕES (GATILHOS)
  const totalGiro = numHistorico.length;

  // PADRÃO A: SURFE DE SETORES (3 Repetições Iguais)
  if (ultimasAreas.length >= 3 && analiseDestaque === "") {
    const a3 = ultimasAreas[ultimasAreas.length - 3];
    const a2 = ultimasAreas[ultimasAreas.length - 2];
    const a1 = ultimasAreas[ultimasAreas.length - 1];

    if (a3 === a2 && a2 === a1 && a1 !== "OUTRA") {
      let cavalos = a1 === "VIZINHOS DO ZERO" ? [8,9,18,19,28,29] : a1 === "TIERS DO CILINDRO" ? [7,8,27,28] :;
      let textoCavalos = a1 === "VIZINHOS DO ZERO" ? "• 8/9, 18/19 e 28/29" : a1 === "TIERS DO CILINDRO" ? "• 7/8 e 27/28" : "• Plenas/Cavalos nos Órfãos";
      
      analiseDestaque = `🔥 *ALERTA: SURFE DE SETOR!*\nO setor *${a1}* repetiu 3 vezes seguidas!\n🎯 *PRÓXIMA RODADA:* Continuar surfando a força desse setor.\n\n💵 *Sugestão de Entrada:* \n${textoCavalos}\n\n`;
      alvosPendentes = cavalos;
    }
  }

  // PADRÃO B: TERMINAIS IGUAIS (2 Finais Iguais Seguidos)
  if (totalGiro >= 2 && analiseDestaque === "") {
    const n2 = numHistorico[totalGiro - 2];
    const n1 = numHistorico[totalGiro - 1];
    if (n2 % 10 === n1 % 10) {
      const termo = n1 % 10;
      let numerosAlvo = [];
      for (let i = termo; i <= 36; i += 10) numerosAlvo.push(i);

      analiseDestaque = `🎯 *ALERTA: TERMINAIS REPETIDOS!*\nO dígito final [${termo}] apareceu duas vezes seguidas (${n2} ➔ ${n1}).\n🎯 *PRÓXIMA RODADA:* Cercar o terminal final *${termo}*!\n\n💵 *Aposte nos Números:* Final ${termo} (${numerosAlvo.join(', ')})\n\n`;
      alvosPendentes = numerosAlvo;
    }
  }

  // PADRÃO C: FINAIS CAVALO / SPLIT (Ex: Final 2 colado com Final 5)
  if (totalGiro >= 2 && analiseDestaque === "") {
    const n2 = numHistorico[totalGiro - 2] % 10;
    const n1 = numHistorico[totalGiro - 1] % 10;
    
    // Mapeamento de vizinhos verticais clássicos do pano (Distância de 3 no tabuleiro)
    if (Math.abs(n2 - n1) === 3) {
      let menorFinal = Math.min(n2, n1);
      let alvosSplit = [];
      for (let i = menorFinal; i <= 36; i += 10) {
        alvosSplit.push(i);
        if (i + 3 <= 36) alvosSplit.push(i + 3);
      }

      analiseDestaque = `⚡ *ALERTA: FINAIS CAVALO (SPLIT)!*\nQuebra sequencial em distância de rua detectada (${numHistorico[totalGiro-2]} ➔ ${numHistorico[totalGiro-1]}).\n🎯 *PRÓXIMA RODADA:* Entrada nos cavalos de final *${menorFinal}/${menorFinal+3}*.\n\n💵 *Cubra os Pares:* ${menorFinal}/${menorFinal+3} no tabuleiro.\n\n`;
      alvosPendentes = alvosSplit;
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
