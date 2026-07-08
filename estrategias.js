// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let historicoGeralAreas = [];

// Definição estrita das Duplas de Terminais Gêmeos para máxima cobertura com poucas fichas
const DUPLAS_GEMEOS = {
    0:, // Terminais 0 e 8
    8:,
    1:, // Terminais 1 e 9
    9:,
    2:, // Terminais 2 e 6
    6:,
    3:, // Terminais 3 e 7
    7:,
    4:, // Terminais 4 e 5
    5: [4, 14, 24, 34, 5, 15, 25, 35]
};

function processarEstrategias(numero, areaAtual) {
    let analise = { alerta: "", alvos: [], tipo: "" };
    const terminalAtual = numero % 10;

    historicoGeralNumeros.push(numero);
    if (historicoGeralNumeros.length > 30) historicoGeralNumeros.shift(); // Reduzido de 50 para 30 (Alivia RAM no celular/Render)

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
                sinalDisparado = true;
            }
        }
    }

    // GATILHO B: CONFLUÊNCIA DE TERMINAIS GÊMEOS (MÁXIMA PRECISÃO / POUCAS FICHAS)
    if (!sinalDisparado) {
        let ausencaDetectada = 0;
        for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
            if (historicoGeralNumeros[i] % 10 !== terminalAtual) {
                ausencaDetectada++;
            } else {
                break;
            }
        }

        // Alerta dispara após 6 rodadas de jejum do terminal
        if (ausencaDetectada >= 6) {
            const alvosFinais = DUPLAS_GEMEOS[terminalAtual] || [];
            
            // Encontra qual é o terminal parceiro na dupla para exibir na mensagem
            const todosTerminais = alvosFinais.map(n => n % 10);
            const terminalParceiro = todosTerminais.find(t => t !== terminalAtual);

            analise.alerta = `🎯 *CONFLUÊNCIA DE TERMINAIS GÊMEOS!*\nO terminal [${terminalAtual}] quebrou jejum de ${ausencaDetectada} rodadas!\n🎯 *PRÓXIMA RODADA:* Entrada Sniper com poucas fichas no pano.\n\n💵 *Jogada Seca (Terminais ${terminalAtual} e ${terminalParceiro}):*\n👉 Números: ${alvosFinais.join(', ')}\n\n⚠️ *Aposta seca de ${alvosFinais.length} fichas. Sem Gale!*`;
            analise.alvos = alvosFinais;
            analise.tipo = "TERMINAL";
        }
    }

    return analise;
}

function resetarAusencias() {
    historicoGeralNumeros = [];
    historicoGeralAreas = [];
}

module.exports = { processarEstrategias, resetarAusencias };
