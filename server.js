const express = require('express');
const path = require('path');
const app = express();

// Importa suas funções - se o nome for diferente me avisa
const analise = require('./analise.js');
const grafico = require('./grafico.js');

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota do /investir
app.get('/api/investir', async (req, res) => {
  try {
    // Troca 'executarAnalise' pelo nome real da função no analise.js
    const resultado = await analise.executarAnalise('pular');
    res.json({ texto: resultado });
  } catch (e) {
    res.json({ texto: 'Erro: ' + e.message });
  }
});

// Rota do /grafico
app.get('/api/grafico', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'PETR4.SA';
    // Troca 'gerarGrafico' pelo nome real da função no grafico.js
    const imgBuffer = await grafico.gerarGrafico(ticker);
    res.json({ imagem: imgBuffer.toString('base64') });
  } catch (e) {
    res.json({ texto: 'Erro: ' + e.message });
  }
});

module.exports = app;
