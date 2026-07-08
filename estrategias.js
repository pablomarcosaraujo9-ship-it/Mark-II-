// Arquivo: estrategias.js

let historicoGeralNumeros = [];
let historicoGeralAreas = [];
let galeAtivo = false;
let alvosGale = [];

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
    if (historicoGeralNumeros.length > 50) historicoGeralNumeros.shift();

    if (areaAtual !== "OUTRA") {
        historicoGeralAreas.push(areaAtual);
        if (historicoGeralAreas.length > 50) historicoGeralAreas.shift();
    }

    if (historicoGeralNumeros.length < 10) return analise;

    let sinalDisparado = false;

    // GATILHO A: SURFE DE SETOR COM TRAVA DE TETO (Sua observação perfeita!)
    if (historicoGeralAreas.length >= 4) {
        const a4 = historicoGeralAreas[historicoGeralAreas.length - 4];
        const a3 = historicoGeralAreas[historicoGeralAreas.length - 3];
        const a2 = historicoGeralAreas[historicoGeralAreas.length - 2];
        const a1 = historicoGeralAreas[historicoGeralAreas.length - 1];

        // Só dispara se tiver exatamente 3 repetições (a3, a2, a1). 
        // Se já tiver 4 ou mais (a4 igual a eles), o bot bloqueia por risco de virada!
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

                analise.alerta = `🔥 *SURFE DE SETOR INICIAL!*\nO setor *${a1}* repetiu 3 vezes. Entrada no início do fluxo!\n🎯 *PRÓXIMA RODADA:* Seguir a força da mesa na *${a1}*.\n\n💵 *Sugestão:* \n${textoCavalos}\n`;
                analise.alvos = cavalos;
                analise.tipo = "SETOR";
                
                galeAtivo = true;
                alvosGale = cavalos;
                sinalDisparado = true;
            }
        }
    }

    // GATILHO B: FREQUÊNCIA DE TERMINAL DOMINANTE
    if (!sinalDisparado) {
        let amostragemRecente = historicoGeralNumeros.slice(-15);
        let contagemTerminais = Array(10).fill(0);
        amostragemRecente.forEach(num => { contagemTerminais[num % 10]++; });

        if (contagemTerminais[terminalAtual] >= 4) {
            let numerosAlvo = [];
            for (let i = terminalAtual; i <= 36; i += 10) numerosAlvo.push(i);

            analise.alerta = `🔥 *TERMINAL DOMINANTE DETECTADO!*\nO dígito final [${terminalAtual}] está muito forte nesta mesa!\n🎯 *PRÓXIMA RODADA:* Entrada a favor do terminal dominante *${terminalAtual}*.\n\n💵 *Números:* ${numerosAlvo.join(', ')}\n`;
            analise.alvos = numerosAlvo;
            analise.tipo = "TERMINAL";

            galeAtivo = true;
            alvosGale = numerosAlvo;
            sinalDisparado = true;
        }
    }

    // GATILHO C: EXAUSTÃO RESTRITA DE TERMINAL
    if (!sinalDisparado) {
        let ausencaDetectada = 0;
        for (let i = historicoGeralNumeros.length - 2; i >= 0; i--) {
            if (historicoGeralNumeros[i] % 10 !== terminalAtual) ausencaDetectada++;
            else break;
        }

        if (ausencaDetectada >= 7) {
            let numerosAlvo = [];
            for (let i = terminalAtual; i <= 36; i += 10) numerosAlvo.push(i);

            analise.alerta = `🎯 *EXAUSTÃO DE TERMINAL (Dígito ${terminalAtual})*\nO terminal voltou após um sumiço longo de ${ausencaDetectada} rodadas!\n🎯 *PRÓXIMA RODADA:* Entrada no retorno do terminal *${terminalAtual}*.\n\n💵 *Números:* ${numerosAlvo.join(', ')}\n`;
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
