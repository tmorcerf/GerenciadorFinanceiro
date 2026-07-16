/**
 * sefaz-scripts.js — Scripts de extração DOM para cada SEFAZ estadual
 * 
 * Módulo: Corta Gastos Scanner
 * 
 * Estratégia de Polling:
 * Como as SEFAZ usam JSF, anti-bots e carregamento dinâmico (AJAX), 
 * o DOM nem sempre está pronto no onload. O script injetado agora 
 * faz polling por até 15 segundos verificando o DOM a cada 1 segundo.
 */

window.SefazScripts = (() => {
    'use strict';

    // Wrapper padrão que executa a extração em loop até encontrar itens ou dar timeout
    const POLLING_WRAPPER = `
    function enviar(data) {
        var msg = JSON.stringify(data);
        if (window.mobileApp && window.mobileApp.postMessage) {
            window.mobileApp.postMessage(msg);
        } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.cordova_iab) {
            window.webkit.messageHandlers.cordova_iab.postMessage(msg);
        } else {
            console.log('SCANNER_DATA:' + msg);
        }
    }

    var MAX_TENTATIVAS = 15;
    var tentativas = 0;
    
    var interval = setInterval(function() {
        tentativas++;
        try {
            var resultado = extrair();
            if (resultado && resultado.itens && resultado.itens.length > 0) {
                clearInterval(interval);
                enviar(resultado);
            } else if (tentativas >= MAX_TENTATIVAS) {
                clearInterval(interval);
                // Enviar vazio apenas no final do timeout
                enviar(resultado || { itens: [], valorTotal: 0, metodo: 'timeout' });
            }
        } catch (e) {
            if (tentativas >= MAX_TENTATIVAS) {
                clearInterval(interval);
                enviar({ erro: e.message, itens: [], valorTotal: 0 });
            }
        }
    }, 1000);
    `;

    const scripts = {};

    // ── Script Genérico ─────────────────────────────────────────────
    scripts.generico = `
(function() {
    ${POLLING_WRAPPER}
    
    function extrair() {
        var resultado = { itens: [], valorTotal: 0, metodo: 'generico' };
        var body = document.body;
        if (!body) return resultado;
        var fullText = body.innerText || body.textContent || '';
        
        var lines = fullText.split('\\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
        var i = 0;
        while (i < lines.length) {
            var line = lines[i];
            var codMatch = line.match(/\\(C[oó]d(?:igo)?:\\s*(\\d+)\\s*\\)/i);
            if (codMatch) {
                var item = { codigo: codMatch[1], descricao: line.replace(/\\s*\\(C[oó]d(?:igo)?:.*?\\)\\s*/i, '').trim(), quantidade: 1, unidade: 'UN', valorUnitario: 0, valorTotal: 0 };
                if (i + 1 < lines.length) {
                    var nl = lines[i + 1];
                    var qm = nl.match(/Qtde?\\.?:\\s*([\\d.,]+)/i);
                    if (qm) item.quantidade = parseFloat(qm[1].replace(',', '.'));
                    var um = nl.match(/UN:\\s*(\\w+)/i);
                    if (um) item.unidade = um[1].toUpperCase();
                    var vm = nl.match(/Vl\\.?\\s*Unit\\.?[:\\s]+([\\d.,]+)/i);
                    if (vm) item.valorUnitario = parseFloat(vm[1].replace(/\\./g, '').replace(',', '.'));
                }
                if (i + 2 < lines.length && /^[\\d.,]+$/.test(lines[i + 2].replace(/[^\\d,.]/g, ''))) {
                    item.valorTotal = parseFloat(lines[i + 2].replace(/[^\\d,.]/g, '').replace(/\\./g, '').replace(',', '.'));
                    i += 3;
                } else {
                    item.valorTotal = item.valorUnitario * item.quantidade;
                    i += 2;
                }
                if (item.descricao) resultado.itens.push(item);
                continue;
            }
            i++;
        }
        
        if (resultado.itens.length === 0) {
            var tabelas = document.querySelectorAll('table');
            for (var t = 0; t < tabelas.length; t++) {
                var rows = tabelas[t].querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td');
                    if (cells.length < 3) continue;
                    var textos = [];
                    for (var c = 0; c < cells.length; c++) textos.push(cells[c].textContent.trim());
                    var temNum = textos.some(function(tx) { return /\\d+[,.]\\d{2}/.test(tx); });
                    var temTxt = textos.some(function(tx) { return tx.length > 3 && /[a-zA-Z]/.test(tx); });
                    if (temNum && temTxt) {
                        var itm = { codigo: null, descricao: '', quantidade: 1, unidade: 'UN', valorUnitario: 0, valorTotal: 0 };
                        for (var x = 0; x < textos.length; x++) {
                            var tx = textos[x];
                            if (/^\\d{7,14}$/.test(tx)) itm.codigo = tx;
                            else if (/^\\d+[,.]\\d{2}$/.test(tx.replace(/\\./g, ''))) {
                                var v = parseFloat(tx.replace(/\\./g, '').replace(',', '.'));
                                if (!itm.valorUnitario) itm.valorUnitario = v;
                                else itm.valorTotal = v;
                            }
                            else if (tx.length > 3 && /[a-zA-Z]/.test(tx) && !itm.descricao) itm.descricao = tx;
                        }
                        if (itm.descricao) resultado.itens.push(itm);
                    }
                }
            }
        }
        
        var totalMatch = fullText.match(/Valor\\s*a\\s*pagar\\s*R\\$\\s*:?\\s*([\\d.,]+)/i) || fullText.match(/Valor\\s*total[^\\d]*([\\d.,]+)/i) || fullText.match(/TOTAL[^\\d]*R\\$\\s*([\\d.,]+)/i);
        if (totalMatch) resultado.valorTotal = parseFloat(totalMatch[1].replace(/\\./g, '').replace(',', '.'));
        
        return resultado;
    }
})();`;

    // ── RJ — Rio de Janeiro ─────────────────────────────────────────
    scripts.RJ = `
(function() {
    ${POLLING_WRAPPER}
    
    function extrair() {
        var resultado = { itens: [], valorTotal: 0, metodo: 'RJ' };
        var body = document.body;
        if (!body) return resultado;
        
        var fullText = body.innerText || body.textContent || '';
        
        var lines = fullText.split('\\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
        var i = 0;
        while (i < lines.length) {
            var line = lines[i];
            var codMatch = line.match(/\\(C[oó]d(?:igo)?:\\s*(\\d+)\\s*\\)/i);
            if (codMatch) {
                var item = { codigo: codMatch[1], descricao: '', quantidade: 1, unidade: 'UN', valorUnitario: 0, valorTotal: 0 };
                item.descricao = line.replace(/\\s*\\(C[oó]d(?:igo)?:.*?\\)\\s*/i, '').trim();
                item.descricao = item.descricao.replace(/\\s*\\(Tara\\s+\\d+g\\)/i, '').trim();
                
                if (i + 1 < lines.length) {
                    var infoLine = lines[i + 1];
                    var qtdM = infoLine.match(/Qtde?\\.?:\\s*([\\d.,]+)/i);
                    if (qtdM) item.quantidade = parseFloat(qtdM[1].replace(',', '.'));
                    var unM = infoLine.match(/UN:\\s*(\\w+)/i);
                    if (unM) item.unidade = unM[1].toUpperCase();
                    var vuM = infoLine.match(/Vl\\.?\\s*Unit\\.?[:\\s]+([\\d.,]+)/i);
                    if (vuM) item.valorUnitario = parseFloat(vuM[1].replace(/\\./g, '').replace(',', '.'));
                }
                
                if (i + 2 < lines.length) {
                    var vtLine = lines[i + 2];
                    var vtClean = vtLine.replace(/[^\\d,.-]/g, '');
                    if (/^\\d+[,.]\\d{2}$/.test(vtClean)) {
                        item.valorTotal = parseFloat(vtClean.replace(/\\./g, '').replace(',', '.'));
                        i += 3;
                    } else {
                        var vtInline = lines[i + 1].match(/Vl\\.?\\s*Total[:\\s]*([\\d.,]+)/i);
                        if (vtInline) {
                            item.valorTotal = parseFloat(vtInline[1].replace(/\\./g, '').replace(',', '.'));
                        } else {
                            item.valorTotal = item.valorUnitario * item.quantidade;
                        }
                        i += 2;
                    }
                } else {
                    item.valorTotal = item.valorUnitario * item.quantidade;
                    i += 2;
                }
                item.valorTotal = Math.round(item.valorTotal * 100) / 100;
                if (item.descricao && item.descricao.length > 1) resultado.itens.push(item);
                continue;
            }
            i++;
        }
        
        // Regex Fallback ignoring newlines (super robusto)
        if (resultado.itens.length === 0) {
            var itemPattern = /([^\\n]+?)\\s*\\(C[oó]d(?:igo)?:\\s*(\\d+)\\s*\\)\\s*Qtde?\\.?:\\s*([\\d,.]+)\\s*UN:\\s*(\\w+)\\s*Vl\\.?\\s*Unit\\.?:\\s*([\\d,.]+)(?:\\s*Vl\\.?\\s*Total)?\\s*([\\d,.]+)/gi;
            var m;
            while ((m = itemPattern.exec(fullText)) !== null) {
                var it = { 
                    codigo: m[2], 
                    descricao: m[1].trim(), 
                    quantidade: parseFloat(m[3].replace(',','.')), 
                    unidade: m[4].toUpperCase(), 
                    valorUnitario: parseFloat(m[5].replace(/\\./g,'').replace(',','.')), 
                    valorTotal: parseFloat(m[6].replace(/\\./g,'').replace(',','.')) 
                };
                var lastCodeIdx = it.descricao.lastIndexOf('Vl. Total');
                if (lastCodeIdx > -1) it.descricao = it.descricao.substring(lastCodeIdx + 9).trim();
                if (it.descricao) resultado.itens.push(it);
            }
        }
        
        var totalMatch = fullText.match(/Valor\\s*a\\s*pagar\\s*R\\$\\s*:?\\s*([\\d.,]+)/i);
        if (totalMatch) resultado.valorTotal = parseFloat(totalMatch[1].replace(/\\./g, '').replace(',', '.'));
        else {
            var soma = 0;
            for (var s = 0; s < resultado.itens.length; s++) soma += resultado.itens[s].valorTotal;
            resultado.valorTotal = Math.round(soma * 100) / 100;
        }
        
        var cnpjMatch = fullText.match(/CNPJ:\\s*([\\d.\\/\\-]+)/i);
        if (cnpjMatch) resultado.cnpjNota = cnpjMatch[1];
        var razaoMatch = fullText.match(/ELETR[OÔ]NICA\\s*\\n\\s*(.+?)\\s*\\n/i);
        if (razaoMatch) resultado.razaoSocial = razaoMatch[1].trim();
        
        return resultado;
    }
})();`;

    // ── SP e RS ───────────────────────────────────────────────────
    scripts.SP = scripts.generico;
    scripts.RS = scripts.generico; // Como o genérico foi aprimorado para ler SVRS, podemos usá-lo

    // ── Estados que usam SVRS ──────────────────────────────────────
    const ESTADOS_SVRS = ['SC', 'AC', 'AL', 'AP', 'DF', 'ES', 'PB', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO', 'PR'];
    for (const uf of ESTADOS_SVRS) scripts[uf] = scripts.RS;

    // Outros estados: usar genérico
    const ESTADOS_GENERICO = ['MG', 'BA', 'CE', 'GO', 'PE', 'MA', 'MT', 'MS', 'PA', 'AM'];
    for (const uf of ESTADOS_GENERICO) scripts[uf] = scripts.generico;

    function getScript(uf) { return scripts[uf] || scripts.generico; }
    function getEstadosMapeados() { return Object.keys(scripts).filter(k => k !== 'generico'); }

    return { getScript, getEstadosMapeados };
})();
