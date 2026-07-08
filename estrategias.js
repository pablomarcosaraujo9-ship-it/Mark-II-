// Arquivo: estrategias.js

// Guarda o histórico completo de giros para calcular médias reais
let historicoGeralNumeros = [];
let galeAtivo = false;
let alvosGale = [];

function processarEstrategias(numero, areaAtual) {
    let analise = { alerta: "", alvos: [], tipo: "" };
    const terminalAtual = numero % 10;

    // 1. CHECAGEM DE MARTINGALE (GALE 1)
    if (galeAtivo) {
        galeAtivo = false;
        if (alvosGale.includes(numero)) {
            analise.resultadoGale = "GREEN_GALE";
        } else {
            analise.resultadoGale = "RED_GALE";
        }
        alvosGale = [];
        return analise;
    }

    // Adiciona o número atual ao histórico geral da estratégia
    historicoGeralNumeros.push(numero);
    if (historicoGeralNumeros.length > 50) historicoGeralNumeros.shift();

    if (historicoGeralNumeros.length < 6) return analise;

    // 2. CÁLCULO DINÂMICO DE AUSÊNCIA
    // Descobre quantas rodadas o terminal atual ficou sem aparecer antes deste giro
    let ausencaDetectada = 0;
    for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
        if (historicoGeralNumeros[i] % 10 !== terminalAtual) {
            ausencaDetectada++;
        } else {
            break;
        }
    }

    // O bot entende a imprevisibilidade: se o terminal ficou pelo menos 3 rodadas sumido e voltou
    if (ausencaDetectada >= 3) {
        let numerosAlvo = [];
        for (let i = terminalAtual; i <= 36; i += 10) {
            numerosAlvo.push(i);
        }

        analise.alerta = `🎯 *EXAUSTÃO INTELIGENTE (Terminal ${terminalAtual})*\nO dígito final apareceu após um sumiço real de ${ausencaDetectada} rodadas!\n🎯 *PRÓXIMA RODADA:* Resposta ao cansaço no terminal *${terminalAtual}*.\n\n💵 *Cavalos/Plenas:* ${numerosAlvo.join(', ')}\n`;
        analise.alvos = numerosAlvo;
        analise.tipo = "TERMINAL";

        galeAtivo = true;
        alvosGale = numerosAlvo;
    }

    return analise;
}

function resetarAusencias() {
    historicoGeralNumeros = [];
    galeAtivo = false;
    alvosGale = [];
}

module.exports = { processarEstrategias, resetarAusencias };
