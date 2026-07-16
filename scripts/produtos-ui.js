class ProdutosUI {
    constructor() {
        this.produtos = [];
        this.init();
    }

    init() {
        // Render when panel is shown
        document.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if(e.currentTarget.getAttribute('data-target') === 'panel-produtos') {
                    this.loadData();
                }
            });
        });
    }

    async loadData() {
        if (!window.DB || !window.appData || !window.appData.produtos) {
            console.warn("Produtos database not yet loaded.");
            return;
        }
        
        this.produtos = window.appData.produtos;
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('lista-produtos-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (this.produtos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum produto salvo ainda.</td></tr>`;
            return;
        }

        // Sort by date descending (assuming atualizado_em exists)
        const sorted = [...this.produtos].sort((a, b) => {
            return new Date(b.atualizado_em || 0) - new Date(a.atualizado_em || 0);
        });

        sorted.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            
            // Format price
            const price = parseFloat(p.ultimo_preco || 0);
            const priceStr = price > 0 ? `R$ ${price.toFixed(2)}` : '-';
            
            let descFinal = p.descricao_oficial || '<span style="color:var(--text-muted); font-style:italic;">Não preenchida</span>';
            const descIA = p.descricao_ia || '-';
            const descSefaz = p.descricao_sefaz || p.descricao_padrao || '-';
            
            // Novos campos do Gemini em colunas separadas
            const marca = p.marca_fabricante ? `<span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;"><i class="fas fa-industry"></i> ${p.marca_fabricante}</span>` : '-';
            const categoria = p.categoria ? `<span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;"><i class="fas fa-tag"></i> ${p.categoria}</span>` : '-';
            const volume = p.volume_quantidade ? `<span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;"><i class="fas fa-balance-scale"></i> ${p.volume_quantidade}${p.unidade_medida || ''}</span>` : '-';

            tr.innerHTML = `
                <td style="padding: 1rem; color: var(--text-secondary); font-family: monospace;">${p.ean}</td>
                <td style="padding: 1rem; color: #fff; font-weight: 500;">
                    <div style="display:flex; align-items:center;">
                        <span id="desc-oficial-txt-${p.id}">${descFinal}</span>
                    </div>
                </td>
                <td style="padding: 1rem; color: var(--color-primary); font-weight: 500;">${descIA}</td>
                <td style="padding: 1rem; color: var(--text-muted); font-size: 0.9rem;">${descSefaz}</td>
                <td style="padding: 1rem;">${marca}</td>
                <td style="padding: 1rem;">${categoria}</td>
                <td style="padding: 1rem;">${volume}</td>
                <td style="padding: 1rem; color: var(--color-success); font-weight: 600;">${priceStr}</td>
                <td style="padding: 1rem;">
                    <button class="btn-icon" title="Editar Nome Oficial" onclick="window.ProdutosApp.editName('${p.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;;
            tbody.appendChild(tr);
        });
    }

    async editName(id) {
        const prod = this.produtos.find(p => p.id === id);
        if (!prod) return;
        
        const currentName = prod.descricao_oficial || prod.descricao_ia || prod.descricao_sefaz || '';
        const newName = prompt(`Digite o novo nome oficial para o produto (${prod.ean}):`, currentName);
        
        if (newName !== null && newName.trim() !== '') {
            try {
                await window.DB.db.collection('Produtos').doc(id).update({
                    descricao_oficial: newName.trim(),
                    atualizado_em: new Date().toISOString(),
                    groupId: window.userGroupId,
                    userId: window.firebase.auth().currentUser.uid
                });
                
                // Update local state temporarily so it renders immediately
                prod.descricao_oficial = newName.trim();
                this.renderTable();
            } catch(e) {
                console.error("Erro ao atualizar nome:", e);
                alert("Erro ao salvar.");
            }
        }
    }

    async executarEnriquecimentoIA() {
        if (!window.GeminiService) {
            alert("O serviço do Gemini não está carregado.");
            return;
        }

        // Filtra os que não tem nem descrição oficial nem descrição IA
        const elegiveis = this.produtos.filter(p => !p.descricao_oficial && !p.descricao_ia);
        if (elegiveis.length === 0) {
            alert("Todos os produtos já possuem nomes enriquecidos!");
            return;
        }

        const confirmacao = confirm(`Existem ${elegiveis.length} produtos elegíveis para enriquecimento via IA. Deseja iniciar? Isso pode levar alguns segundos.`);
        if (!confirmacao) return;

        const btn = document.getElementById('btn-dev-ia');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            btn.disabled = true;
        }

        // Processar em lotes de 20
        const batchSize = 20;
        let processados = 0;

        for (let i = 0; i < elegiveis.length; i += batchSize) {
            const lote = elegiveis.slice(i, i + batchSize);
            const itensParaGemini = lote.map(p => ({ ean: p.ean, descricao: p.descricao_sefaz || p.descricao_padrao }));
            
            try {
                const resultados = await window.GeminiService.melhorarNomesEmLote(itensParaGemini);
                
                if (resultados && resultados.length > 0) {
                    const batch = window.DB.db.batch();
                    for (const res of resultados) {
                        if (!res.descricao_ia) continue;
                        
                        const prod = this.produtos.find(p => p.ean === res.ean);
                        if (prod) {
                            prod.descricao_ia = res.descricao_ia;
                            prod.marca_fabricante = res.marca_fabricante || '';
                            prod.categoria = res.categoria || '';
                            prod.volume_quantidade = res.volume_quantidade || '';
                            prod.unidade_medida = res.unidade_medida || '';

                            batch.update(window.DB.db.collection('Produtos').doc(prod.id), {
                                descricao_ia: prod.descricao_ia,
                                marca_fabricante: prod.marca_fabricante,
                                categoria: prod.categoria,
                                volume_quantidade: prod.volume_quantidade,
                                unidade_medida: prod.unidade_medida,
                                atualizado_em: new Date().toISOString(),
                                groupId: window.userGroupId,
                                userId: window.firebase.auth().currentUser.uid
                            });
                        }
                    }
                    
                    await batch.commit();
                }
                processados += lote.length;
                console.log(`[DevTool] Processados ${processados}/${elegiveis.length}`);
                
            } catch(e) {
                console.error("Erro no lote da IA:", e);
                alert("Erro ao processar lote na IA: " + e.message);
            }
        }
        
        if (btn) {
            btn.innerHTML = '🤖 Dev: Processar IA';
            btn.disabled = false;
        }
        alert("Enriquecimento concluído!");
        this.renderTable();
    }
}

// Bind to window so onclick works
window.addEventListener('DOMContentLoaded', () => {
    window.ProdutosApp = new ProdutosUI();
});
