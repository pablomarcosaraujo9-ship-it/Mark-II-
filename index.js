const { Telegraf } = require('telegraf');
const express = require('express');

// Inicializa o bot usando a variável de ambiente do Render
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Configura o Express para o Render não dar timeout (Erro H20)
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rota padrão para checar se o bot está vivo
app.get('/', (req, res) => {
  res.send('Projeto Mark II online e operando!');
});

// Configura a rota do Webhook do Telegram
const WEBHOOK_PATH = `/webhook/${bot.token}`;
app.post(WEBHOOK_PATH, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Comandos básicos do Bot
bot.start((ctx) => {
  ctx.reply('🤖 *Projeto Mark II Ativado!*\n\nEstou pronto para analisar as estratégias da roleta com você.', { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  ctx.reply('💡 Envie seus comandos ou dados da roleta para análise.');
});

// Exemplo de resposta para interações
bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();
  
  // Aqui futuramente entrará a lógica automatizada das suas duas áreas
  ctx.reply(`Recebi sua mensagem: "${texto}". O motor de análise está sendo preparado!`);
});

// Inicialização do Servidor e Webhook
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  
  // Configura o Webhook automaticamente se a URL do Render existir
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
