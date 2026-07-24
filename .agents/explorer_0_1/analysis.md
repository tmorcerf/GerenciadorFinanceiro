# Comprehensive Analysis of Corta Gastos Backend Architecture & Transfer Pipeline

**Author**: Backend Codebase Explorer (`explorer_0_1`)  
**Date**: 2026-07-24  
**Target Directory**: `c:/Corta Gastos/App`  
**Working Directory**: `c:/Corta Gastos/App/.agents/explorer_0_1`  

---

## Executive Summary

The **Corta Gastos** backend is built as a **Serverless / BaaS (Backend-as-a-Service)** application. It uses **Google Firebase Cloud Firestore** for persistent data storage and real-time document synchronization via offline IndexedDB caching (`onSnapshot`). The web frontend is implemented in Vanilla JavaScript (ES6+), bundled for native Android deployment via **Capacitor** (`@capacitor/core`).

Transactions of category `'Transferência'` (or `'TRANSFERENCIA'`) represent internal movements between accounts, credit card invoice payments, or investments. Transfer subcategories are dynamically wired to existing account names (`contas.map(c => c.nome)`). Dual-entry transfer counterparty logic (Regra 1 - R1) and missing/provisional destination logic (Regra 2 - R2) are currently handled in the multi-step import review wizard (`app_v2.js` Step 4) and account auto-creation routines (`db.js`).

---

## 1. Architecture, Data Models, Database Schemas & State Management

### 1.1 Architecture & Tech Stack
- **BaaS Layer**: Firebase Cloud Firestore (`window.firebaseDB`).
- **Client Runtime**: Mobile (Capacitor Android wrapper) and Web SPA.
- **State Management**: Reactive custom `StoreManager` class (`store.js`) extending native `EventTarget`.
- **Legacy State Bridge**: `window.dadosFinanceiros` object containing arrays `{ lancamentos, contas, auditoria, orcamentos, extratos, categoriasDict }`.

### 1.2 Data Schemas (Firestore Collections)

#### Collection: `Lancamentos` (Transactions)
*File reference: `db.js` lines 88-154, `transactions.js` lines 1-30*

| Field Name | Type | Description |
|---|---|---|
| `groupId` | `string` | Multi-tenant user group identifier (e.g. `"gid_123"`) |
| `cod` | `string` | Unique transaction code (e.g. `"658.0"` or `"TX_1721800000_123"`) |
| `data` | `string` | Transaction date in Brazilian format (`"DD/MM/YYYY"`) |
| `vencimento` | `string` | Maturity/Due date (`"DD/MM/YYYY"` or `""`) |
| `descricao` / `obs` | `string` | Transaction memo/description |
| `conta` | `string` | Primary account name (e.g. `"BB"`, `"Sicredi"`, `"Sicoob"`) |
| `valor` | `number` | Transaction value (negative for expenses/outflows, positive for income/inflows) |
| `categoria` | `string` | Category name (e.g. `"Transferência"`, `"Alimentação"`, `"Saúde"`) |
| `subcategoria` | `string` | Subcategory name OR counterparty account name for transfers (e.g. `"Sicoob"`, `"Débito (para saídas/saques/aportes)"`) |
| `parcelamento` | `string` | Installment info (e.g. `"(01/03)"` or `""`) |
| `criado_em` | `string` | ISO 8601 creation timestamp |
| `conciliado` | `boolean` | Flag indicating if transaction is matched with bank statement (`Extratos`) |
| `extrato_id` | `string \| null` | Document ID of the associated `Extratos` record |
| `transfer_match_id` | `string \| null` | Unique match ID linking two legs of a transfer (e.g. `"match_1721800000_456"`) |

#### Collection: `Contas` (Financial Accounts)
*File reference: `db.js` lines 104-126, 421-467; `accounts.js` lines 1-58*

| Field Name | Type | Description |
|---|---|---|
| `groupId` | `string` | Multi-tenant group ID |
| `nome` | `string` | Unique account name (e.g. `"BB"`, `"Sicredi Mastercard"`, `"Carteira"`) |
| `instituicao` / `banco` | `string` | Bank institution name (e.g. `"Banco do Brasil"`, `"Sicoob"`) |
| `tipo` | `string` | Account type (`"Corrente"`, `"Cartão de Crédito"`, `"Investimento"`, `"Dinheiro"`, `"Vale"`) |
| `saldo_inicial` | `number` | Anchor/starting balance |
| `saldo` | `number` | Current computed balance |
| `cor` | `string` | UI accent color (e.g. `"#3b82f6"`) |
| `ignorar_dashboard` | `boolean` | Flag to exclude account totals from main dashboard |
| `conciliado_ate` | `string` | Latest bank statement closed date (`"DD/MM/YYYY"`) |
| `conciliado_desde` | `string` | Earliest closed date (`"DD/MM/YYYY"`) |
| `ultimo_mes_fechado` | `string` | Last validated month closing date |
| `criado_automaticamente` | `boolean` | Set to `true` if account was auto-created during transfer processing |

