// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let galeAtivo = false;
let alvosGale = [];

// Arrays numéricos blindados contra remoção do sistema usando JSON.parse
const DUPLAS_GEMEOS = {
    0: JSON.parse("[0,10,20,30,8,18,28]"),
    8: JSON.parse("[0,10,20,30,8,18,28]"),
    1: JSON.parse("[1,11,21,31,9,19,29]"),
    9: JSON.parse("[1,11,21,31,9,19,29]"),
    2: JSON.parse("[2,12,22,32,6,16,26,36]"),
    6: JSON.parse("[2,12,22,32,6,16,26,36]"),
    3: JSON.parse("[3,13,23,33,7,17,27]"),
    7: JSON.parse("[3,13,23,33,7,17,27]"),
    4: JSON.parse("[4,14,24,34,5,15,25,35]"),
    5: JSON.parse("[4,14,24,34,5,15,25,35]")
};

function processarEstrategias(numero, areaAtual) {
    let analise = { alerta: "", alvos: [], tipo: "" };
    const terminalAtual = numero % 10;

    // 1. CHECAGEM DO PLACAR DE GALE (MESA REAL OU FANTASMA)
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

    // Gerenciamento estrito de memória para o celular e Render
    historicoGeralNumeros.push(numero);
    if (historicoGeralNumeros.length > 25) historicoGeralNumeros.shift();

    if (historicoGeralNumeros.length < 5) return analise;

    // 2. GATILHO SNIPER: CONTROLE DE JEJUM POR CONFLUÊNCIA DE TERMINAIS GÊMEOS
    let ausencaDetectada = 0;
    for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
        if (historicoGeralNumeros[i] % 10 !== terminalAtual) {
            ausencaDetectada++;
        } else {
            break;
        }
    }

    // Dispara a entrada estratégica se o terminal que quebrou o jejum ficou 6 ou mais rodadas oculto
    if (ausencaDetectada >= 6) {
        const alvosFinais = DUPLAS_GEMEOS[terminalAtual] || [];
        const todosTerminais = alvosFinais.map(n => n % 10);
        const terminalParceiro = todosTerminais.find(t => t !== terminalAtual);

        analise.alerta = `🎯 *CONFLUÊNCIA DE TERMINAIS GÊMEOS!*\nO terminal [${terminalAtual}] quebrou um jejum de ${ausencaDetectada} rodadas!\n🎯 *PRÓXIMA RODADA:* Entrada Sniper com poucas fichas no pano.\n\n💵 *Jogada (Terminais ${terminalAtual} e ${terminalParceiro}):*\n👉 Números: ${alvosFinais.join(', ')}\n\n⚠️ *Aposta tática de ${alvosFinais.length} fichas. Proteção de Gale 1 ativa!*`;
        analise.alvos = alvosFinais;
        analise.tipo = "TERMINAL";

        galeAtivo = true;
        alvosGale = alvosFinais;
    }

    return analise;
}

function resetarAusencias() {
    historicoGeralNumeros = [];
    galeAtivo = false;
    alvosGale = [];
}

module.exports = { processarEstrategias, resetarAusencias };
