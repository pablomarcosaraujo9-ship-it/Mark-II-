const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Arrays alternativos para evitar as travas do sistema
const textoVoisins = "22,18,29,7,28,12,35,3,26,32,15,19,4,21,2,25,17,34";
const textoTiers = "6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9";

const AREA_1_VOISINS = textoVoisins.split(',').map(n => parseInt(n, 10));
const AREA_2_TIERS = textoTiers.split(',').map(n => parseInt(n, 10));

// Variáveis de controle de tendência
let ultimasAreas = []; // Guarda as strings "ÁREA 1" ou "ÁREA 2" das últimas jogadas
let numHistorico = []; // Guarda os últimos números para exibição fixa

app.get('/', (req, res) => {
  res.send('Projeto Mark II online e operando!');
});

const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

bot.start((ctx) => {
  ultimasAreas = [];
  numHistorico = [];
  ctx.reply('🤖 *Projeto Mark II Ativado!*\n\nModo Analisador de Tendência ativado. Digite os números ao vivo para eu mapear o padrão das 2 repetições!', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();
  const numero = parseInt(texto, 10);

  if (isNaN(numero) || numero < 0 || numero > 36 || texto !== numero.toString()) {
    return ctx.reply('⚠️ Por favor, digite apenas um número válido entre 0 e 36.');
  }

  // Identifica a área atual (ignora 0 para análise de pêndulo puro)
  let areaAtual = "";
  if (AREA_1_VOISINS.includes(numero)) areaAtual = "ÁREA 1";
  if (AREA_2_TIERS.includes(numero)) areaAtual = "ÁREA 2";

  // Atualiza os históricos da sessão
  if (numero !== 0) {
    ultimasAreas.push(areaAtual);
    if (ultimasAreas.length > 6) ultimasAreas.shift();
  }

  numHistorico.push(numero);
  if (numHistorico.length > 5) numHistorico.shift();
  const stringHistorial = `⏱️ *Últimos Giros:* ${numHistorico.join(' ➔ ')}`;

  // Tratamento do zero
  if (numero === 0) {
    return ctx.reply(`🟢 *Número 0 (Coringa)*\nO zero quebrou o ritmo do cilindro. Aguarde uma rodada para recalibrar o pêndulo.\n\n${stringHistorial}`, { parse_mode: 'Markdown' });
  }

  // Bloco de mensagens adicionais de análise
  let analiseDestaque = "";

  // LÓGICA DO ANALISADOR (Verifica se houve o padrão de 2 iguais + respiro de 1 ou 2 casas)
  if (ultimasAreas.length >= 3) {
    const totalGiro = ultimasAreas.length;
    
    // CASO 1: Padrão de 2 iguais + respiro de EXATAMENTE 1 casa (Ex: 2, 2, 1 -> o próximo tende a voltar para a 2)
    const ant2 = ultimasAreas[totalGiro - 3];
    const ant1 = ultimasAreas[totalGiro - 2];
    const atual = ultimasAreas[totalGiro - 1];

    if (ant2 === ant1 && atual !== ant1) {
      analiseDestaque = `🔥 *ALERTA DE ENTRADA (Respiro de 1 casa)!*\n` +
                        `A ${ant1} repetiu 2 vezes e agora respirou na ${atual}.\n` +
                        `🎯 *PRÓXIMA RODADA:* Forte tendência de retorno para a *${ant1}*!\n\n`;
    }
  }

  if (ultimasAreas.length >= 4 && analiseDestaque === "") {
    const totalGiro = ultimasAreas.length;
    
    // CASO 2: Padrão de 2 iguais + respiro de EXATAMENTE 2 casas (Ex: 2, 2, 1, 1 -> o próximo tende a voltar para a 2)
    const ant3 = ultimasAreas[totalGiro - 4];
    const ant2 = ultimasAreas[totalGiro - 3];
    const ant1 = ultimasAreas[totalGiro - 2];
    const atual = ultimasAreas[totalGiro - 1];

    if (ant3 === ant2 && ant1 !== ant2 && atual !== ant2) {
      analiseDestaque = `⚡ *ALERTA MÁXIMO (Respiro de 2 casas)!*\n` +
                        `A ${ant2} repetiu 2 vezes e ficou presa fora por 2 rodadas.\n` +
                        `🎯 *PRÓXIMA RODADA:* Hora do tiro! Tendência absurda de retorno para a *${ant2}*!\n\n`;
    }
  }

  // Resposta padrão baseada na cor do setor sorteado
  let corEmoji = areaAtual === "ÁREA 1" ? "🔴" : "🔵";
  
  ctx.reply(
    `${analiseDestaque}${corEmoji} *REGISTRO: ${areaAtual}*\n` +
    `O número ${numero} foi catalogado na sua tabela de tendências.\n\n` +
    `💡 *Dica de proteção:* Se houver um alerta ativo acima, prepare seus cavalos específicos na mesa.\n\n${stringHistorial}`,
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
