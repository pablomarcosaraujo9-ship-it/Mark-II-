app.get('/api/grafico', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'PETR4.SA';
    const historico = await grafico.buscarHistorico(ticker);
    
    if (!historico.sucesso) {
      return res.json({ texto: 'Erro: ' + historico.erro });
    }
    
    // GERA URL DO QUICKCHART - NÃO PRECISA BASE64
    const urlGrafico = grafico.gerarUrlGrafico(ticker, historico.datas, historico.precos);
    
    res.json({ 
      url: urlGrafico,  // MUDEI DE 'imagem' PRA 'url'
      texto: `Gráfico de ${ticker}`
    });
  } catch (e) {
    res.json({ texto: 'Erro no /grafico: ' + e.message });
  }
});
