const express = require('express');
const path = require('path');
const app = express();

const analise = require('./analise.js');
const grafico = require('./grafico.js');
const mercado = require('./mercado.js');

app.use(express.static('public'));
app.use(express.json());

// LISTA DE ATIVOS PRA VARREDURA - EDITA AQUI
const TICKERS_VARREDURA = [
  'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'AAPL', 'MSFT'
];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MUDEI PRA /api/investir PRA BATER COM O FRONTEND
app.get('/api/investir', async (req, res) => {
  try {
    // AGORA PASSA A LISTA DE TICKERS
    const cotacoes = await mercado.buscarMultiplasCotacoes(TICKERS_VARREDURA);
    
    const resultado = analise.gerarRelatorioVarredura(cotacoes, null);
    
    res.json({ texto: resultado });
  } catch (e) {
    res.json({ texto: 'Erro no /investir: ' + e.message });
  }
});

// MUDEI PRA /api/grafico PRA BATER COM O FRONTEND
app.get('/api/grafico', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'PETR4.SA';
    
    const historico = await grafico.buscarHistorico(ticker);
    
    if (!historico.sucesso) {
      return res.json({ texto: 'Erro: ' + historico.erro });
    }
    
    const urlGrafico = grafico.gerarUrlGrafico(ticker, historico.datas, historico.precos);
    const urlYahoo = grafico.gerarUrlYahooFinance(ticker);
    
    res.json({ 
      urlGrafico: urlGrafico,
      urlYahoo: urlYahoo 
    });
  } catch (e) {
    res.json({ texto: 'Erro no /grafico: ' + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando`));

module.exports = app;
