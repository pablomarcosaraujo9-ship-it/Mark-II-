const express = require('express');
const path = require('path');
const app = express();

const analise = require('./analise.js');
const grafico = require('./grafico.js');
const mercado = require('./mercado.js'); // Seu arquivo que busca as cotações

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ROTA DO BOTÃO "Rodar /investir" 
app.get('/investir', async (req, res) => {
  try {
    // 1. Busca as cotações primeiro
    const cotacoes = await mercado.buscarMultiplasCotacoes();
    
    // 2. Gera o relatório - essa função é SÍNCRONA, não usa await
    const resultado = analise.gerarRelatorioVarredura(cotacoes, null);
    
    res.json({ texto: resultado });
  } catch (e) {
    res.json({ texto: 'Erro no /investir: ' + e.message });
  }
});

// ROTA DO BOTÃO "Ver Gráfico"
app.get('/grafico', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'PETR4.SA';
    
    // 1. Busca o histórico
    const historico = await grafico.buscarHistorico(ticker);
    
    if (!historico.sucesso) {
      return res.json({ texto: 'Erro: ' + historico.erro });
    }
    
    // 2. Gera a URL do gráfico
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
