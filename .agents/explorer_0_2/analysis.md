# Central de Conciliação & Frontend UI Architecture Analysis

**Agent ID**: `explorer_0_2`  
**Date**: 2026-07-24  
**Project**: Corta Gastos (`c:/Corta Gastos/App`)  
**Target Focus**: Frontend UI architecture, state stores, Central de Conciliação (transfer reconciliation), statement reconciliation ("Conciliação Contínua"), visual alerts, AI suggestions, and 1-click binding flows.

---

## 1. Executive Summary

The **Corta Gastos** frontend is a high-performance, responsive Single Page Application (SPA) built using modern **Vanilla JavaScript (ES Modules / Object-Oriented Event-Driven Managers)**, **HTML5**, and **CSS3 (Glassmorphism System)**, wrapped with **Capacitor (`@capacitor/core` v8)** for native Android and PWA execution. 

State management follows a reactive, custom event-driven architecture based on `StoreManager` (extending `EventTarget`), syncing real-time Firestore data across modular managers (`AccountManager`, `TransactionManager`, `CategoryManager`) into a legacy bridge store (`window.dadosFinanceiros`).

The **Central de Conciliação** features two main reconciliation subsystems:
1. **Transfer Reconciliation View (`#panel-transfer-reconciliation`)**: Interactive 2-column panel for pairing outbound/inbound transfers, enforcing global balance ($0.00$), rendering automatic AI match suggestions, and executing 1-click matching via Firestore batch updates (`transfer_match_id`).
2. **Continuous Statement Reconciliation ("Conciliação Contínua")**: Integrated into statement imports (`importacao.js`), enforcing mathematical initial/final balance verification, account anchor locking (`conciliado_ate`), 5-day temporal locking rules, and invoking **O Ninja Auditor (`window.IAConciliador`)** via Google Gemini API (`ia_core.js`).

---

## 2. Frontend File Map & Architecture Overview

### 2.1 File Map

```
c:/Corta Gastos/App/
├── index.html                  # Main SPA entry point; layout container for all dashboard panels & modals
├── app_v2.js                   # Main application coordinator, UI event handlers, reconciliation logic
├── store.js                    # Base reactive StoreManager class (EventTarget event emitter)
├── accounts.js                 # AccountManager store (Firebase 'Contas' listener & state emitter)
├── transactions.js             # TransactionManager store (Firebase 'Lancamentos' listener & state emitter)
├── categories.js               # CategoryManager store (Firebase 'Categorias' listener & state emitter)
├── db.js                       # Database abstraction layer (Firestore batch operations & onSnapshot cache)
├── importacao.js               # Bank statement parser (OFX, PDF, Excel) & continuous reconciliation engine
├── ia_core.js                  # Central AI layer (Gemini REST client with automatic retry & fallback)
├── ia_conciliador.js           # "O Ninja Auditor" AI reconciliation model (Gemini Lite prompt & JSON parser)
├── style.css                   # Main CSS rules & Glassmorphic UI theme variables
├── mobile.css                  # Mobile responsive breakpoints and touch styling
├── capacitor.config.json       # Native build configuration for Capacitor mobile app
└── package.json                # Project dependencies (@capacitor/core, @capacitor-firebase/authentication)
```

### 2.2 Navigation & Panel SPA Routing

Navigation is controlled in `index.html` via `.nav-item[data-target]` elements. Panel visibility is toggled by `app_v2.js` by toggling `.active` on `.dashboard-panel` containers:

| Panel ID | Menu Title | Icon | Role |
|---|---|---|---|
| `#panel-overview` | Visão Geral | `fa-home` | KPI balance cards, net worth, monthly expense breakdown |
| `#panel-accounts` | Minhas Contas | `fa-wallet` | Account management, balance locks (`conciliado_ate`), initial balances |
| `#panel-credit-cards` | Cartões de Crédito | `fa-credit-card` | Credit card invoice management & payment tracking |
| `#panel-investments` | Investimentos | `fa-chart-line` | Investment portfolio tracking |
| `#panel-transactions` | Lançamentos | `fa-list` | Transaction table, searching, inline editing, modal triggers |
| `#panel-transfer-reconciliation` | **Conciliar Transferencias** | `fa-link` | **Central de Conciliação for Transfers** |
| `#panel-ofertas` | Busca Ofertas | `fa-coins` | Corta Coins reward system |
| `#panel-settings` | Configurações | `fa-cog` | User group management, Firebase sync status, system settings |