#### Collection: `Categorias` (Categories)
*File reference: `db.js` lines 394-419; `categories.js` lines 1-96*

| Field Name | Type | Description |
|---|---|---|
| `groupId` | `string` | Multi-tenant group ID |
| `nome` | `string` | Category name (e.g. `"Alimentação"`, `"Saúde"`, `"Transferencia"`) |
| `subcategorias` | `string[]` | Array of subcategory names |
| `limit` | `number \| undefined` | Optional monthly budget limit |

*Note*: In `CategoryManager.rebuildCategoriasDict()` (`categories.js` lines 16-19), subcategories of category `"Transferencia"` are dynamically generated from available accounts:
```javascript
const contas = window.accountManager ? window.accountManager.data : [];
dict["Transferencia"] = contas.map(c => c.nome);
```

#### Collection: `Extratos` (Bank Statements)
*File reference: `db.js` lines 73-82, 288-371*

| Field Name | Type | Description |
|---|---|---|
| `groupId` | `string` | Multi-tenant group ID |
| `conta` | `string` | Target account name |
| `banco` | `string` | Bank name |
| `periodo_inicio` | `string` | Period start date (`"DD/MM/YYYY"`) |
| `periodo_fim` | `string` | Period end date (`"DD/MM/YYYY"`) |
| `saldo_inicial` | `number` | Statement starting balance |
| `saldo_final` | `number` | Statement ending balance |
| `soma_lancamentos` | `number` | Sum of matched transactions |
| `diferenca` | `number` | Divergence amount |
| `status` | `string` | `"conciliado"`, `"divergente"`, or `"aberto"` |
| `importado_em` | `string` | ISO timestamp |
| `importado_por` | `string` | Firebase Auth UID |

---

## 2. 'TRANSFERENCIA' Classification, Storage, Import & Update Pipeline

```
[ Bank Statement PDF/OFX/CSV ]
           │
           ▼
 [ ia_extrator / ia_categorizador ] ── (Recognizes 'Pix', 'TED', 'Transf', 'Pagamento Fatura')
           │
           ▼
 [ importacao.js Review Table ] ──── (Renders category selection & dropdowns)
           │
           ▼
 [ app_v2.js Step 4 Wizard ] ──────── (Splits transfer into Leg 1 [Outflow] & Leg 2 [Counterparty])
           │                          (Calls guessContraPartidaConta for smart pairing)
           ▼
 [ db.js sincronizarPeriodo ] ────── (Checks if destination account exists; if not, auto-creates account)
           │
           ▼
 [ Firestore 'Lancamentos' ] ──────── (Stores both legs with transfer_match_id linking them)
```

### 2.1 Classification Logic
1. **Rule Engine & Keyword Detection**: `ia_categorizador.js` (lines 57-60, 99-106) and `ia_extrator.js` detect keywords (`pix`, `ted`, `doc`, `transf`, `transferencia`, `pagamento de fatura`, `saque`, `aporte`, `resgate`).
2. **Category Matching**: If `categoria` includes `"transfer"` (case-insensitive) or matches `"Transferência"`, `"Transferencia"`, `"Investimentos"`, or `"Pagamento de Cartão"`, the transaction is classified as `isTransferCat` (`app_v2.js` line 916).

### 2.2 Import Wizard Pipeline (Step 4 of Wizard)
*File reference: `app_v2.js` lines 1038-1078, 1285-1303*

