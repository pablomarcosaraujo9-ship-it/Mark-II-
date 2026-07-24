const mercado = require('./mercado');

module.exports = async (req, res) => {
  try {
    // Pega os dados do mercado usando a função certa
    const dados = await mercado.buscarDadosMercado();
    
    // Filtra só ações com sinal de COMPRA
    const compras = dados.filter(acao => acao.sinal === 'COMPRA');
    
    // Ordena por potencial de alta e pega as TOP 5
    const top5 = compras
      .sort((a, b) => b.potencial - a.potencial)
      .slice(0, 5);
    
    // Monta o texto de resposta
    let texto = `📊 TOP 5 AÇÕES PARA HOJE\n\n`;
    
    if (top5.length === 0) {
      texto += `Nenhuma oportunidade de COMPRA encontrada agora.`;
    } else {
      top5.forEach((acao, index) => {
        texto += `${index + 1}. ${acao.ticker}\n`;
        texto += `   Preço: R$ ${acao.preco.toFixed(2)}\n`;
        texto += `   Potencial: ${acao.potencial}%\n`;
        texto += `   Alvo: R$ ${acao.alvo.toFixed(2)}\n\n`;
      });
    }
    
    // Retorna o JSON
    res.status(200).json({ texto });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      texto: `Erro na análise: ${error.message}` 
    });
  }
};
