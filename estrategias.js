// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let galeAtivo = false;
let alvosGale = [];

// Retorna as fichas do pano para a dupla de terminais correspondente
function obterNumerosDaDupla(terminal) {
    let t1 = terminal;
    let t2 = 0;

    // Define as duplas de parceiros fixos (0-8, 1-9, 2-6, 3-7, 4-5)
    if (terminal === 0 || terminal === 8) { t1 = 0; t2 = 8; }
    else if (terminal === 1 || terminal === 9) { t1 = 1; t2 = 9; }
    else if (terminal === 2 || terminal === 6) { t1 = 2; t2 = 6; }
    else if (terminal === 3 || terminal === 7) { t1 = 3; t2 = 7; }
    else if (terminal === 4 || terminal === 5) { t1 = 4; t2 = 5; }

    let numeros = [];
    // Varre o pano da roleta de 0 a 36 buscando os números dos dois terminais
    for (let i = 0; i <= 36; i++) {
        if (i % 10 === t1 || i % 10 === t2) {
            numeros.push(i);
        }
    }
    return { numeros, parceiro: (terminal === t1 ? t2 : t1) };
}

function processarEstrategias(numero, areaAtual) {
    let analise = { alerta: "", alvos: [], tipo: "" };
    const terminalAtual = numero % 10;

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
    if (historicoGeralNumeros.length > 25) historicoGeralNumeros.shift();

    if (historicoGeralNumeros.length < 5) return analise;

    let ausencaDetectada = 0;
    for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
        if (historicoGeralNumeros[i] % 10 !== terminalAtual) {
            ausencaDetectada++;
        } else {
            break;
        }
    }

    if (ausencaDetectada >= 6) {
        const dadosDupla = obterNumerosDaDupla(terminalAtual);
        const alvosFinais = dadosDupla.numeros;
        const terminalParceiro = dadosDupla.parceiro;

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
