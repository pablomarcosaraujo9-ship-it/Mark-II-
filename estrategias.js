// Arquivo: estrategias.js

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

    historicoGeralNumeros.push(numero);
    if (historicoGeralNumeros.length > 50) historicoGeralNumeros.shift();

    // Filtro de segurança: O bot precisa de pelo menos 10 números mapeados para entender o ritmo da mesa
    if (historicoGeralNumeros.length < 10) return analise;

    // 2. CÁLCULO DE EXAUSTÃO ULTRA-RESTRITA (MÍNIMO 7 RODADAS DE SUMIÇO)
    let ausencaDetectada = 0;
    for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
        if (historicoGeralNumeros[i] % 10 !== terminalAtual) {
            ausencaDetectada++;
        } else {
            break;
        }
    }

    // GATILHO FILTRADO: Só aciona se o sumiço foi extremo (7 rodadas ou mais)
    // Isso evita pegar falsas voltas no meio do caminho
    if (ausencaDetectada >= 7) {
        let numerosAlvo = [];
        for (let i = terminalAtual; i <= 36; i += 10) {
            numerosAlvo.push(i);
        }

        analise.alerta = `🎯 *EXAUSTÃO ULTRA PRECISÃO (Terminal ${terminalAtual})*\nO dígito final quebrou um jejum extremo de ${ausencaDetectada} rodadas sem aparecer!\n🎯 *PRÓXIMA RODADA:* Entrada de alta segurança no terminal *${terminalAtual}*.\n\n💵 *Cavalos/Plenas:* ${numerosAlvo.join(', ')}\n`;
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
