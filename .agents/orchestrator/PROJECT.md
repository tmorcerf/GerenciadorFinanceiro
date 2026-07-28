# Project: Conversational AI Categorizer & Rules System (Grill-Me)

## Architecture
- **Tech Stack**: Vanilla JavaScript (ES6+), HTML5 Glassmorphic UI, BaaS (Firebase Cloud Firestore + IndexedDB).
- **AI Categorization Engine**: `ia_categorizador.js` & `ia_core.js`.
- **Import Screen UI & Handler**: `importacao.html` & `importacao.js`.
- **Database & Personal Rules**: `db.js` & Firebase collection `RegrasIA` (keyed by `groupId`).
- **State Store Layer**: Reactive `StoreManager` class (`store.js`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Transfer Reconciliation | Double-entry transfers, pending destinations, Central visual UI | none | DONE |
| 5 | Exploration (Phase 0) | Analyze `ia_categorizador.js`, `importacao.js`/`html`, `db.js` structure & existing prompts | none | DONE |
| 6 | R1 Dual-Status AI Backend | Update `ia_categorizador.js` for hybrid JSON output (`"certeza"` vs `"duvida"`) and question generation | M5 | DONE |
| 7 | R2 Interactive Chat UI | Add chat side-panel/modal in `importacao.html`/`importacao.js`, sequential pause & response buttons/text | M6 | DONE |
| 8 | R3 Continuous Learning & Rules | Save learned rules to `RegrasIA` in Firebase (`groupId`), inject into future AI prompts | M7 | DONE |
| 9 | E2E & Integrity Verification | Fix `CHALLENGE_91_05` in `importacao.js` (render table on initial queue entry), verify 119/119 tests pass | M8 | IN_PROGRESS |

## Interface Contracts

### 1. Hybrid AI Categorizer Output Schema (`ia_categorizador.js`)
```json
{
  "status": "certeza" | "duvida",
  "categoria": "Alimentação",       // present in both, best guess for duvida
  "subcategoria": "Restaurante",    // present in both, best guess for duvida
  "confianca": 0.95,               // numerical certainty score (>= 0.80 certainty, < 0.80 duvida)
  "pergunta": "Você comprou refeição no Restaurante X ou foi compra corporativa?", // present when status is "duvida"
  "opcoes_sugeridas": ["Refeição", "Corporativo", "Outro"] // suggested response buttons for "duvida"
}
```

### 2. RegrasIA Document Schema (`RegrasIA` collection in `db.js`)
```json
{
  "id": "rule_1721800000_123",
  "groupId": "user_group_id",
  "descricao_padrao": "RESTAURANTE X", // normalized merchant/description match pattern
  "categoria": "Alimentação",
  "subcategoria": "Restaurante",
  "pergunta_original": "...",
  "resposta_usuario": "...",
  "criado_em": "2026-07-27T22:36:35Z"
}
```

### 3. Prompt Injection Protocol (R3)
- Before querying the LLM / AI categorizer:
  - Fetch active `RegrasIA` documents for the current `groupId`.
  - Format rules as system instructions / context block `[REGRAS APRENDIDAS DO USUÁRIO]` injected into `ia_categorizador.js` prompt.
  - If a transaction description matches an existing rule in `RegrasIA`, apply the rule directly or prioritize rule certainty so AI does not ask twice.

## Code Layout
- `c:/Corta Gastos/App/ia_categorizador.js` — Core AI categorization logic & prompt builder.
- `c:/Corta Gastos/App/importacao.js` — Import screen workflow controller & statement parser.
- `c:/Corta Gastos/App/importacao.html` — Import screen view with statement table and chat UI side-panel/modal.
- `c:/Corta Gastos/App/db.js` — Database sync layer & Firebase `RegrasIA` CRUD functions.
- `c:/Corta Gastos/App/tests/` — Test runner & test scripts.
