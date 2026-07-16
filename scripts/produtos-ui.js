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
            
            // Handle descriptions
            let descFinal = p.descricao_oficial;
            let badge = '';

            if (!descFinal) {
                if (p.descricao_ia) {
                    descFinal = p.descricao_ia;
                    badge = '<span style="background:var(--color-primary); color:#000; font-size:0.6rem; padding: 2px 6px; border-radius:10px; margin-left: 8px; font-weight:bold;">Gerado por IA</span>';
                } else {
                    descFinal = '<span style="color:var(--color-warning);font-size:0.8rem;"><i class="fas fa-exclamation-triangle"></i> Não Encontrado</span>';
                }
            }
            
            const descSefaz = p.descricao_sefaz || p.descricao_padrao || '-';

            tr.innerHTML = `
                <td style="padding: 1rem; color: var(--text-secondary); font-family: monospace;">${p.ean}</td>
                <td style="padding: 1rem; color: #fff; font-weight: 500;">
                    <div style="display:flex; align-items:center;">
                        <span id="desc-oficial-txt-${p.id}">${descFinal}</span>
                        ${badge}
                    </div>
                </td>
                <td style="padding: 1rem; color: var(--text-muted); font-size: 0.9rem;">${descSefaz}</td>
                <td style="padding: 1rem; color: var(--color-success); font-weight: 600;">${priceStr}</td>
                <td style="padding: 1rem;">
                    <button class="btn-icon" title="Editar Nome" onclick="window.ProdutosApp.editName('${p.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async editName(id) {
        const prod = this.produtos.find(p => p.id === id);
        if (!prod) return;
        
        const currentName = prod.descricao_oficial || prod.descricao_sefaz || prod.descricao_padrao || '';
        const newName = prompt(`Editar nome oficial para o EAN ${prod.ean}:`, currentName);
        
        if (newName !== null && newName.trim() !== '') {
            try {
                await window.DB.db.collection('Produtos').doc(id).update({
                    descricao_oficial: newName.trim(),
                    atualizado_em: new Date().toISOString()
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
}

// Bind to window so onclick works
window.addEventListener('DOMContentLoaded', () => {
    window.ProdutosApp = new ProdutosUI();
});
