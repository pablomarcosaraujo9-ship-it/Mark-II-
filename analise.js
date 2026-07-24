const mercado = require('./mercado');

async function rodarAnalise() {
    try {
        const dados = await mercado.buscarCotacoes();
        
        if (!dados.sucesso) {
            return `Erro ao buscar cotações: ${dados.erro}`;
        }

        let texto = '📈 TOP 5 ALTAS DO DIA:\n\n';
        
        dados.altas.forEach((acao, i) => {
            texto += `${i + 1}. ${acao.ticker} - ${acao.variacao}%\n`;
            texto += `   R$ ${acao.preco.toFixed(2)}\n\n`;
        });

        texto += '📉 TOP 5 BAIXAS DO DIA:\n\n';
        
        dados.baixas.forEach((acao, i) => {
            texto += `${i + 1}. ${acao.ticker} - ${acao.variacao}%\n`;
            texto += `   R$ ${acao.preco.toFixed(2)}\n\n`;
        });

        return texto;
        
    } catch (erro) {
        return `Erro na análise: ${erro.message}`;
    }
}

module.exports = {
    rodarAnalise: rodarAnalise
};
