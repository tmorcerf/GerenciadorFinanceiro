# Handoff Report — Backend Architecture & Transfer Processing Investigation

**Author**: Backend Codebase Explorer (`explorer_0_1`)  
**Date**: 2026-07-24  
**Target Directory**: `c:/Corta Gastos/App`  
**Working Directory**: `c:/Corta Gastos/App/.agents/explorer_0_1`  

---

## 1. Observation

### System Architecture & Database Models
- **Database Access & Sync Layer**: `c:/Corta Gastos/App/db.js`
  - Uses Firebase Cloud Firestore with `window.firebaseDB` and real-time offline caching via `onSnapshot`:
    - Line 43-49: Loads Firestore collections `Orcamentos`, `Auditoria`, `Imports`, `Produtos`, `Extratos`.
    - Line 88-154: `sincronizarPeriodo()` writes batch updates to `Lancamentos` collection (`cod`, `data`, `descricao`, `conta`, `valor`, `categoria`, `subcategoria`, `parcelamento`, `vencimento`, `criado_em`, `conciliado`, `extrato_id`).
    - Line 133-135: Auto-creates missing accounts if transaction category/subcategory contains `'transfer'`:
      ```javascript
      if (catLower.includes('transfer') || (lanc.subcategoria || '').toLowerCase().includes('transfer')) {
          checkAndCreateAccount(lanc.subcategoria);
      }
      ```
- **State Management Models**: `c:/Corta Gastos/App/store.js`, `transactions.js`, `accounts.js`, `categories.js`
  - `StoreManager` (`store.js` line 1-60): Reactive store class bridging Firestore snapshots to `window.dadosFinanceiros`.
  - `TransactionManager` (`transactions.js` line 1-30): Handles single transaction CRUD (`Lancamentos` collection).
  - `AccountManager` (`accounts.js` line 1-58): Handles account CRUD (`Contas` collection).
  - `CategoryManager` (`categories.js` line 1-96): Manages categories. Line 18 dynamically populates transfer subcategories from accounts:
    ```javascript
    dict["Transferencia"] = contas.map(c => c.nome);
    ```

### Transfer Processing & Import Pipeline
- **Import Wizard Step 4 (Transfers & Counterparties)**: `c:/Corta Gastos/App/app_v2.js`
  - Line 916: Identifies transfer categories: `const isTransferCat = catAtual.toLowerCase().includes('transfer') || catAtual === 'Investimentos' || catAtual === 'Pagamento de Cartão';`
  - Line 1040-1050: `guessContraPartidaConta(contaOriginal)` checks if primary account is credit card and returns corresponding checking account from same institution.
  - Line 1059-1076: Generates paired transfer legs in `window.transacoesProcessadasStep4`: Leg 1 (`conta: t.conta`, `subcategoria: contraConta`, `valor: t.valor`) and Leg 2 (`conta: contraConta`, `subcategoria: t.conta`, `valor: -t.valor`, `descricao: "Contra-partida: " + t.descricao`).
  - Line 1285-1303: Finalizes transfers and writes counterparty links into `finalTransacoes`.

- **Transfer Reconciliation Module**: `c:/Corta Gastos/App/app_v2.js`
  - Line 7333-7434: `window.renderTransferReconciliation()` scans transactions for `'transfer'`, matches pending outflows and inflows, and verifies global transfer balance (`sumGlobal === 0`).
  - Line 7465-7489: `window.linkTransfers(cod1, cod2)` assigns a shared `transfer_match_id` (`"match_" + timestamp + random`) to both paired documents in Firestore `Lancamentos`.

---

## 2. Logic Chain

1. **BaaS Model Discovery**: Observations in `db.js` and `package.json` show there is no Node/Express or SQL server. The backend is client-side BaaS using Firebase Cloud Firestore with Capacitor Android packaging.
2. **Data Structure Resolution**: Observations in `db.js` (lines 88-154), `dados.js`, `transactions.js`, and `accounts.js` demonstrate that transactions (`Lancamentos`) and accounts (`Contas`) are flat Firestore documents. Transfers are represented as standard `Lancamentos` documents with `categoria: "Transferência"` (or `"Transferencia"`).
3. **Dynamic Transfer Subcategories**: Observations in `categories.js` (line 18) prove that subcategories for transfers are dynamically derived from `contas.map(c => c.nome)`. Thus, a transfer's `subcategoria` field directly holds the counterparty account name.
4. **Current R1 (Double-Entry) Implementation**: Observations in `app_v2.js` (lines 1052-1078, 1285-1303) show R1 counterparty generation is currently isolated to Step 4 of the statement import wizard and manual reconciliation (`linkTransfers`). Single manual transaction insertion via `TransactionManager.createTransaction()` does not enforce R1.
5. **Current R2 (Missing Destination) Implementation**: Observations in `db.js` (lines 132-135) and `app_v2.js` (line 7283) show R2 missing destination logic auto-creates provisional accounts in `Contas` or uses generic fallback subcategories (`"Débito (para saídas/saques/aportes)"`, `"Crédito (para entradas/contrapartidas)"`).

---

## 3. Caveats

- **Legacy Sample Data**: `dados.js` contains a large static sample payload (`window.dadosFinanceiros`) used during offline/development mode or initial load before Firebase Auth resolves.
- **Firebase Auth Dependency**: Multi-tenancy and data operations depend on `window.userGroupId` being set upon user authentication in `db.js`.
- **Testing Scope**: Investigation was conducted via read-only code analysis without executing runtime mutations against production Firebase Firestore database.

---

## 4. Conclusion

The Corta Gastos backend architecture and data models are thoroughly mapped. Transfers are stored in the Firestore `Lancamentos` collection, using `categoria: "Transferência"`, `subcategoria: <counterparty_account_name>`, and linked via `transfer_match_id`.

To fully enforce double-entry counterparty rules (R1) and missing destination handling (R2) across the entire application (imports, manual creation, and API), hooks must be placed at the data-layer level in `c:/Corta Gastos/App/transactions.js` (`TransactionManager.createTransaction`) and `c:/Corta Gastos/App/db.js` (`sincronizarPeriodo`).

---

## 5. Verification Method

1. **Inspect Data Models and Collections**:
   - Open `c:/Corta Gastos/App/db.js` lines 88-154 and 132-135 to verify `Lancamentos` document structure and auto-account creation.
   - Open `c:/Corta Gastos/App/categories.js` line 18 to verify dynamic mapping of `dict["Transferencia"]`.
2. **Inspect Transfer Pipelines**:
   - Open `c:/Corta Gastos/App/app_v2.js` lines 1038-1078 & 1285-1303 to trace Step 4 import counterparty logic.
   - Open `c:/Corta Gastos/App/app_v2.js` lines 7333-7489 to trace transfer reconciliation and `transfer_match_id` linking (`window.linkTransfers`).
3. **Report Artifact Verification**:
   - Confirm detailed findings in `c:/Corta Gastos/App/.agents/explorer_0_1/analysis.md`.
