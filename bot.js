/**
 * MÓDULO DE HISTÓRICO E ESTATÍSTICA INFORMATIVA — Mark II
 * =========================================================
 * Rastreia os giros da roleta nos últimos 10 minutos e exibe a
 * frequência REAL dos números como dado estatístico puro.
 *
 * AVISO DE CONFORMIDADE: Este módulo NÃO prevê resultados futuros,
 * NÃO calcula taxa de acerto e NÃO promete vantagem contra a casa.
 * Cada giro de roleta é um evento independente — resultados
 * passados não alteram a probabilidade do próximo giro.
 */

let historicoGirosCurtoPrazo = [];

function adicionarNovoGiro(numero) {
  const agora = new Date();
  historicoGirosCurtoPrazo.push({ horario: agora, numero });

  const limiteMemoria = new Date(agora.getTime() - 15 * 60 * 1000);
  historicoGirosCurtoPrazo = historicoGirosCurtoPrazo.filter(
    (giro) => giro.horario >= limiteMemoria
  );
}

function obterFrequenciaUltimos10Min() {
  const agora = new Date();
  const limite10Min = new Date(agora.getTime() - 10 * 60 * 1000);

  const numerosNoBloco = historicoGirosCurtoPrazo
    .filter((giro) => giro.horario >= limite10Min)
    .map((giro) => giro.numero);

  if (numerosNoBloco.length === 0) {
    return { ranking: null, total: 0 };
  }

  const contador = {};
  for (const numero of numerosNoBloco) {
    contador[numero] = (contador[numero] || 0) + 1;
  }

  const ranking = Object.entries(contador)
    .map(([numero, frequencia]) => ({ numero: Number(numero), frequencia }))
    .sort((a, b) => b.frequencia - a.frequencia)
    .slice(0, 10);

  return { ranking, total: numerosNoBloco.length };
}

function gerarPainelEstatistico() {
  const { ranking, total } = obterFrequenciaUltimos10Min();

  if (!ranking) {
    return (
      "📊 *Painel Estatístico*\n\n" +
      "Sem giros registrados nos últimos 10 minutos. Aguarde a coleta de dados."
    );
  }

  const linhasTabela = ranking
    .map(({ numero, frequencia }) => {
      const percentual = ((frequencia / total) * 100).toFixed(1);
      const numeroFormatado = String(numero).padStart(2, "0");
      return `\`Nº ${numeroFormatado}\` ── ${frequencia}x (${percentual}%)`;
    })
    .join("\n");

  return (
    `📊 *PAINEL INFORMATIVO DE FREQUÊNCIA*\n` +
    `───────────────────────\n` +
    `Amostragem dos últimos 10 minutos.\n` +
    `Total de giros coletados: *${total}*\n\n` +
    `*Números mais recorrentes no período:*\n` +
    `${linhasTabela}\n\n` +
    `⚠️ *Nota:* Dados históricos são puramente informativos. ` +
    `Cada giro é independente e segue a aleatoriedade do sistema.`
  );
}

module.exports = {
  adicionarNovoGiro,
  obterFrequenciaUltimos10Min,
  gerarPainelEstatistico,
};