---

## 3. State Management Architecture

The application uses an event-driven reactive state store pattern that bridges live Firebase Firestore feeds with local UI components.

```
+-----------------------------------------------------------------------+
|                         Firebase Firestore                            |
+-----------------------------------------------------------------------+
        | doc.onSnapshot()                               | doc.onSnapshot()
        v                                                v
+-----------------------+                        +----------------------+
|    AccountManager     |                        |  TransactionManager  |
|  (inherits StoreMgr)  |                        | (inherits StoreMgr)  |
+-----------------------+                        +----------------------+
        | fires 'account_state_changed'                  | fires 'transaction_state_changed'
        v                                                v
+-----------------------------------------------------------------------+
|                    window.dadosFinanceiros                            |
|        { contas: [...], lancamentos: [...], categoriasDict: {...} }    |
+-----------------------------------------------------------------------+
        |                                                |
        v                                                v
+-----------------------------------------------------------------------+
|                      UI Rendering Pipeline                            |
|   (renderAccounts(), renderTransactions(), renderTransferReconciliation())|
+-----------------------------------------------------------------------+
```

### 3.1 StoreManager (`store.js`)
- **Base Class**: Extends `EventTarget`.
- **Contract**:
  - `listen(groupId)`: Subscribes to `window.firebaseDB.collection(collectionName).where('groupId', '==', groupId)`.
  - `onSnapshot` handler: Updates `this.data`, syncs `window.dadosFinanceiros[legacyKey] = this.data`, calls `onDataUpdated()`, and dispatches `CustomEvent(eventName, { detail: this.data })` on `window`.

### 3.2 Component Managers
- **`AccountManager` (`accounts.js`)**: Collection `'Contas'`, legacy key `'contas'`, event `'account_state_changed'`. Enforces lock rule: prevents editing `saldo_inicial` if `conciliado_ate` is present.
- **`TransactionManager` (`transactions.js`)**: Collection `'Lancamentos'`, legacy key `'lancamentos'`, event `'transaction_state_changed'`. Provides `createTransaction`, `updateTransaction`, `deleteTransaction`.
- **`CategoryManager` (`categories.js`)**: Collection `'Categorias'`, event `'category_state_changed'`. Dynamically appends `"Transferencia"` with account names as subcategories.

---

## 4. Central de Conciliação: Transfer Reconciliation View

### 4.1 UI Layout (`index.html`, lines 996–1049)

The Transfer Reconciliation panel `#panel-transfer-reconciliation` contains:
1. **Header & Context Summary**: Explains that global transfer sum must balance to **R$ 0,00**.
2. **Global KPI Balance Card**:
   - Balance display: `<div id="transfer-global-balance">` (Target: `R$ 0,00`).
   - Status text: `<p id="transfer-global-status">` ("Perfeitamente equilibrado" or "Desequilíbrio! Há transferências não lançadas.").
3. **2-Column Pending List Grid**:
   - **Outbound Column (`#transfer-left-list`)**: "Saídas Órfãs" (transfers with amount < 0). Left border `--color-expense` (red).
   - **Inbound Column (`#transfer-right-list`)**: "Entradas Órfãs" (transfers with amount > 0). Left border `--color-income` (green).
4. **History Collapsible Card (`#transfer-history-content`)**: Shows past matched pairs (`historyPairs`) grouped by `transfer_match_id`.

### 4.2 Data Processing & Rendering Logic (`app_v2.js`, lines 7333–7434)

