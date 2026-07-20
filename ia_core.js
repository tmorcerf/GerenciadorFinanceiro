// ia_core.js v1 — Módulo Central de Inteligência Artificial
// Corta Gastos - Camada de Rede e Parser JSON

window.IACore = (function() {
  var MODEL_LITE      = 'gemini-3.1-flash-lite';
  var MODEL_VISION_FX = 'gemini-3-flash-preview';
  var MODEL_PRO       = 'gemini-3.1-pro-preview';
  var MODEL_BKP       = 'gemini-3.1-pro-preview';
  var API_BASE        = 'https://generativelanguage.googleapis.com/v1beta/models';

  var _apiKey = null;

  async function _getApiKey() {
    if (_apiKey) return _apiKey;
    try {
      if (window.firebaseDB) {
        var snap = await window.firebaseDB.collection('AppConfig').doc('gemini').get();
        if (snap.exists) {
          var cfg = snap.data();
          if (cfg.apiKey && cfg.apiKey.length > 10) _apiKey = cfg.apiKey;
          if (_apiKey) return _apiKey;
        }
      }
    } catch (e) { console.warn('[IACore] Firestore AppConfig falhou:', e.message); }

    try {
      if (typeof firebase !== 'undefined' && typeof firebase.remoteConfig === 'function') {
        var rc = firebase.remoteConfig();
        rc.settings = { minimumFetchIntervalMillis: 3600000 };
        await rc.fetchAndActivate();
        var rcKey = rc.getString('gemini_api_key');
        if (rcKey && rcKey.length > 10) { _apiKey = rcKey; return _apiKey; }
      }
    } catch (e) { console.warn('[IACore] Remote Config falhou:', e.message); }

    if (window.GEMINI_API_KEY) { _apiKey = window.GEMINI_API_KEY; return _apiKey; }
    throw new Error('Gemini: chave nao encontrada. Crie AppConfig/gemini no Firestore com campo "apiKey".');
  }

  async function chamarGemini(model, systemPrompt, userContent, inlineData, opts) {
    if (localStorage.getItem('gemini_mock') === 'true') {
      console.warn('[IACore] ⚠️ MODO MOCK ATIVADO! Nenhuma chamada real à IA foi feita.');
      await new Promise(r => setTimeout(r, 1000));
      return { mock: true, opts: opts, systemPrompt: systemPrompt.substring(0,50) };
    }

    var apiKey = await _getApiKey();
    var parts = [{ text: userContent }];
    if (inlineData) {
      parts.push({
        inlineData: {
          mimeType: inlineData.mimeType,
          data: inlineData.data
        }
      });
    }

    var maxTok = opts && opts._maxOutputTokens ? opts._maxOutputTokens : 8192;

    var body = {
      contents: [{ role: 'user', parts: parts }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        maxOutputTokens: maxTok,
        responseMimeType: 'application/json'
      }
    };

    var url = API_BASE + '/' + model + ':generateContent?key=' + apiKey;
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var errText = await res.text();
      var errObj = {};
      try { errObj = JSON.parse(errText); } catch(e) {}
      var errMsg = (errObj.error && errObj.error.message) ? errObj.error.message : errText.substring(0, 200);

      if (MODEL_BKP && MODEL_BKP !== model) {
        console.warn('[IACore] ' + model + ' falhou (' + res.status + '), tentando backup: ' + MODEL_BKP);
        var resBkp = await fetch(API_BASE + '/' + MODEL_BKP + ':generateContent?key=' + apiKey, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (resBkp.ok) {
          var jsonBkp = await resBkp.json();
          var partsBkp = (jsonBkp.candidates && jsonBkp.candidates[0] &&
                          jsonBkp.candidates[0].content && jsonBkp.candidates[0].content.parts) || [];
          var rawBkp = '';
          for (var bi = 0; bi < partsBkp.length; bi++) {
            var pt = partsBkp[bi].text || '';
            if (pt && (pt.trim().startsWith('{') || pt.trim().startsWith('[') || pt.includes('```'))) { rawBkp = pt; break; }
          }
          if (!rawBkp && partsBkp.length) rawBkp = partsBkp[partsBkp.length-1].text || '{}';
          rawBkp = rawBkp.replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/i,'').trim();
          var mBkp = rawBkp.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          try { return JSON.parse(mBkp ? mBkp[0] : rawBkp); } catch(e2) {}
        }
      }

      if (res.status === 503) {
          throw new Error('Atenção Ninja 🥷: Os servidores do Google estão muito congestionados agora (Erro 503). Aguarde nas sombras e tente novamente em alguns segundos!');
      }
      throw new Error('Gemini API [' + res.status + ']: ' + errMsg);
    }

    var json = await res.json();
    var rawText = '';
    var rParts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    for (var pi = 0; pi < rParts.length; pi++) {
      var partText = rParts[pi].text || '';
      if (partText && (partText.trim().startsWith('{') || partText.trim().startsWith('[') || partText.includes('```'))) {
        rawText = partText; break;
      }
    }
    if (!rawText) {
      for (var pi2 = rParts.length - 1; pi2 >= 0; pi2--) {
        if (rParts[pi2].text) { rawText = rParts[pi2].text; break; }
      }
    }
    var text = rawText || '{}';
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    function _tryParse(str) {
      try { return JSON.parse(str); } catch(e1) {}
      var m = str.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) { try { return JSON.parse(m[0]); } catch(e2) {} }
      var truncFix = str.replace(/,?\s*\{[^}]*$/, ']}}');
      try { return JSON.parse(truncFix); } catch(e3) {}
      console.error('[IACore] Nao foi possivel parsear JSON.\nPrimeiros 800 chars:', str.substring(0, 800));
      return { status: 'error', message: 'Resposta da IA nao e JSON valido.' };
    }
    return _tryParse(text);
  }

  return {
    chamarGemini,
    MODEL_LITE,
    MODEL_PRO,
    MODEL_VISION_FX
  };
})();
console.log('[IACore] v1 carregado.');
