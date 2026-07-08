// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let historicoGeralAreas = [];
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

    // Alimenta os históricos internos da inteligência
    historicoGeralNumeros.push(numero);
    if (historicoGeralNumeros.length > 50) historicoGeralNumeros.shift();

    if (areaAtual !== "OUTRA") {
        historicoGeralAreas.push(areaAtual);
        if (historicoGeralAreas.length > 50) historicoGeralAreas.shift();
    }

    if (historicoGeralNumeros.length < 6) return analise;

    let sinalDisparado = false;

    // GATILHO A: SURFE DE SETOR (Detecta a força de repetição que você notou)
    if (historicoGeralAreas.length >= 3) {
        const a3 = historicoGeralAreas[historicoGeralAreas.length - 3];
        const a2 = historicoGeralAreas[historicoGeralAreas.length - 2];
        const a1 = historicoGeralAreas[historicoGeralAreas.length - 1];

        if (a3 === a2 && a2 === a1 && a1 !== "OUTRA" && a1 === areaAtual) {
            let cavalos = [];
            let textoCavalos = "";

            if (a1 === "VIZINHOS DO ZERO") {
                cavalos = Array.of(8, 9, 18, 19, 28, 29);
                textoCavalos = "• 8/9, 18/19 e 28/29";
            } else if (a1 === "TIERS DO CILINDRO") {
                cavalos = Array.of(7, 8, 27, 28);
                textoCavalos = "• 7/8 e 27/28";
            } else {
                cavalos = Array.of(1, 6, 9, 14, 17, 20, 31, 34);
                textoCavalos = "• Cavalos/Plenas nos Órfãos";
            }

            analise.alerta = `🔥 *ALERTA: SURFE DE SETOR EM FLUXO!*\nO setor *${a1}* engatou uma sequência forte de repetição!\n🎯 *PRÓXIMA RODADA:* Vamos seguir o fluxo da mesa na *${a1}*.\n\n💵 *Sugestão de Entrada:* \n${textoCavalos}\n`;
            analise.alvos = cavalos;
            analise.tipo = "SETOR";
            
            galeAtivo = true;
            alvosGale = cavalos;
            sinalDisparado = true;
        }
    }

    // GATILHO B: EXAUSTÃO ULTRA PRECISÃO DE TERMINAL (Só dispara se o surfe de setor não estiver dominando)
    if (!sinalDisparado) {
        let ausencaDetectada = 0;
        for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
            if (historicoGeralNumeros[i] % 10 !== terminalAtual) {
                ausencaDetectada++;
            } else {
                break;
            }
        }

        if (ausencaDetectada >= 6) {
            let numerosAlvo = [];
            for (let i = terminalAtual; i <= 36; i += 10) {
                numerosAlvo.push(i);
            }

            analise.alerta = `🎯 *EXAUSTÃO DE TERMINAL (Dígito ${terminalAtual})*\nO dígito final quebrou um jejum longo de ${ausencaDetectada} rodadas!\n🎯 *PRÓXIMA RODADA:* Entrada cirúrgica no terminal *${terminalAtual}*.\n\n💵 *Números:* ${numerosAlvo.join(', ')}\n`;
            analise.alvos = numerosAlvo;
            analise.tipo = "TERMINAL";

            galeAtivo = true;
            alvosGale = numerosAlvo;
        }
    }

    return analise;
}

function resetarAusencias() {
    historicoGeralNumeros = [];
    historicoGeralAreas = [];
    galeAtivo = false;
    alvosGale = [];
}

module.exports = { processarEstrategias, resetarAusencias };