When `window.renderTransferReconciliation()` is invoked:
1. It queries `window.dadosFinanceiros.lancamentos`.
2. Filters for transactions where `categoria` or `subcategoria` includes `'transfer'`.
3. Splits transactions:
   - If `t.transfer_match_id` exists $\rightarrow$ push to `historyPairs`.
   - Else if `val < 0` $\rightarrow$ push to `pendingLeft`.
   - Else if `val > 0` $\rightarrow$ push to `pendingRight`.
4. Updates `#transfer-global-balance` with $\sum \text{valor}$.
5. **AI / Automatic Match Suggestion Engine**:
   ```javascript
   const suggestions = {};
   pendingLeft.forEach(l => {
       const valL = Math.abs(parseFloat(l.valor) || 0);
       pendingRight.forEach(r => {
           const valR = parseFloat(r.valor) || 0;
           if(Math.abs(valL - valR) < 0.01) {
               suggestions[l.cod] = r.cod;
               suggestions[r.cod] = l.cod;
           }
       });
   });
   ```
6. **Card Generation**: If `suggestions[t.cod]` exists, adds class `match-suggestion-banner` and magic badge `<i class="fas fa-magic"></i> Sugestão`.

### 4.3 Interactive 1-Click Reconciliation Binding (`app_v2.js`, lines 7436–7498)

```
[User Clicks Card 1 (Outbound)] ──> window.selectedTransferMatch = cod1
                                   Adds blue border: 2px solid var(--accent-blue)
                                          │
                                          v
[User Clicks Card 2 (Inbound)]  ──> Checks:
                                   1. cod1 != cod2
                                   2. 1 Outbound (val < 0) & 1 Inbound (val > 0)
                                   3. Math.abs(val1) === Math.abs(val2)
                                          │
                                          v
[Confirmation Prompt]           ──> confirm("Vincular transferência de R$ ... entre ContaA e ContaB?")
                                          │
                                          v
[window.linkTransfers(cod1, cod2)] ─> Firestore Batch Update:
                                      batch.update(doc1, { transfer_match_id: matchId })
                                      batch.update(doc2, { transfer_match_id: matchId })
                                      batch.commit()
                                          │
                                          v
[UI Refresh]                    ──> Updates local memory & calls renderTransferReconciliation()
```

---

## 5. Statement Import & Continuous Reconciliation ("Conciliação Contínua")

### 5.1 Import Engine & Balance Anchor Verification (`importacao.js`, lines 777–984)

During bank statement import (OFX, PDF, Excel), `importacao.js` executes continuous mathematical audit:
1. **Initial & Final Balance Parsing**: Extracts `extSaldoIni` and `extSaldoFim`.
2. **Mathematical Validation**: Calculates $\sum \text{extrato}$. Validates if $|\text{extSaldoIni} + \sum \text{extrato} - \text{extSaldoFim}| \le 0.05$.
3. **Anchor & Retroactive Encaixe Logic**:
   - If account already has `conciliado_desde` and `saldo_inicial`, checks if imported statement is prior (retroactive import).
   - Validates if $|\text{extSaldoFim} - \text{saldoInicialAncora}| \le 0.05$.
   - If match succeeds $\rightarrow$ "Encaixe Retroativo Perfeito".
   - If match fails $\rightarrow$ "Falha no Encaixe Retroativo" (Blocks import to preserve accounting integrity).
4. **Temporal Lock Rule (5-Day Rule)**:
   - Official closing (`isFechamentoOficial`) occurs starting on the **5th of the following month**.
   - Prior to day 5, status is "Sincronização Parcial" (manual edits permitted).
   - After day 5, status becomes "Fechamento Oficial" (locks account edits prior to `perFim`).

### 5.2 "O Ninja Auditor" AI Reconciliation Module (`ia_conciliador.js`)

`window.IAConciliador.conciliar(opts)` integrates Google Gemini AI (`ia_core.js` using `gemini-3.1-flash-lite`):

- **Input Payload**:
  - `mathSummary`: Mathematical delta summary.
  - `extractedTransactions`: Unmatched bank statement transactions (`faltantes`).
  - `manualPendingTransactions`: Unmatched manual user records (`sobrando`).
