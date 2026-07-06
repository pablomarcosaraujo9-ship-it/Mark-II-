const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const textoVoisins = "22,18,29,7,28,12,35,3,26,32,15,19,4,21,2,25,17,34";
const textoTiers = "6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9";

const AREA_1_VOISINS = textoVoisins.split(',').map(n => parseInt(n, 10));
const AREA_2_TIERS = textoTiers.split(',').map(n => parseInt(n, 10));

// Variáveis de controle de tendência e PLACAR
let ultimasAreas = []; 
let numHistorico = []; 
let areaAlvoPendente = null; 
let contagemGreens = 0;
let contagemReds = 0;

app.get('/', (req, res) => {
  res.send('Projeto Mark II online e operando!');
});

const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Função para resetar tudo
function resetarSessao() {
  ultimasAreas = [];
  numHistorico = [];
  areaAlvoPendente = null;
  contagemGreens = 0;
  contagemReds = 0;
}

bot.start((ctx) => {
  resetarSessao();
  ctx.reply('🤖 *Projeto Mark II Ativado!*\n\nModo Avançado Online:\n📊 Placar zerado e pronto!\n🎰 Cavalos configurados para banca baixa.\n\nMande os números da roleta!', { parse_mode: 'Markdown' });
});

// Comando extra para zerar sem precisar reiniciar o bot
bot.command('zerar', (ctx) => {
  resetarSessao();
  ctx.reply('🔄 *Sessão reiniciada!* O histórico e o placar foram zerados para uma nova mesa.', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();
  const numero = parseInt(texto, 10);

  if (isNaN(numero) || numero < 0 || numero > 36 || texto !== numero.toString()) {
    return ctx.reply('⚠️ Por favor, digite apenas um número válido entre 0 e 36.');
  }

  let areaAtual = "";
  if (AREA_1_VOISINS.includes(numero)) areaAtual = "ÁREA 1";
  if (AREA_2_TIERS.includes(numero)) areaAtual = "ÁREA 2";

  // 1. VERIFICAÇÃO DE GREEN OU RED + ATUALIZAÇÃO DO PLACAR
  let mensagemResultado = "";
  if (areaAlvoPendente !== null) {
    if (areaAtual === areaAlvoPendente) {
      contagemGreens++;
      mensagemResultado = "🎉 *GREEN DETECTADO! Alvo atingido com sucesso!* 💰\n\n";
    } else if (numero !== 0) {
      contagemReds++;
      mensagemResultado = "⚪ *Red na rodada.* A tendência não confirmou. Proteja sua banca!\n\n";
    }
    areaAlvoPendente = null; 
  }

  if (numero !== 0) {
    ultimasAreas.push(areaAtual);
    if (ultimasAreas.length > 6) ultimasAreas.shift();
  }

  numHistorico.push(numero);
  if (numHistorico.length > 5) numHistorico.shift();
  
  // Linha fixa com o Placar e os Últimos Giros
  const stringPainel = `📊 *Placar:* ${contagemGreens} ✅ | ${contagemReds} ❌\n⏱️ *Últimos Giros:* ${numHistorico.join(' ➔ ')}`;

  if (numero === 0) {
    areaAlvoPendente = null;
    return ctx.reply(`${mensagemResultado}🟢 *Número 0 (Coringa)*\nO zero quebrou o ritmo do cilindro.\n\n${stringPainel}`, { parse_mode: 'Markdown' });
  }

  let analiseDestaque = "";

  // 2. LÓGICA DO ANALISADOR + INDICAÇÃO DE CAVALOS EXATOS
  if (ultimasAreas.length >= 3) {
    const totalGiro = ultimasAreas.length;
    const ant2 = ultimasAreas[totalGiro - 3];
    const ant1 = ultimasAreas[totalGiro - 2];
    const atual = ultimasAreas[totalGiro - 1];

    if (ant2 === ant1 && atual !== ant1) {
      const cavalosSugeridos = ant1 === "ÁREA 1" ? "• 8/9, 18/19 e 28/29" : "• 7/8 e 27/28";
      
      analiseDestaque = `🔥 *ALERTA DE ENTRADA (Respiro de 1 casa)!*\n` +
                        `A ${ant1} repetiu 2 vezes e agora respirou na ${atual}.\n` +
                        `🎯 *PRÓXIMA RODADA:* Retorno para a *${ant1}*!\n\n` +
                        `💵 *Aposte nos Cavalos (Baixo Custo):*\n${cavalosSugeridos}\n\n`;
      areaAlvoPendente = ant1; 
    }
  }

  if (ultimasAreas.length >= 4 && analiseDestaque === "") {
    const totalGiro = ultimasAreas.length;
    const ant3 = ultimasAreas[totalGiro - 4];
    const ant2 = ultimasAreas[totalGiro - 3];
    const ant1 = ultimasAreas[totalGiro - 2];
    const atual = ultimasAreas[totalGiro - 1];

    if (ant3 === ant2 && ant1 !== ant2 && atual !== ant2) {
      const cavalosSugeridos = ant2 === "ÁREA 1" ? "• 8/9, 18/19 e 28/29" : "• 7/8 e 27/28";
      
      analiseDestaque = `⚡ *ALERTA MÁXIMO (Respiro de 2 casas)!*\n` +
                        `A ${ant2} repetiu 2 vezes e ficou presa fora por 2 rodadas.\n` +
                        `🎯 *PRÓXIMA RODADA:* Hora do tiro na *${ant2}*!\n\n` +
                        `💵 *Aposte nos Cavalos (Baixo Custo):*\n${cavalosSugeridos}\n\n`;
      areaAlvoPendente = ant2; 
    }
  }

  let corEmoji = areaAtual === "ÁREA 1" ? "🔴" : "🔵";
  
  ctx.reply(
    `${mensagemResultado}${analiseDestaque}${corEmoji} *REGISTRO: ${areaAtual}*\n` +
    `O número ${numero} foi catalogado na sua tabela de tendências.\n\n${stringPainel}`,
    { parse_mode: 'Markdown' }
  );
});

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.env.RENDER_EXTERNAL_URL) {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${WEBHOOK_PATH}`;
    try {
      await bot.telegram.setWebhook(webhookUrl);
    } catch (err) {
      console.error('Erro de webhook:', err);
    }
  }
});
