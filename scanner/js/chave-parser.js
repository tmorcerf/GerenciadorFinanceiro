/**
 * chave-parser.js — Parser e validador de chaves NF-e/NFC-e (44 dígitos)
 * 
 * Módulo: Corta Gastos Scanner
 * Responsabilidades:
 *   - Extrair chave de 44 dígitos de URLs SEFAZ ou texto puro
 *   - Validar dígito verificador (módulo 11)
 *   - Parsear campos individuais (CNPJ, UF, data, nº nota, etc.)
 *   - Detectar modo de emissão (normal vs contingência)
 */

window.ChaveParser = (() => {
    'use strict';

    // ── Tabela IBGE → UF ────────────────────────────────────────────
    const IBGE_UF = {
        '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
        '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
        '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
        '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
        '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
        '52': 'GO', '53': 'DF'
    };

    const UF_NOME = {
        'RO': 'Rondônia', 'AC': 'Acre', 'AM': 'Amazonas', 'RR': 'Roraima',
        'PA': 'Pará', 'AP': 'Amapá', 'TO': 'Tocantins', 'MA': 'Maranhão',
        'PI': 'Piauí', 'CE': 'Ceará', 'RN': 'Rio Grande do Norte',
        'PB': 'Paraíba', 'PE': 'Pernambuco', 'AL': 'Alagoas', 'SE': 'Sergipe',
        'BA': 'Bahia', 'MG': 'Minas Gerais', 'ES': 'Espírito Santo',
        'RJ': 'Rio de Janeiro', 'SP': 'São Paulo', 'PR': 'Paraná',
        'SC': 'Santa Catarina', 'RS': 'Rio Grande do Sul',
        'MS': 'Mato Grosso do Sul', 'MT': 'Mato Grosso', 'GO': 'Goiás',
        'DF': 'Distrito Federal'
    };

    // Tipos de emissão (posição 35 da chave)
    const TP_EMIS = {
        '1': { nome: 'Normal', online: true },
        '2': { nome: 'Contingência FS-IA', online: false },
        '3': { nome: 'Contingência SCAN', online: false },
        '4': { nome: 'Contingência DPEC', online: false },
        '5': { nome: 'Contingência FS-DA', online: false },
        '6': { nome: 'Contingência SVC-AN', online: true },  // Pode ter dados no servidor virtual
        '7': { nome: 'Contingência SVC-RS', online: true },  // Pode ter dados no servidor virtual
        '9': { nome: 'Contingência Offline NFC-e', online: false }
    };

    // ── Extração da chave a partir de URL ou texto ─────────────────

    /**
     * Tenta extrair a chave de 44 dígitos de qualquer input.
     * 4 estratégias em cascata.
     * @param {string} raw - URL, texto ou chave direta
     * @returns {{ chave: string, url: string|null } | null}
     */
    function extrairChave(raw) {
        if (!raw || typeof raw !== 'string') return null;

        const texto = raw.trim();
        let url = null;

        // Se parece ser uma URL, parsear
        try {
            if (texto.startsWith('http')) {
                url = texto;
                const urlObj = new URL(texto);

                // Estratégia 1: Query param "p" (formato padrão NFC-e)
                const paramP = urlObj.searchParams.get('p');
                if (paramP) {
                    const parte = paramP.split('|')[0];
                    if (/^\d{44}$/.test(parte)) {
                        return { chave: parte, url };
                    }
                }

                // Estratégia 2: Query param "chNFe"
                const chNFe = urlObj.searchParams.get('chNFe');
                if (chNFe && /^\d{44}$/.test(chNFe)) {
                    return { chave: chNFe, url };
                }

                // Estratégia 3: 44 dígitos no path
                const matchPath = urlObj.pathname.match(/(\d{44})/);
                if (matchPath) {
                    return { chave: matchPath[1], url };
                }

                // Estratégia 3b: 44 dígitos em qualquer query param
                const fullQuery = urlObj.search;
                const matchQuery = fullQuery.match(/(\d{44})/);
                if (matchQuery) {
                    return { chave: matchQuery[1], url };
                }
            }
        } catch (e) {
            // URL inválida, continuar para fallback
        }

        // Estratégia 4: Fallback — buscar 44 dígitos em qualquer texto
        const matchTexto = texto.match(/\b(\d{44})\b/);
        if (matchTexto) {
            return { chave: matchTexto[1], url };
        }

        return null;
    }

    // ── Validação do dígito verificador (Módulo 11) ────────────────

    /**
     * Valida o dígito verificador da chave NF-e/NFC-e.
     * Algoritmo módulo 11 com pesos 2-9 cíclicos.
     * @param {string} chave - String de 44 dígitos
     * @returns {boolean}
     */
    function validarChave(chave) {
        if (!chave || !/^\d{44}$/.test(chave)) return false;

        const digitos = chave.split('').map(Number);
        const digitoInformado = digitos[43];

        // Multiplicar posições 0-42 pelos pesos 2,3,4,5,6,7,8,9 (cíclico, da direita para esquerda)
        let soma = 0;
        let peso = 2;
        for (let i = 42; i >= 0; i--) {
            soma += digitos[i] * peso;
            peso = peso >= 9 ? 2 : peso + 1;
        }

        const resto = soma % 11;
        const digitoCalculado = (resto === 0 || resto === 1) ? 0 : 11 - resto;

        return digitoCalculado === digitoInformado;
    }

    // ── Parse dos campos da chave ──────────────────────────────────

    /**
     * Extrai todos os campos da chave de 44 dígitos.
     * @param {string} chave - String de 44 dígitos (já validada)
     * @returns {object} Campos parseados
     */
    function parsearChave(chave) {
        if (!chave || chave.length !== 44) return null;

        const cUF = chave.substring(0, 2);
        const AAMM = chave.substring(2, 6);
        const cnpj = chave.substring(6, 20);
        const modelo = chave.substring(20, 22);
        const serie = chave.substring(22, 25);
        const nNF = chave.substring(25, 34);
        const tpEmis = chave.substring(34, 35);
        const cNF = chave.substring(35, 43);
        const cDV = chave.substring(43, 44);

        const siglaUF = IBGE_UF[cUF] || '??';
        const nomeUF = UF_NOME[siglaUF] || 'Desconhecido';
        const tipoEmissao = TP_EMIS[tpEmis] || { nome: 'Desconhecido', online: false };

        // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
        const cnpjFormatado = cnpj.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
        );

        // Extrair data (AAMM → mês/ano)
        const ano = 2000 + parseInt(AAMM.substring(0, 2));
        const mes = parseInt(AAMM.substring(2, 4));
        const dataEmissao = `${ano}-${String(mes).padStart(2, '0')}`;

        // Modelo: 55 = NF-e (B2B), 65 = NFC-e (consumidor)
        const modeloDesc = modelo === '65' ? 'NFC-e' : modelo === '55' ? 'NF-e' : `Modelo ${modelo}`;

        return {
            chave,
            cUF,
            siglaUF,
            nomeUF,
            AAMM,
            dataEmissao,       // "2026-07"
            ano,
            mes,
            cnpj,
            cnpjFormatado,
            modelo,
            modeloDesc,
            serie: serie.replace(/^0+/, '') || '0',
            nNF: nNF.replace(/^0+/, '') || '0',
            nNFFormatado: nNF.replace(/^0+/, '').replace(/(\d)(?=(\d{3})+$)/g, '$1.'),
            tpEmis,
            tipoEmissao: tipoEmissao.nome,
            isOnline: tipoEmissao.online,
            isContingencia: !tipoEmissao.online,
            cNF,
            cDV
        };
    }

    // ── Extração de parâmetros extras da URL (modo contingência) ───

    /**
     * Extrai valor e data da URL do QR code (disponíveis apenas em contingência).
     * Formato: ?p=<chave44>|<versao>|<tpAmb>|<dhEmi>|<vNF>|<digest>|<cscId>|<hash>
     * @param {string} url - URL completa do QR code
     * @returns {{ valor: number|null, dataHora: string|null }}
     */
    function extrairDadosURL(url) {
        if (!url) return { valor: null, dataHora: null };

        try {
            const urlObj = new URL(url);
            const paramP = urlObj.searchParams.get('p');
            if (!paramP) return { valor: null, dataHora: null };

            const partes = paramP.split('|');
            // Formato contingência: chave|versao|tpAmb|dhEmi|vNF|digest|cscId|hash
            if (partes.length >= 5) {
                const dhEmi = partes[3] || null;
                const vNF = partes[4] ? parseFloat(partes[4]) : null;
                return {
                    valor: (vNF && !isNaN(vNF)) ? vNF : null,
                    dataHora: dhEmi || null
                };
            }
        } catch (e) {
            // URL inválida
        }

        return { valor: null, dataHora: null };
    }

    // ── API Pública ────────────────────────────────────────────────

    /**
     * Processa um QR code completo: extrai, valida, parseia.
     * @param {string} raw - Conteúdo do QR code (URL ou chave)
     * @returns {{ sucesso: boolean, dados: object|null, erro: string|null }}
     */
    function processar(raw) {
        // 1. Extrair chave
        const extraido = extrairChave(raw);
        if (!extraido) {
            return {
                sucesso: false,
                dados: null,
                erro: 'QR code não contém uma chave de nota fiscal válida (44 dígitos).'
            };
        }

        // 2. Validar dígito verificador
        if (!validarChave(extraido.chave)) {
            return {
                sucesso: false,
                dados: null,
                erro: 'Chave de acesso inválida (dígito verificador incorreto).'
            };
        }

        // 3. Parsear campos
        const campos = parsearChave(extraido.chave);

        // 4. Extrair dados extras da URL (valor/data de contingência)
        const dadosURL = extrairDadosURL(extraido.url);

        // 5. Verificar contingência
        if (campos.isContingencia) {
            return {
                sucesso: false,
                dados: { ...campos, url: extraido.url, ...dadosURL },
                erro: `Nota emitida em contingência (${campos.tipoEmissao}). Dados completos não disponíveis na SEFAZ.`
            };
        }

        return {
            sucesso: true,
            dados: {
                ...campos,
                url: extraido.url,
                valorURL: dadosURL.valor,
                dataHoraURL: dadosURL.dataHora
            },
            erro: null
        };
    }

    // ── Exports ────────────────────────────────────────────────────
    return {
        processar,
        extrairChave,
        validarChave,
        parsearChave,
        extrairDadosURL,
        IBGE_UF,
        UF_NOME
    };
})();
