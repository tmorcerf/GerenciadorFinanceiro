/**
 * gemini-service.js — Chamadas à API Gemini para identificação e extração
 * 
 * Módulo: Corta Gastos Scanner
 * Responsabilidades:
 *   - Identificar estabelecimento pelo CNPJ via Gemini Flash (texto)
 *   - Extrair itens de nota fiscal de screenshot via Gemini Vision (imagem)
 *   - API key hardcoded para fase de testes
 */

window.GeminiService = (() => {
    'use strict';

    // ── Configuração ───────────────────────────────────────────────
    // ⚠️ HARDCODED PARA TESTES — trocar antes de integrar ao Corta Gastos
    const API_KEY = localStorage.getItem('gemini_api_key') || '';
    const MODEL = 'gemini-3.1-flash-lite';
    const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

    // ── Identificar Estabelecimento ────────────────────────────────

    /**
     * Usa Gemini para identificar o estabelecimento pelo CNPJ + UF.
     * @param {string} cnpj - CNPJ formatado (XX.XXX.XXX/XXXX-XX)
     * @param {string} siglaUF - Sigla do estado (ex: "SP")
     * @param {string} nomeUF - Nome do estado (ex: "São Paulo")
     * @returns {Promise<{ nomeFantasia: string, razaoSocial: string, categoria: string, confianca: string }>}
     */
    async function identificarEstabelecimento(cnpj, siglaUF, nomeUF) {
        const systemInstruction = `Você é um assistente financeiro brasileiro. Sua tarefa é identificar estabelecimentos comerciais pelo CNPJ. Responda APENAS em formato JSON válido, sem markdown, sem explicações.`;

        const userPrompt = `Identifique o estabelecimento com CNPJ ${cnpj} localizado no estado ${siglaUF} (${nomeUF}).

Responda EXATAMENTE neste formato JSON:
{
  "nomeFantasia": "Nome do estabelecimento",
  "razaoSocial": "Razão social se souber",
  "categoria": "UMA das categorias: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Serviços, Combustível, Outros",
  "confianca": "alta" ou "media" ou "baixa"
}

Se não souber o nome exato, dê seu melhor palpite baseado no CNPJ e localização. Se for impossível identificar, use nomeFantasia: "Não identificado" e confianca: "baixa".`;

        try {
            const response = await _chamarGemini(systemInstruction, userPrompt);
            const parsed = _parseJSON(response);

            return {
                nomeFantasia: parsed.nomeFantasia || 'Não identificado',
                razaoSocial: parsed.razaoSocial || '',
                categoria: parsed.categoria || 'Outros',
                confianca: parsed.confianca || 'baixa'
            };
        } catch (err) {
            console.error('[GeminiService] Erro ao identificar estabelecimento:', err);
            return {
                nomeFantasia: 'Não identificado',
                razaoSocial: '',
                categoria: 'Outros',
                confianca: 'baixa'
            };
        }
    }

    // ── Melhorar Nomes de Produtos em Lote ────────────────────────────────
    
    /**
     * Usa Gemini para transformar os nomes abreviados da SEFAZ em dados estruturados (nome completo, fabricante, etc).
     * @param {Array<{ean: string, descricao: string}>} itens 
     * @returns {Promise<Array<{ean: string, descricao_ia: string, marca_fabricante: string, categoria: string, volume_quantidade: string, unidade_medida: string}>>}
     */
    async function melhorarNomesEmLote(itens) {
        if (!itens || itens.length === 0) return [];
        
        const systemInstruction = `Você é um especialista em produtos de supermercado brasileiro. Sua tarefa é transformar abreviações de nota fiscal em dados de produtos reais, completos e comerciais. Responda APENAS em formato JSON válido (um array de objetos).`;

        const userPrompt = `Abaixo está uma lista de produtos de uma nota fiscal (EAN e Nome Abreviado). 
Para cada um, descubra as informações reais e retorne a resposta como um array JSON exatamente no formato abaixo.

Formato de Saída esperado (exemplo):
[
  {
    "ean": "123456",
    "descricao_ia": "Ração Úmida Whiskas Sachê Adulto Sabor Salmão 85g",
    "marca_fabricante": "Whiskas / Mars",
    "categoria": "Pet Shop",
    "volume_quantidade": "85",
    "unidade_medida": "g"
  }
]

Lista para processar:
${JSON.stringify(itens.map(i => ({ ean: i.ean, descricao_abreviada: i.descricao })), null, 2)}`;

        try {
            const response = await _chamarGemini(systemInstruction, userPrompt);
            const parsed = _parseJSON(response);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.error('[GeminiService] Erro ao melhorar nomes em lote:', err);
            return [];
        }
    }

    // ── Extrair Nota de Imagem (Vision) ────────────────────────────

    /**
     * Usa Gemini Vision para extrair itens da nota fiscal de um screenshot.
     * @param {string} base64Image - Imagem em base64 (sem prefixo data:image/...)
     * @param {string} mimeType - Tipo MIME (ex: "image/png", "image/jpeg")
     * @returns {Promise<{ valorTotal: number, itens: Array }>}
     */
    async function extrairNotaDeImagem(base64Image, mimeType = 'image/png') {
        const systemInstruction = `Você é um extrator de dados de notas fiscais brasileiras (NFC-e). Extraia TODOS os itens da nota e o valor total. Responda APENAS em formato JSON válido, sem markdown, sem explicações.`;

        const userPrompt = `Extraia desta nota fiscal TODOS os itens e o valor total.

Para cada item retorne:
- codigo: código do produto (EAN/GTIN se visível, ou código interno)
- descricao: nome/descrição do produto
- quantidade: quantidade comprada
- unidade: unidade de medida (UN, KG, LT, etc.)
- valorUnitario: preço por unidade
- valorTotal: subtotal do item

Retorne EXATAMENTE neste formato JSON:
{
  "valorTotal": 0.00,
  "itens": [
    {
      "codigo": "7891000100",
      "descricao": "LEITE INTEGRAL 1L",
      "quantidade": 2,
      "unidade": "UN",
      "valorUnitario": 5.49,
      "valorTotal": 10.98
    }
  ]
}

Se não conseguir ler algum campo, use null. Extraia TODOS os itens visíveis.`;

        try {
            const response = await _chamarGeminiVision(systemInstruction, userPrompt, base64Image, mimeType);
            const parsed = _parseJSON(response);

            return {
                valorTotal: parsed.valorTotal || 0,
                itens: Array.isArray(parsed.itens) ? parsed.itens.map(_normalizarItem) : []
            };
        } catch (err) {
            console.error('[GeminiService] Erro ao extrair nota de imagem:', err);
            return { valorTotal: 0, itens: [] };
        }
    }

    // ── Chamadas HTTP ──────────────────────────────────────────────

    /**
     * Chamada Gemini para texto puro.
     */
    async function _chamarGemini(systemInstruction, userContent) {
        const url = `${BASE_URL}:generateContent?key=${API_KEY}`;

        const body = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                parts: [{ text: userContent }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json'
            }
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`);
        }

        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    /**
     * Chamada Gemini com imagem (multimodal).
     */
    async function _chamarGeminiVision(systemInstruction, userContent, base64Image, mimeType) {
        const url = `${BASE_URL}:generateContent?key=${API_KEY}`;

        const body = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                parts: [
                    { text: userContent },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json'
            }
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            throw new Error(`Gemini Vision API error: ${resp.status} ${resp.statusText}`);
        }

        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // ── Utilitários ────────────────────────────────────────────────

    /**
     * Faz parse seguro de JSON, removendo markdown se presente.
     */
    function _parseJSON(text) {
        if (!text) return {};
        // Remover blocos markdown ```json ... ``` se presentes
        let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        try {
            return JSON.parse(clean);
        } catch (e) {
            console.warn('[GeminiService] JSON inválido:', clean);
            return {};
        }
    }

    /**
     * Normaliza um item extraído, garantindo tipos corretos.
     */
    function _normalizarItem(item) {
        return {
            codigo: item.codigo ? String(item.codigo) : null,
            descricao: item.descricao ? String(item.descricao) : 'Item sem descrição',
            quantidade: item.quantidade ? parseFloat(item.quantidade) : 1,
            unidade: item.unidade ? String(item.unidade).toUpperCase() : 'UN',
            valorUnitario: item.valorUnitario ? parseFloat(item.valorUnitario) : 0,
            valorTotal: item.valorTotal ? parseFloat(item.valorTotal) : 0
        };
    }

    /**
     * Verifica se a API key está configurada.
     */
    function isConfigurado() {
        return API_KEY && API_KEY !== 'SUBSTITUIR_PELA_CHAVE_REAL';
    }

    // ── API Pública ────────────────────────────────────────────────
    return {
        identificarEstabelecimento,
        melhorarNomesEmLote,
        extrairNotaDeImagem,
        isConfigurado
    };
})();
