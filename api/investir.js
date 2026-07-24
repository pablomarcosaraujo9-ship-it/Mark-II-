const mercado = require('../mercado');

module.exports = async (req, res) => {
  try {
    const dados = await mercado.buscarDadosMercado();
    
    const compras = dados.filter(acao => acao.sinal === 'COMPRA');
    
    const top5 = compras
      .sort((a, b) => b.potencial - a.potencial)
      .slice(0, 5);
    
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
    
    res.status(200).json({ texto });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      texto: `Erro na análise: ${error.message}` 
    });
  }
};
