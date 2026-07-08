// Arquivo: estrategias.js

// Contadores de ausência (quantas rodadas faz que não aparecem)
let rodadasSemTerminal = Array(10).fill(0);
let rodadasSemSetor = { "VIZINHOS DO ZERO": 0, "TIERS DO CILINDRO": 0, "ÓRFÃOS": 0 };

// Gerenciador de Martingale/Gale
let galeAtivo = false;
let alvosGale = [];
let tipoSinalGale = "";

// Configurações de Gatilho (Exaustão)
const LIMITE_AUSENCIA_TERMINAL = 3; // Alerta após 3 ou 4 rodadas sem aparecer
const LIMITE_AUSENCIA_SETOR = 4;

function processarEstrategias(numero, areaAtual, numHistorico, ultimasAreas) {
    let analise = { alerta: "", alvos: [], tipo: "" };
    const terminalAtual = numero % 10;

    // 1. CHECAGEM E EXECUÇÃO DE MARTINGALE (GALE 1)
    if (galeAtivo) {
        galeAtivo = false; // O Gale só roda 1 vez (Martingale 1)
        if (alvosGale.includes(numero)) {
            analise.resultadoGale = "GREEN_GALE";
        } else {
            analise.resultadoGale = "RED_GALE";
        }
        alvosGale = [];
        tipoSinalGale = "";
        return analise;
    }

    // 2. ATUALIZAR CONTADORES DE AUSÊNCIA
    for (let i = 0; i <= 9; i++) {
        if (i === terminalAtual) {
            rodadasSemTerminal[i] = 0; 
        } else {
            rodadasSemTerminal[i]++; 
        }
    }
    
    Object.keys(rodadasSemSetor).forEach(setor => {
        if (setor === areaAtual) {
            rodadasSemSetor[setor] = 0;
        } else if (setor !== "OUTRA") {
            rodadasSemSetor[setor]++;
        }
    });

    // 3. VERIFICAÇÃO DE GATILHOS (EXAUSTÃO)
    
    // GATILHO A: RECORRÊNCIA DE TERMINAL APÓS AUSÊNCIA
    if (rodadasSemTerminal[terminalAtual] === 0 && numHistorico.length >= 4) {
        let contagemAusenciaPrevia = 0;
        for (let i = numHistorico.length - 2; i >= 0; i--) {
            if (numHistorico[i] % 10 !== terminalAtual) contagemAusenciaPrevia++;
            else break;
        }

        if (contagemAusenciaPrevia >= LIMITE_AUSENCIA_TERMINAL) {
            let numerosAlvo = [];
            for (let i = terminalAtual; i <= 36; i += 10) numerosAlvo.push(i);

            analise.alerta = `🎯 *ALERTA: EXAUSTÃO DE TERMINAL!*\nO dígito final [${terminalAtual}] retornou após ficar sumido por ${contagemAusenciaPrevia} rodadas!\n🎯 *PRÓXIMA RODADA:* Entrada confirmada no terminal *${terminalAtual}* (Com proteção de Gale 1 se necessário).\n\n💵 *Números exatos:* ${numerosAlvo.join(', ')}\n`;
            analise.alvos = numerosAlvo;
            analise.tipo = "TERMINAL";
            
            galeAtivo = true;
            alvosGale = numerosAlvo;
            tipoSinalGale = "TERMINAL";
            return analise;
        }
    }

    // GATILHO B: EXAUSTÃO DE SETOR DO CILINDRO
    if (areaAtual !== "OUTRA" && rodadasSemSetor[areaAtual] === 0 && ultimasAreas.length >= 5) {
        let contagemSetorPrevia = 0;
        for (let i = ultimasAreas.length - 2; i >= 0; i--) {
            if (ultimasAreas[i] !== areaAtual) contagemSetorPrevia++;
            else break;
        }

        if (contagemSetorPrevia >= LIMITE_AUSENCIA_SETOR) {
            let cavalos = [];
            let textoCavalos = "";

            if (areaAtual === "VIZINHOS DO ZERO") {
                cavalos = Array.of(8, 9, 18, 19, 28, 29);
                textoCavalos = "• 8/9, 18/19 e 28/29";
            } else if (areaAtual === "TIERS DO CILINDRO") {
                cavalos = Array.of(7, 8, 27, 28);
                textoCavalos = "• 7/8 e 27/28";
            } else {
                cavalos = Array.of(1, 6, 9, 14, 17, 20, 31, 34);
                textoCavalos = "• Cavalos/Plenas nos Órfãos";
            }

            analise.alerta = `🔥 *ALERTA: EXAUSTÃO DE SETOR!*\nO setor *${areaAtual}* voltou após ficar escondido por ${contagemSetorPrevia} giros!\n🎯 *PRÓXIMA RODADA:* Entrada na força de retorno (Com Gale 1 de proteção).\n\n💵 *Sugestão:* \n${textoCavalos}\n`;
            analise.alvos = cavalos;
            analise.tipo = "SETOR";

            galeAtivo = true;
            alvosGale = cavalos;
            tipoSinalGale = "SETOR";
            return analise;
        }
    }

    return analise;
}

function resetarAusencias() {
    rodadasSemTerminal = Array(10).fill(0);
    rodadasSemSetor = { "VIZINHOS DO ZERO": 0, "TIERS DO CILINDRO": 0, "ÓRFÃOS": 0 };
    galeAtivo = false;
    alvosGale = [];
    tipoSinalGale = "";
}

module.exports = { processarEstrategias, resetarAusencias };
