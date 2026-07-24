const express = require('express');
const path = require('path');
const app = express();

const analise = require('./analise.js');
const grafico = require('./grafico.js');
const mercado = require('./mercado.js');

app.use(express.static('public'));
app.use(express.json());

// EDITA A LISTA DE TICKERS AQUI
const TICKERS_VARREDURA = [
  'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'BBAS3.SA', 'AAPL', 'MSFT'
];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ROTA DO BOTÃO "Rodar /investir" - AGORA COM /api
app.get('/api/investir', async (req, res) => {
  try {
    // PASSA A LISTA DE TICKERS - ISSO QUE TRAVAVA O "Carregando..."
    const cotacoes = await mercado.buscarMultiplasCotacoes(TICKERS_VARREDURA);
    const resultado = analise.gerarRelatorioVarredura(cotacoes, null);
    res.json({ texto: resultado });
  } catch (e) {
    res.json({ texto: 'Erro no /investir: ' + e.message });
  }
});

// ROTA DO BOTÃO "Ver Gráfico" - AGORA COM /api
app.get('/api/grafico', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'PETR4.SA';
    const historico = await grafico.buscarHistorico(ticker);
    
    if (!historico.sucesso) {
      return res.json({ texto: 'Erro: ' + historico.erro });
    }
    
    // AJUSTEI PRA BATER COM SEU HTML QUE ESPERA data.imagem
    const urlGrafico = grafico.gerarUrlGrafico(ticker, historico.datas, historico.precos);
    
    res.json({ 
      imagem: urlGrafico, // seu HTML espera 'imagem' em base64
      texto: `Gráfico de ${ticker}`
    });
  } catch (e) {
    res.json({ texto: 'Erro no /grafico: ' + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando`));

module.exports = app;