When importing statements:
1. `guessContraPartidaConta(contaOriginal)` inspects the primary account type. If it is a credit card, it finds the primary checking account of the same institution (`instituicao`).
2. Two leg transactions are generated in `window.transacoesProcessadasStep4`:
   - **Leg 1 (Original Outflow/Inflow)**:
     - `conta`: Original Account (e.g. `"BB"`)
     - `valor`: Original Value (e.g. `-1219.97`)
     - `categoria`: `"Transferência"`
     - `subcategoria`: Counterparty Account (e.g. `"Mercado Pago Visa"`)
   - **Leg 2 (Counterparty Inflow/Outflow)**:
     - `conta`: Counterparty Account (e.g. `"Mercado Pago Visa"`)
     - `valor`: Inverted Value (`-1 * original valor`, e.g. `+1219.97`)
     - `descricao`: `"Contra-partida: " + original description`
     - `categoria`: `"Transferência"`
     - `subcategoria`: Original Account (e.g. `"BB"`)

3. **Auto-Creation of Unknown Accounts**:
   In `db.js` (`sincronizarPeriodo()`, lines 132-135):
   ```javascript
   const catLower = (lanc.categoria || '').toLowerCase();
   if (catLower.includes('transfer') || (lanc.subcategoria || '').toLowerCase().includes('transfer')) {
       checkAndCreateAccount(lanc.subcategoria);
   }
   ```
   If the counterparty account specified in `subcategoria` does not exist in `dadosFinanceiros.contas`, Firestore creates a new provisional account (`Contas` doc with `tipo: 'Conta Corrente'`, `saldo_inicial: 0`, `criado_automaticamente: true`).

4. **Saving and Match ID Linking**:
   When finalizing step 4 (`app_v2.js` lines 1285-1303), consecutive original and counterparty legs are saved together, ensuring subcategories point to each other.

### 2.3 Standalone Transfer Reconciliation Module
*File reference: `app_v2.js` lines 7281-7490*

- **Function `window.renderTransferReconciliation()`**:
  - Scans `window.dadosFinanceiros.lancamentos` for transactions where `categoria` or `subcategoria` contains `'transfer'`.
  - Filters into `pendingLeft` (outflows, `valor < 0`) and `pendingRight` (inflows, `valor > 0`), skipping those with an existing `transfer_match_id`.
  - Computes global transfer audit balance (`sumGlobal`). If `sumGlobal === 0`, displays "Perfeitamente equilibrado".
  - **Smart Matcher**: Matches pending left/right pairs where `Math.abs(valL) === Math.abs(valR)`.
- **Function `window.linkTransfers(cod1, cod2)`**:
  - Generates a unique `matchId` (`"match_" + timestamp + random`).
  - Executes a Firestore batch update to add `transfer_match_id: matchId` to both transaction documents in `Lancamentos`.

---

## 3. Double-Entry Counterparty Logic (R1) & Missing Destination Logic (R2)

### 3.1 Mapping & Hook Analysis

#### Regra 1 (R1): Double-Entry Counterparty Logic
- **Definition**: Every internal transfer between Account A and Account B must result in two linked transaction records:
  - Record A: `conta = A`, `subcategoria = B`, `valor = -X`, `transfer_match_id = M`
  - Record B: `conta = B`, `subcategoria = A`, `valor = +X`, `transfer_match_id = M`
- **Current Hooks**:
  - `app_v2.js` lines 1052-1078 (Import Step 4 Wizard).
  - `app_v2.js` lines 7465-7489 (`window.linkTransfers` manual linking).
- **Gaps / Disconnects**:
  - If a user manually creates a transaction with category `"Transferência"` via `TransactionManager.createTransaction()`, R1 double-entry is **NOT** automatically enforced or auto-created in `transactions.js` or `db.js`.
  - Single-transaction insertion bypasses `transfer_match_id` generation.

#### Regra 2 (R2): Missing Destination Logic (Provisional / Fallback Handling)
- **Definition**: When a transfer transaction does not specify a valid target account (or specifies an external entity like ATM/withdrawal):
  - `subcategoria` fallback: Generic subcategory (e.g. `"Débito (para saídas/saques/aportes)"` or `"Crédito (para entradas/contrapartidas)"`).
  - Account fallback: Auto-create a provisional account (e.g. `"Conta Provisória Nubank"`) if a new bank name is mentioned.
- **Current Hooks**:
  - `db.js` line 133 (`checkAndCreateAccount(lanc.subcategoria)`).
  - `app_v2.js` line 7283 (`window.createNewProvisionalAccount(selectId)`).

### 3.2 Recommended Hook Locations for R1 & R2 Implementation

