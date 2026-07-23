// ============================================================
// PATCH — Fase 1: Correção da Conversão de Moeda (/investir)
// Projeto: NOVA / SCANNER
// ============================================================
//
// COMO USAR ESTE PATCH:
// Como não tenho acesso ao repositório real (rede desabilitada
// neste ambiente), este arquivo mostra a lógica de correção
// pronta para você colar em mercado.js e analise.js.
// Os nomes de função abaixo são sugestões — ajuste para bater
// com os nomes reais das suas variáveis, se forem diferentes.
//
// ------------------------------------------------------------
// 1) EM mercado.js — garantir que a cotação USD/BRL já obtida
//    na varredura seja exportada/retornada junto com os dados
// ------------------------------------------------------------

// Supondo que você já busca a cotação USD/BRL em algum ponto
// da varredura (ex: via Twelve Data ou Brapi), garanta que essa
// função a devolva de forma acessível para o restante do fluxo:

async function obterCotacaoUSDBRL() {
  // Exemplo genérico — ajuste para a API que você já usa
  const resposta = await fetch(
    `https://api.twelvedata.com/exchange_rate?symbol=USD/BRL&apikey=${process.env.TWELVEDATA_API_KEY}`
  );
  const dados = await resposta.json();
  const cotacao = parseFloat(dados.rate);

  if (!cotacao || isNaN(cotacao)) {
    throw new Error("Não foi possível obter a cotação USD/BRL");
  }
  return cotacao;
}

// ------------------------------------------------------------
// 2) EM analise.js — função central de conversão
// ------------------------------------------------------------

/**
 * Converte o preço de um ativo para BRL, se necessário.
 * @param {number} preco - preço do ativo na moeda original
 * @param {string} moedaAtivo - "BRL" ou "USD"
 * @param {number} cotacaoUSDBRL - cotação atual USD/BRL
 * @returns {number} preço convertido para BRL
 */
function converterParaBRL(preco, moedaAtivo, cotacaoUSDBRL) {
  if (moedaAtivo === "BRL") {
    return preco;
  }
  if (moedaAtivo === "USD") {
    return preco * cotacaoUSDBRL;
  }
  throw new Error(`Moeda não suportada: ${moedaAtivo}`);
}

/**
 * Determina a moeda de um ativo a partir do ticker.
 * Ajuste essa heurística conforme o padrão real dos tickers
 * usados em listaPadrao.js (ex: sufixo ".SA" = Brasil).
 */
function identificarMoeda(ticker) {
  return ticker.endsWith(".SA") ? "BRL" : "USD";
}

/**
 * Verifica se um ativo cabe no orçamento informado pelo usuário,
 * já convertendo corretamente a moeda antes de comparar.
 *
 * @param {number} orcamentoBRL - orçamento informado pelo usuário (sempre em BRL, por enquanto)
 * @param {object} ativo - { ticker, precoOriginal, moeda }
 * @param {number} cotacaoUSDBRL
 * @returns {object} { dentroDoOrcamento, precoConvertidoBRL }
 */
function verificarOrcamento(orcamentoBRL, ativo, cotacaoUSDBRL) {
  const moeda = ativo.moeda || identificarMoeda(ativo.ticker);
  const precoConvertidoBRL = converterParaBRL(
    ativo.precoOriginal,
    moeda,
    cotacaoUSDBRL
  );

  return {
    dentroDoOrcamento: precoConvertidoBRL <= orcamentoBRL,
    precoConvertidoBRL: Number(precoConvertidoBRL.toFixed(2)),
  };
}

// ------------------------------------------------------------
// 3) EXEMPLO DE INTEGRAÇÃO no fluxo do /investir
// ------------------------------------------------------------

async function analisarOrcamento(orcamentoBRL, ativos) {
  const cotacaoUSDBRL = await obterCotacaoUSDBRL();

  const resultado = ativos.map((ativo) => {
    const { dentroDoOrcamento, precoConvertidoBRL } = verificarOrcamento(
      orcamentoBRL,
      ativo,
      cotacaoUSDBRL
    );

    return {
      ticker: ativo.ticker,
      precoOriginal: ativo.precoOriginal,
      moeda: ativo.moeda || identificarMoeda(ativo.ticker),
      precoConvertidoBRL,
      dentroDoOrcamento,
    };
  });

  return { cotacaoUSDBRL, resultado };
}

// ------------------------------------------------------------
// 4) MENSAGEM AO USUÁRIO — sugestão de texto explicativo
// ------------------------------------------------------------
//
// Ao exibir o resultado no /investir, é importante deixar claro
// que houve conversão, para transparência (evita "número mágico"):
//
// Exemplo de linha de saída:
//   "Walmart (WMT) — USD 109,00 (≈ R$ 601,45 no câmbio atual) — fora do orçamento"
//
// Isso também prepara terreno para a "Evolução futura" do roadmap
// (usuário escolher moeda do orçamento), já que a cotação e a
// conversão já estarão centralizadas em uma função só.

module.exports = {
  obterCotacaoUSDBRL,
  converterParaBRL,
  identificarMoeda,
  verificarOrcamento,
  analisarOrcamento,
};
