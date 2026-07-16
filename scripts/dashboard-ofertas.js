window.DashboardOfertas = (() => {
    async function carregarSaldoENotas() {
        if (!firebase.auth().currentUser) return;
        const uid = firebase.auth().currentUser.uid;
        
        // 1. Saldo
        const ccDisplay = document.getElementById('cc-saldo-display');
        if (ccDisplay && window.CortaCoins) {
            const saldo = await window.CortaCoins.getSaldo();
            ccDisplay.textContent = saldo.toLocaleString('pt-BR');
        }

        // 2. Extrato CortaCoins
        const ccList = document.getElementById('cc-extrato-list');
        if (ccList) {
            try {
                const snap = await firebase.firestore().collection('nfe_transacoes')
                    .where('uid', '==', uid)
                    .orderBy('data', 'desc')
                    .limit(10)
                    .get();
                
                if (snap.empty) {
                    ccList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Nenhuma transação encontrada.</p>';
                } else {
                    let html = '';
                    snap.forEach(doc => {
                        const t = doc.data();
                        const d = t.data ? new Date(t.data.seconds * 1000).toLocaleDateString('pt-BR') : '';
                        const color = t.quantidade > 0 ? '#10b981' : '#ef4444';
                        const sign = t.quantidade > 0 ? '+' : '';
                        html += `
                        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500; font-size: 0.95rem;">${t.descricao || 'Transação'}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${d}</div>
                            </div>
                            <div style="color: ${color}; font-weight: bold;">${sign}${t.quantidade}</div>
                        </div>`;
                    });
                    ccList.innerHTML = html;
                }
            } catch (e) {
                console.error("Erro extrato cc", e);
                ccList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Para exibir, crie o Índice no Firebase para (uid ASC, data DESC).</p>';
            }
        }

        // 3. Qtd Notas
        const notasDisplay = document.getElementById('cc-notas-display');
        if (notasDisplay) {
            try {
                const notasSnap = await firebase.firestore().collection('nfe_notas').where('uid', '==', uid).get();
                notasDisplay.textContent = notasSnap.size;
            } catch (e) { console.error(e); }
        }
    }

    async function carregarAchados() {
        const achadosList = document.getElementById('ofertas-list');
        if (!achadosList) return;

        try {
            const uid = firebase.auth().currentUser.uid;
            
            // 1. Pegar a última nota do usuário para descobrir a região (UF)
            let userUF = null;
            try {
                const ultimaNota = await firebase.firestore().collection('nfe_notas').where('uid', '==', uid).orderBy('criadoEm', 'desc').limit(1).get();
                if (!ultimaNota.empty) {
                    userUF = ultimaNota.docs[0].data().uf;
                }
            } catch (e) {
                console.warn("Não foi possivel determinar a regiao do usuario. Mostrando ofertas gerais.");
            }

            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - 30);
            const tsLimite = firebase.firestore.Timestamp.fromDate(dataLimite);

            let query = firebase.firestore().collection('nfe_itens')
                .where('criadoEm', '>=', tsLimite);
                
            if (userUF) {
                query = query.where('uf', '==', userUF);
            }
            
            query = query.orderBy('criadoEm', 'desc').limit(20);

            const snap = await query.get();

            if (snap.empty) {
                achadosList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Nenhum achado recente${userUF ? ` em ${userUF}` : ' na comunidade'}.</p>`;
                return;
            }

            let html = '';
            snap.forEach(doc => {
                const item = doc.data();
                const d = item.criadoEm ? new Date(item.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : '';
                html += `
                    <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #3b82f6;">
                        <div style="flex: 1; overflow: hidden; padding-right: 10px;">
                            <div style="font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nomeProduto}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${d} | Cat: ${item.categoria} ${item.uf ? `| ${item.uf}` : ''}</div>
                        </div>
                        <div style="font-weight: bold; color: #10b981; white-space: nowrap;">R$ ${item.valorUnitario.toFixed(2).replace('.',',')}</div>
                    </div>
                `;
            });
            achadosList.innerHTML = html;

        } catch (e) {
            console.error('Erro ao carregar achados', e);
            achadosList.innerHTML = '<p style="color: #ef4444; font-size: 0.9rem; text-align: center;">Para exibir os Achados, crie o índice no Firebase (criadoEm DESC e uf).</p>';
        }
    }

    async function init() {
        if (!firebase.auth().currentUser) {
            setTimeout(init, 1000);
            return;
        }
        await carregarSaldoENotas();
        await carregarAchados();
    }

    return { init };
})();
