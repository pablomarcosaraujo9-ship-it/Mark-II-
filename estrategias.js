// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let historicoGeralAreas = [];
let galeAtivo = false;
let alvosGale = [];

// Definição estrita das Duplas de Terminais Gêmeos (Aposta seca no pano)
const DUPLAS_GEMEOS = {
    0:,
    8:,
    1:,
    9:,
    2:,
    6:,
    3:,
    7:,
    4:,
    5: [4, 14, 24, 34, 5, 15, 25, 35]
};

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
    if (historicoGeralNumeros.length > 30) historicoGeralNumeros.shift();

    if (areaAtual !== "OUTRA") {
        historicoGeralAreas.push(areaAtual);
        if (historicoGeralAreas.length > 30) historicoGeralAreas.shift();
    }

    if (historicoGeralNumeros.length < 5) return analise;

    let sinalDisparado = false;

    // GATILHO A: SURFE DE SETOR COM TRAVA DE TETO
    if (historicoGeralAreas.length >= 4) {
        const a4 = historicoGeralAreas[historicoGeralAreas.length - 4];
        const a3 = historicoGeralAreas[historicoGeralAreas.length - 3];
        const a2 = historicoGeralAreas[historicoGeralAreas.length - 2];
        const a1 = historicoGeralAreas[historicoGeralAreas.length - 1];

        if (a3 === a2 && a2 === a1 && a1 !== "OUTRA" && a1 === areaAtual) {
            if (a4 !== a3) { 
                let cavalos = [];
                let textoCavalos = "";

                if (a1 === "VIZINHOS DO ZERO") {
                    cavalos =;
                    textoCavalos = "• 8/9, 18/19 e 28/29";
                } else if (a1 === "TIERS DO CILINDRO") {
                    cavalos =;
                    textoCavalos = "• 7/8 e 27/28";
                } else {
                    cavalos =;
                    textoCavalos = "• Cavalos nos Órfãos";
                }

                analise.alerta = `🔥 *SURFE DE SETOR INICIAL!*\nO setor *${a1}* repetiu 3 vezes.\n🎯 *PRÓXIMA RODADA:* Seguir o fluxo na *${a1}*.\n\n💵 *Sugestão:* \n${textoCavalos}\n`;
                analise.alvos = cavalos;
                analise.tipo = "SETOR";
                
                galeAtivo = true;
                alvosGale = cavalos;
                sinalDisparado = true;
            }
        }
    }

    // GATILHO B: CONFLUÊNCIA DE TERMINAIS GÊMEOS (MÁXIMA PRECISÃO COM GALE 1)
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
            const alvosFinais = DUPLAS_GEMEOS[terminalAtual] || [];
            const todosTerminais = alvosFinais.map(n => n % 10);
            const terminalParceiro = todosTerminais.find(t => t !== terminalAtual);

            analise.alerta = `🎯 *CONFLUÊNCIA DE TERMINAIS GÊMEOS!*\nO terminal [${terminalAtual}] quebrou jejum de ${ausencaDetectada} rodadas!\n🎯 *PRÓXIMA RODADA:* Entrada Sniper com poucas fichas no pano.\n\n💵 *Jogada (Terminais ${terminalAtual} e ${terminalParceiro}):*\n👉 Números: ${alvosFinais.join(', ')}\n\n⚠️ *Aposta tática de ${alvosFinais.length} fichas. Proteção de Gale 1 ativa!*`;
            analise.alvos = alvosFinais;
            analise.tipo = "TERMINAL";

            galeAtivo = true;
            alvosGale = alvosFinais;
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
