const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mapeamento exato e completo das duas grandes áreas da roleta que fundimos
const AREA_1_VOISINS =;
const AREA_2_TIERS =;

app.get('/', (req, res) => {
  res.send('Projeto Mark II online e operando!');
});

const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

bot.start((ctx) => {
  ctx.reply('🤖 *Projeto Mark II Ativado!*\n\nDigite o número que acabou de sair na roleta (0 a 36) para receber o sinal de cobertura imediato.', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();
  const numero = parseInt(texto, 10);

  if (isNaN(numero) || numero < 0 || numero > 36 || texto !== numero.toString()) {
    return ctx.reply('⚠️ Por favor, digite apenas um número válido entre 0 e 36.');
  }

  if (numero === 0) {
    return ctx.reply(
      `🟢 *Gatilho: Número 0 (Coringa)*\n\n` +
      `O zero reinicia a tendência física. Aguarde o próximo giro sem apostar para confirmar para qual metade a bola vai correr!`,
      { parse_mode: 'Markdown' }
    );
  }

  if (AREA_1_VOISINS.includes(numero)) {
    return ctx.reply(
      `🔴 *SINAL ATIVADO: ÁREA 1 (Lado do Zero)*\n` +
      `O número ${numero} pertence à metade superior/esquerda do cilindro.\n\n` +
      `🎯 *Sua aposta de Baixo Custo (Plano A):*\n` +
      `• Coloque fichas nos cavalos dos terminais 8 e 9 desta região.\n` +
      `• *Cavalos indicados:* 8/9, 18/19 e 28/29.\n\n` +
      `⚠️ *Aviso:* Se a roleta errar 3 vezes seguidas nesta área, pare e espere um novo gatilho.`,
      { parse_mode: 'Markdown' }
    );
  }

  if (AREA_2_TIERS.includes(numero)) {
    return ctx.reply(
      `🔵 *SINAL ATIVADO: ÁREA 2 (Lado do Tiers)*\n` +
      `O número ${numero} pertence à metade inferior/direita do cilindro.\n\n` +
      `🎯 *Sua aposta de Baixo Custo (Plano B):*\n` +
      `• Coloque fichas nos cavalos dos terminais 7 e 8 desta região.\n` +
      `• *Cavalos indicados:* 7/8 e 27/28.\n\n` +
      `⚠️ *Aviso:* Entre leve, o foco em banca baixa é a proteção do capital!`,
      { parse_mode: 'Markdown' }
    );
  }
});

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.env.RENDER_EXTERNAL_URL) {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${WEBHOOK_PATH}`;
    try {
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`Webhook configurado com sucesso para: ${webhookUrl}`);
    } catch (err) {
      console.error('Erro ao configurar webhook:', err);
    }
  }
});
