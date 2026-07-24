const express = require('express');
const app = express();
const analise = require('./analise');
const grafico = require('./grafico');

app.get('/api/investir', async (req, res) => {
  try {
    const resultado = await analise.rodarAnalise();
    res.json({ texto: resultado });
  } catch (e) {
    res.json({ texto: 'Erro no /investir: ' + e.message });
  }
});

app.get('/api/grafico', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'PETR4.SA';
    const historico = await grafico.buscarHistorico(ticker);
    if (!historico.sucesso) {
      return res.json({ texto: 'Erro: ' + historico.erro });
    }
    const urlGrafico = grafico.gerarUrlGrafico(ticker, historico.datas, historico.precos);
    res.json({ 
      url: urlGrafico,
      texto: `Gráfico de ${ticker}`
    });
  } catch (e) {
    res.json({ texto: 'Erro no /grafico: ' + e.message });
  }
});

// LINHA IMPORTANTE PRA VERCEL
module.exports = app;
