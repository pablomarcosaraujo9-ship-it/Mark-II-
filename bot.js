// Arquivo: bot.js
const express = require('express');
const { Telegraf } = require('telegraf');
const estrategias = require('./estrategias');

// Configurações básicas (Altere com suas variáveis do ambiente ou strings diretas)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "SEU_TOKEN_TELEGRAM_AQUI";
const CHAT_ID = process.env.CHAT_ID || "SEU_CHAT_ID_AQUI";
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

// Variáveis de controle de estado (Otimizadas para RAM)
let contadorRedsSeguidos = 0;
let modoFantasmaAtivo = false;
let placarGreens = 0;
let placarReds = 0;

// COMANDO /zerar - Vassoura limpa-chat e reinicialização completa
bot.command('zerar', async (ctx) => {
    contadorRedsSeguidos = 0;
    modoFantasmaAtivo = false;
    placarGreens = 0;
    placarReds = 0;
    estrategias.resetarAusencias();
    
    try {
        await ctx.reply("🧹 *PROJETO MARK II REINICIADO!*\nChat limpo, placar zerado e sistemas recalibrados.", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Erro ao enviar resposta do /zerar");
    }
});

// FUNÇÃO DE TEXTO PARA ATUALIZAR O PLACAR FORMATADO
function obterTextoPlacar() {
    return `📊 Placar Atual: ${placarGreens} ✅ | ${placarReds} ❌`;
}

// ENDPOINT PRINCIPAL: Recebe os giros da roleta ao vivo via Webhook
app.post('/webhook-roleta', async (req, res) => {
    // Evita crash conferindo se o corpo da requisição é válido
    if (!req.body || !req.body.numero) {
        return res.status(400).send({ status: "dados_invalidos" });
    }

    const numeroSurgido = parseInt(req.body.numero);
    const areaCilindro = req.body.area || "OUTRA";

    // Envia o número para o motor tático processar
    const resultadoMesa = estrategias.processarEstrategias(numeroSurgido, areaCilindro);

    // 1. CHECAGEM DOS RESULTADOS DE JOGADAS (REAIS OU FANTASMAS)
    if (resultadoMesa.resultadoGale) {
        const statusRodada = resultadoMesa.resultadoGale;

        if (!modoFantasmaAtivo) {
            // FLUXO DE OPERAÇÃO REAL
            if (statusRodada === "GREEN_GALE") {
                placarGreens++;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(CHAT_ID, `✅ *GREEN NO GALE 1!* Saldo protegido com sucesso! 💰\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                placarReds++;
                contadorRedsSeguidos++;
                await bot.telegram.sendMessage(CHAT_ID, `❌ *RED CONFIRMADO NO GALE.*\n\n${obterTextoPlacar()}`, { parse_mode: 'Markdown' });

                // GATILHO DO STOP-LOSS: 2 REDs seguidos ativa o modo de teste
                if (contadorRedsSeguidos >= 2) {
                    modoFantasmaAtivo = true;
                    await bot.telegram.sendMessage(CHAT_ID, `⚠️ *STOP-LOSS ATIVADO (2 REDs)!*\nO bot entrou em modo de *Entrada Fantasma*.\nO sistema testará a mesa internamente sem expor sua banca.`, { parse_mode: 'Markdown' });
                }
            }
        } else {
            // FLUXO DE ENTRADA FANTASMA (MESA EM TESTE)
            if (statusRodada === "GREEN_GALE") {
                // Mesa normalizou no teste!
                modoFantasmaAtivo = false;
                contadorRedsSeguidos = 0;
                await bot.telegram.sendMessage(CHAT_ID, `✅ *TESTE VIRTUAL DEU GREEN!*\nA estabilidade da mesa foi restaurada.\n🔄 *Retornando às operações reais na próxima oportunidade.*`, { parse_mode: 'Markdown' });
            } else if (statusRodada === "RED_GALE") {
                // Mesa continua quebrando os padrões
                await bot.telegram.sendMessage(CHAT_ID, `🚨 *ENTRADA DE TESTE FALHOU (RED FANTASMA)!*\nA roleta continua instável.\n⚠️ *RECOMENDADO TROCAR DE MESA IMEDIATAMENTE!*`, { parse_mode: 'Markdown' });
            }
        }
    }

    // 2. DISPARO DE NOVOS SINAIS CAPTURADOS PELO MOTOR
    if (resultadoMesa.alerta) {
        if (!modoFantasmaAtivo) {
            // Se estiver operando normal, envia o sinal para o grupo apostar
            await bot.telegram.sendMessage(CHAT_ID, resultadoMesa.alerta, { parse_mode: 'Markdown' });
        } else {
            // Se estiver em Stop-Loss, roda em silêncio no console do Render sem mandar no Telegram
            console.log(`[Modo Fantasma] Analisando teste para os alvos: ${resultadoMesa.alvos.join(', ')}`);
        }
    }

    res.status(200).send({ status: "processado", modoFantasma: modoFantasmaAtivo });
});

// Inicialização do servidor web e conexão do Bot (Padrão estável para o Render)
app.listen(PORT, () => {
    console.log(`Servidor do Projeto Mark II ativo na porta ${PORT}`);
    bot.launch()
        .then(() => console.log("Bot Telegraf conectado com sucesso ao Telegram!"))
        .catch((err) => console.error("Erro ao conectar Bot no Telegram:", err));
});

// Garante o fechamento limpo caso o Render reinicie a máquina
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