1. **Primary Backend Data-Layer Hook**: `c:/Corta Gastos/App/transactions.js` -> `TransactionManager.createTransaction(payload)`
   - *Rationale*: Centralizing R1 and R2 inside `TransactionManager` ensures that whether transactions are created manually, imported via CSV/OFX, or submitted via API/mobile, double-entry counterparty creation (R1) and provisional account assignment (R2) are guaranteed atomically.
   - *Logic Flow*:
     ```javascript
     // Pseudocode Hook inside TransactionManager.createTransaction(payload)
     if (isTransferCategory(payload.categoria)) {
       if (hasValidDestinationAccount(payload.subcategoria)) {
         // Apply R1: Create paired leg with inverted value and shared transfer_match_id
       } else {
         // Apply R2: Assign fallback generic subcategory or auto-create provisional account
       }
     }
     ```

2. **Batch Import Hook**: `c:/Corta Gastos/App/db.js` -> `Database.sincronizarPeriodo()`
   - *Rationale*: When batch importing bank statements, ensure counterparty legs and `transfer_match_id` fields are generated in the Firestore batch write.

---

## 4. Exact File Paths, Code References & Function Signatures

| File Path | Component / Object | Key Function Signatures / Responsibilities |
|---|---|---|
| `c:/Corta Gastos/App/db.js` | `Database` class | `loadAllData()` <br> `sincronizarPeriodo(lancamentosNovos, idsParaExcluir, contaDoExtrato, dataMaxStr, extratoPayload, conciliacaoContinua, cortaCoinsAmount)` <br> `editarLancamento(cod, newData)` <br> `excluirLancamento(cod)` <br> `salvarConta(conta)` <br> `saveContaConfig(payload)` |
| `c:/Corta Gastos/App/store.js` | `StoreManager` class | `constructor(collectionName, legacyKey, eventName)` <br> `listen(groupId)` <br> `onDataUpdated()` <br> `waitForInitialLoad()` |
| `c:/Corta Gastos/App/transactions.js` | `TransactionManager` class | `createTransaction(payload)` <br> `updateTransaction(id, payload)` <br> `deleteTransaction(id)` |
| `c:/Corta Gastos/App/accounts.js` | `AccountManager` class | `checkAndCreateAccount(nome, tipo, saldo_inicial, conciliado_ate)` <br> `createAccount(payload)` <br> `updateAccount(id, payload)` <br> `deleteAccount(id)` |
| `c:/Corta Gastos/App/categories.js` | `CategoryManager` class | `rebuildCategoriasDict()` (Sets `dict["Transferencia"] = contas.map(c => c.nome)`) <br> `checkAndCreateCategory(nome)` <br> `saveCategory(nome, subcategoriasArray)` |
| `c:/Corta Gastos/App/importacao.js` | Import Renderer | `window.renderTabelaSincronizacao(dadosSincronizacao, contaDoExtrato)` |
| `c:/Corta Gastos/App/app_v2.js` | Core Application Logic | `window.saveTransactions(transacoes, idsExcluir)` <br> `guessContraPartidaConta(contaOriginal)` (line 1040) <br> `window.renderTransferReconciliation()` (line 7333) <br> `window.selectTransferForMatch(cod)` (line 7437) <br> `window.linkTransfers(cod1, cod2)` (line 7465) <br> `window.createNewProvisionalAccount(selectId)` (line 7283) |
| `c:/Corta Gastos/App/ia_categorizador.js` | AI Categorizer | `window.IACategorizador.categorizar(opts)` |
| `c:/Corta Gastos/App/dados.js` | Embedded Initial State | `window.dadosFinanceiros = { lancamentos: [], contas: [] }` |

---

## 5. Key Recommendations for Implementation Team

1. **Centralize R1 Double-Entry Enforcement in `transactions.js`**:
   Refactor `TransactionManager.createTransaction()` so that whenever a transaction has `categoria: "Transferência"`, it automatically creates both Leg A and Leg B with an generated `transfer_match_id`, avoiding orphan transfer transactions.

2. **Enhance Account Matching (R2) in `app_v2.js` / `importacao.js`**:
   Upgrade `guessContraPartidaConta()` to parse transfer memos for destination bank/account names (e.g. `"Pix enviado para Banco Itaú"` -> auto-select target account `"Itaú"`). If no account matches, route to standard fallback subcategory or trigger `createNewProvisionalAccount()`.

3. **Atomic Balance Updates & Audit Checks**:
   Ensure `renderTransferReconciliation()` global balance check (`sumGlobal === 0`) is integrated into post-import audit checks to immediately flag unlinked or asymmetric transfers.
