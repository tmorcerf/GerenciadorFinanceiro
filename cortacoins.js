// cortacoins.js
// Corta Gastos - Sistema CortaCoins (Gamificacao)
// Firestore collections:
//   usuarios_nfe/{uid}   -> saldo e perfil
//   nfe_transacoes/{id}  -> historico de creditos e debitos

window.CortaCoins = (function() {

  var SALDO_INICIAL = 1000;
  var _uid = null;
  var _unsubscribe = null;

  // Inicializa o sistema para o usuario autenticado
  function init(uid) {
    _uid = uid;
    var db = window.firebaseDB;
    if (!db || !uid) return;

    var ref = db.collection('usuarios_nfe').doc(uid);

    // Garante que o documento existe; cria com saldo inicial se for novo usuario
    ref.get().then(function(snap) {
      if (!snap.exists) {
        return ref.set({
          cortaCoins: SALDO_INICIAL,
          total_importacoes: 0,
          total_scans: 0,
          nivel: 1,
          plano: 'gratuito',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
          console.log('[CortaCoins] Novo usuario criado com ' + SALDO_INICIAL + ' moedas.');
          _registrarTransacao(uid, 'credito', SALDO_INICIAL, 'Bonus de boas-vindas');
        });
      }
    }).catch(function(err) {
      console.error('[CortaCoins] Erro ao inicializar:', err);
    });

    // Escuta o saldo em tempo real e atualiza o display
    _unsubscribe = ref.onSnapshot(function(snap) {
      if (snap.exists) {
        _atualizarDisplay(snap.data().cortaCoins || 0);
      }
    }, function(err) {
      console.warn('[CortaCoins] Listener error:', err.message);
    });
  }

  // Atualiza o contador na sidebar
  function _atualizarDisplay(saldo) {
    var el = document.getElementById('user-points-display');
    if (el) {
      el.textContent = saldo.toLocaleString('pt-BR') + ' moedas';
      // Adiciona animacao suave de destaque
      el.style.transition = 'transform 0.3s ease';
      el.style.transform = 'scale(1.2)';
      setTimeout(function() { el.style.transform = 'scale(1)'; }, 300);
    }
  }

  // Registra uma transacao no historico
  function _registrarTransacao(uid, tipo, quantidade, descricao) {
    var db = window.firebaseDB;
    if (!db || !uid) return;
    db.collection('nfe_transacoes').add({
      uid: uid,
      tipo: tipo,          // 'credito' ou 'debito'
      quantidade: quantidade,
      descricao: descricao,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err) {
      console.warn('[CortaCoins] Erro ao registrar transacao:', err.message);
    });
  }

  // Credita moedas ao usuario (+)
  async function creditar(quantidade, descricao) {
    if (!_uid || quantidade <= 0) return { ok: true };
    var db = window.firebaseDB;

    try {
      await db.collection('usuarios_nfe').doc(_uid).update({
        cortaCoins: firebase.firestore.FieldValue.increment(quantidade),
        total_importacoes: firebase.firestore.FieldValue.increment(1)
      });
      _registrarTransacao(_uid, 'credito', quantidade, descricao || 'Credito');
      console.log('[CortaCoins] +' + quantidade + ' moedas: ' + descricao);
      return { ok: true };
    } catch (err) {
      console.error('[CortaCoins] Erro ao creditar:', err);
      return { ok: false, msg: err.message };
    }
  }

  // Debita moedas do usuario (-) - verifica saldo antes
  async function debitar(quantidade, descricao) {
    if (!_uid || quantidade <= 0) return { ok: true };
    var db = window.firebaseDB;

    try {
      // Verifica saldo atual
      var snap = await db.collection('usuarios_nfe').doc(_uid).get();
      if (!snap.exists) return { ok: false, msg: 'Usuario nao encontrado no sistema.' };

      var dados = snap.data();

      // Assinantes nao pagam pela categorizacao IA
      if (dados.plano === 'assinante' && descricao && descricao.includes('Categorizacao')) {
        console.log('[CortaCoins] Assinante: categorizacao IA gratuita.');
        return { ok: true, gratuito: true };
      }

      var saldoAtual = dados.cortaCoins || 0;
      if (saldoAtual < quantidade) {
        return {
          ok: false,
          msg: 'Saldo insuficiente! Voce tem ' + saldoAtual.toLocaleString('pt-BR') + ' moedas e precisa de ' + quantidade + '.'
        };
      }

      await db.collection('usuarios_nfe').doc(_uid).update({
        cortaCoins: firebase.firestore.FieldValue.increment(-quantidade)
      });
      _registrarTransacao(_uid, 'debito', quantidade, descricao || 'Debito');
      console.log('[CortaCoins] -' + quantidade + ' moedas: ' + descricao);
      return { ok: true };
    } catch (err) {
      console.error('[CortaCoins] Erro ao debitar:', err);
      return { ok: false, msg: err.message };
    }
  }

  // Retorna o saldo atual
  async function getSaldo() {
    if (!_uid) return 0;
    try {
      var snap = await window.firebaseDB.collection('usuarios_nfe').doc(_uid).get();
      return snap.exists ? (snap.data().cortaCoins || 0) : 0;
    } catch (err) {
      return 0;
    }
  }

  // Encerra o listener quando o usuario sai
  function destroy() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    _uid = null;
    _atualizarDisplay(0);
  }

  // Auto-inicializa ouvindo mudancas de autenticacao do Firebase
  function _autoInit() {
    if (window.firebaseAuth) {
      window.firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
          init(user.uid);
        } else {
          destroy();
        }
      });
    } else {
      // Fallback: espera o firebase-config.js estar pronto
      var tentativas = 0;
      var intervalo = setInterval(function() {
        tentativas++;
        if (window.firebaseAuth) {
          clearInterval(intervalo);
          window.firebaseAuth.onAuthStateChanged(function(user) {
            if (user) init(user.uid);
            else destroy();
          });
        } else if (tentativas > 50) { // 10s timeout
          clearInterval(intervalo);
          console.warn('[CortaCoins] Firebase Auth nao disponivel apos 10s.');
        }
      }, 200);
    }
  }

  // Inicia auto-configuracao
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit);
  } else {
    _autoInit();
  }

  return { init, creditar, debitar, getSaldo, destroy };

})();

console.log('[CortaCoins] Modulo carregado.');
