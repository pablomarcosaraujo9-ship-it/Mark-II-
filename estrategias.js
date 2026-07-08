// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let historicoGeralAreas = [];
let galeAtivo = false;
let alvosGale = [];

// MAPA DA ROLETA EUROPEIA: Lista física de vizinhos (2 de cada lado) para cada número do cilindro
const MAPA_VIZINHOS_CILINDRO = {
    0:  Array.of(26, 3, 32, 15),
    1:  Array.of(20, 14, 33, 16),
    2:  Array.of(21, 25, 4, 17),
    3:  Array.of(26, 0, 35, 12),
    4:  Array.of(19, 21, 2, 25),
    5:  Array.of(24, 16, 10, 23),
    6:  Array.of(27, 13, 34, 17),
    7:  Array.of(28, 12, 29, 18),
    8:  Array.of(23, 30, 11, 36),
    9:  Array.of(14, 31, 22, 18),
    10: Array.of(5, 23, 8, 30),
    11: Array.of(30, 8, 36, 13),
    12: Array.of(35, 3, 28, 7),
    13: Array.of(36, 11, 6, 27),
    14: Array.of(1, 20, 31, 9),
    15: Array.of(32, 0, 19, 4),
    16: Array.of(33, 1, 5, 24),
    17: Array.of(2, 25, 34, 6),
    18: Array.of(29, 7, 9, 31),
    19: Array.of(15, 32, 4, 21),
    20: Array.of(31, 9, 1, 14),
    21: Array.of(4, 19, 2, 25),
    22: Array.of(9, 18, 17, 34),
    23: Array.of(10, 5, 8, 30),
    24: Array.of(16, 5, 16, 33), // Espelhamento padrão de pista
    25: Array.of(2, 21, 17, 34),
    26: Array.of(3, 26, 0, 32),
    27: Array.of(6, 13, 13, 36),
    28: Array.of(12, 35, 7, 29),
    29: Array.of(7, 28, 18, 9),
    30: Array.of(8, 23, 11, 36),
    31: Array.of(14, 9, 20, 14),
    32: Array.of(0, 15, 26, 3),
    33: Array.of(1, 16, 24, 5),
    34: Array.of(17, 6, 25, 2),
    35: Array.of(3, 12, 26, 0),
    36: Array.of(11, 30, 13, 11)
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
    if (historicoGeralNumeros.length > 50) historicoGeralNumeros.shift();

    if (areaAtual !== "OUTRA") {
        historicoGeralAreas.push(areaAtual);
        if (historicoGeralAreas.length > 50) historicoGeralAreas.shift();
    }

    if (historicoGeralNumeros.length < 6) return analise;

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
                    cavalos = Array.of(8, 9, 18, 19, 28, 29);
                    textoCavalos = "• 8/9, 18/19 e 28/29";
                } else if (a1 === "TIERS DO CILINDRO") {
                    cavalos = Array.of(7, 8, 27, 28);
                    textoCavalos = "• 7/8 e 27/28";
                } else {
                    cavalos = Array.of(1, 6, 9, 14, 17, 20, 31, 34);
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

    // GATILHO B: EXAUSTÃO DINÂMICA COM INTELIGÊNCIA DE VIZINHOS DE CILINDRO
    if (!sinalDisparado) {
        let ausencaDetectada = 0;
        for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
            if (historicoGeralNumeros[i] % 10 !== terminalAtual) ausencaDetectada++;
            else break;
        }

        // Gatilho calibrado: 6 ou mais rodadas de ausência
        if (ausencaDetectada >= 6) {
            let numerosTerminais = [];
            let numerosVizinhosCilindro = [];

            // 1. Coleta os números com o mesmo terminal no pano
            for (let i = terminalAtual; i <= 36; i += 10) {
                numerosTerminais.push(i);
                
                // 2. Busca automaticamente os 2 vizinhos de cada lado desse número no cilindro
                if (MAPA_VIZINHOS_CILINDRO[i]) {
                    MAPA_VIZINHOS_CILINDRO[i].forEach(v => {
                        if (!numerosVizinhosCilindro.includes(v)) {
                            numerosVizinhosCilindro.push(v);
                        }
                    });
                }
            }

            // Junta os alvos do pano + proteções físicas do cilindro em uma lista única de Green
            let todosAlvosCalculados = numerosTerminais.concat(numerosVizinhosCilindro);
            // Remove duplicados por segurança
            let alvosFinaisUnicos = Array.from(new Set(todosAlvosCalculados));

            analise.alerta = `🎯 *EXAUSTÃO COM VIZINHOS DE CILINDRO!*\nO terminal [${terminalAtual}] retornou após ${ausencaDetectada} rodadas de jejum!\n🎯 *PRÓXIMA RODADA:* Entrada tática no terminal *${terminalAtual}* + Cobertura física de 2 vizinhos na roda.\n\n` +
                              `💵 *Alvos Principais (Pano):* ${numerosTerminais.join(', ')}\n` +
                              `🛡️ *Casas de Proteção (Cilindro):* ${numerosVizinhosCilindro.join(', ')}\n`;
            
            analise.alvos = alvosFinaisUnicos;
            analise.tipo = "TERMINAL";

            galeAtivo = true;
            alvosGale = alvosFinaisUnicos;
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