- **AI Output Format (JSON)**:
  ```json
  {
    "status": "success",
    "analise_ia": "Raciocínio de auditoria...",
    "sugestoes_juncao": [
      { "id_manual": "MANUAL_ID", "id_extraida": "EXTRAIDA_COD", "confianca": 0.95 }
    ],
    "alertas": [
      "Aviso: Há uma diferença de R$ 20,00. O lançamento X parece estar duplicado."
    ]
  }
  ```
- **UI Action**:
  - If `alertas` are returned, renders visual warning boxes (`alertaConciliacao`).
  - If `sugestoes_juncao` are returned, automatically pairs statement transaction with manual entry (`extItem.planilha = manItem`), moving them to `dadosSincronizacao.juncoes`.

---

## 6. Detailed Component API & Event Specifications

### 6.1 State Store Contracts

| Store Name | Class | Main Methods | Events Dispatched |
|---|---|---|---|
| Accounts Store | `AccountManager` (`accounts.js`) | `checkAndCreateAccount()`, `createAccount()`, `updateAccount()`, `deleteAccount()` | `account_state_changed` |
| Transactions Store | `TransactionManager` (`transactions.js`) | `createTransaction()`, `updateTransaction()`, `deleteTransaction()` | `transaction_state_changed` |
| Categories Store | `CategoryManager` (`categories.js`) | `checkAndCreateCategory()`, `saveCategory()`, `updateLimit()`, `replaceAllCategories()` | `category_state_changed` |

### 6.2 Reconciliation Function Signatures

| Function | File | Signature | Purpose |
|---|---|---|---|
| `renderTransferReconciliation` | `app_v2.js` | `window.renderTransferReconciliation()` | Scans `dadosFinanceiros.lancamentos`, computes global balance, finds match suggestions, renders left/right pending lists and history. |
| `selectTransferForMatch` | `app_v2.js` | `window.selectTransferForMatch(cod: string)` | Toggles selection state `window.selectedTransferMatch` or triggers pairing attempt between two selected transfer cards. |
| `linkTransfers` | `app_v2.js` | `window.linkTransfers(cod1: string, cod2: string)` | Executes Firestore batch write to store `transfer_match_id` on both transfer documents. |
| `IAConciliador.conciliar` | `ia_conciliador.js` | `window.IAConciliador.conciliar(opts: Object)` | Sends mathematical summary and pending transactions to Gemini AI to generate audit insights, alerts, and merge suggestions. |

---

## 7. Recommendations & Enhancement Proposals

1. **Unified Central de Conciliação Hub**:
   - Merge the Transfer Reconciliation View (`#panel-transfer-reconciliation`) and Statement Reconciliation View (`#conferencia-saldo-container`) into a single top-level tab titled **Central de Conciliação** with sub-tabs:
     - *Sub-tab 1*: Conciliação de Transferências (Transfer pairing & orphan management).
     - *Sub-tab 2*: Conciliação de Extratos (Bank statement continuous auditing & locks).
     - *Sub-tab 3*: Auditoria IA (Ninja Auditor recommendations & manual/statement merge review).

2. **Unmatch / Desconciliar Action for Transfers**:
   - Add a 1-click **Desconciliar** button inside the transfer history cards (`#transfer-history-content`) to allow users to un-pair mislinked transfer pairs by resetting `transfer_match_id` to `null` via Firestore batch update.

3. **Enhanced AI Suggestion Review Card**:
   - For transfer pairs and statement merges identified by `IAConciliador` or amount matching, render a dedicated **"Sugestão da IA (1-Clique Aceitar)"** action card highlighting the confidence score (e.g. `95% de Confiança`) with immediate accept/reject action buttons.

4. **Filters & Date Range Selector for Reconciliation**:
   - Add account and date-range filters to `#panel-transfer-reconciliation` so users with high transaction volumes can isolate orphan transfers by account or date range.

---
*Report compiled by `explorer_0_2` for `Corta Gastos` Central de Conciliação investigation.*
