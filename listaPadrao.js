/**
 * LISTA PADRÃO DE TICKERS — NOVA
 * =================================
 * Ações líquidas e conhecidas do Brasil e EUA, usadas na varredura
 * automática do comando /investir. O usuário pode complementar essa
 * lista com tickers específicos na hora de rodar a análise.
 *
 * Formato de ticker exigido pela Twelve Data:
 * Brasil: "PETR4.SA" | EUA: "AAPL" (sem sufixo)
 */

const LISTA_PADRAO_BRASIL = [
    'PETR4.SA', // Petrobras
    'VALE3.SA', // Vale
    'ITUB4.SA', // Itaú Unibanco
    'BBDC4.SA', // Bradesco
    'ABEV3.SA', // Ambev
    'B3SA3.SA', // B3
    'WEGE3.SA', // WEG
    'MGLU3.SA', // Magazine Luiza
    'BBAS3.SA', // Banco do Brasil
    'RENT3.SA', // Localiza
    'SUZB3.SA', // Suzano
    'JBSS3.SA', // JBS
    'GGBR4.SA', // Gerdau
];

const LISTA_PADRAO_EUA = [
    'AAPL',  // Apple
    'MSFT',  // Microsoft
    'GOOGL', // Alphabet (Google)
    'AMZN',  // Amazon
    'NVDA',  // Nvidia
    'META',  // Meta
    'TSLA',  // Tesla
    'JPM',   // JPMorgan Chase
    'V',     // Visa
    'JNJ',   // Johnson & Johnson
    'WMT',   // Walmart
    'DIS',   // Disney
];

const LISTA_PADRAO_COMPLETA = [...LISTA_PADRAO_BRASIL, ...LISTA_PADRAO_EUA];

module.exports = {
    LISTA_PADRAO_BRASIL,
    LISTA_PADRAO_EUA,
    LISTA_PADRAO_COMPLETA,
};
