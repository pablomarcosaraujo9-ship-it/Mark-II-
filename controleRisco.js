/**
 * MÓDULO DE CONTROLE DE RISCO — Mark II
 * ========================================
 * Mecanismo de redução de velocidade de ruína, não de geração de lucro.
 *
 * AVISO: Nenhuma trava neste módulo altera o valor esperado (EV) do jogo.
 * A vantagem da casa (~2,70% na roleta europeia) é constante em cada giro,
 * independente de Gale, lockdown, ou qualquer outra camada de gestão.
 * Este módulo apenas limita a velocidade com que perdas se acumulam.
 */

const LOCKDOWN_DURACAO_MS = 15 * 60 * 1000; // 15 minutos

let lockdownAtivo = false;
let lockdownFimTimestamp = null;

/**
 * Ativa o lockdown por LOCKDOWN_DURACAO_MS a partir de agora.
 * Chame isso sempre que o Gale 1 resultar em RED.
 */
function ativarLockdown() {
    lockdownAtivo = true;
    lockdownFimTimestamp = Date.now() + LOCKDOWN_DURACAO_MS;
}

/**
 * Verifica se o lockdown ainda está ativo. Se o tempo já passou,
 * desativa automaticamente e retorna false.
 */
function estaEmLockdown() {
    if (lockdownAtivo && Date.now() >= lockdownFimTimestamp) {
        lockdownAtivo = false;
        lockdownFimTimestamp = null;
    }
    return lockdownAtivo;
}

/**
 * Retorna quantos minutos faltam para o lockdown acabar.
 * Retorna 0 se não estiver em lockdown.
 */
function minutosRestantes() {
    if (!estaEmLockdown()) return 0;
    return Math.ceil((lockdownFimTimestamp - Date.now()) / 60000);
}

/**
 * Permite encerrar o lockdown manualmente (ex: comando /zerar).
 */
function resetarLockdown() {
    lockdownAtivo = false;
    lockdownFimTimestamp = null;
}

module.exports = {
    ativarLockdown,
    estaEmLockdown,
    minutosRestantes,
    resetarLockdown,
};
