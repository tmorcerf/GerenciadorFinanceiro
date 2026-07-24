# Project: Transfer Reconciliation System

## Architecture
- **Tech Stack**: Vanilla JavaScript (ES6+), HTML5 Glassmorphic UI, BaaS (Firebase Cloud Firestore + IndexedDB), Capacitor Android wrapper.
- **State Store Layer**: Reactive `StoreManager` class (`store.js`) extending `EventTarget`, managing `Lancamentos`, `Contas`, `Categorias`, `Extratos`.
- **Backend Transfer Engine**: `TransactionManager` (`transactions.js`), `AccountManager` (`accounts.js`), `Database` (`db.js`).
- **Reconciliation UI Panel**: `#panel-transfer-reconciliation` (`index.html`, `app_v2.js`).
- **AI Audit System**: `IAConciliador` (`ia_conciliador.js`) & `IACore` (`ia_core.js`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Exploration | Analyze codebase architecture, data models, backend endpoints, and frontend components | none | DONE |
| 1 | R1 Counterparty Logic | Automatic double-entry debit/credit generation & pairing for `TRANSFERENCIA` transactions | M0 | DONE |
| 2 | R2 Pending Destinations | Mark transactions lacking destination as "Pendente de Destino" without creating physical accounts or altering balances | M1 | DONE |
| 3 | R3 Central Visual UI & AI | Central de Conciliação UI listing pending/conflict transfers, 1-click AI suggestions & gold-rule locked account protection | M2 | DONE |
| 4 | E2E & Integrity Audit | Pass 100% E2E test suite, Challenger verification, and Forensic Audit | M3 | DONE |

## Interface Contracts

### 1. Transfer Document Schema (`Lancamentos` collection)
```javascript
{
  cod: string,               // Unique ID, e.g. "TX_1721800000_123"
  data: string,              // "DD/MM/YYYY"
  descricao: string,         // e.g. "Transferência para Itaú"
  conta: string,             // Source account, e.g. "BB"
  valor: number,             // Negative for outflow (-X), positive for inflow (+X)
  categoria: string,         // "Transferência"
  subcategoria: string,      // Target account name OR "Pendente de Destino"
  pendente_destino: boolean, // true if destination is blank/unresolved
  transfer_match_id: string|null, // Unique match pairing ID, e.g. "match_1721800000_456"
  conciliado: boolean,       // Lock status (true if matched with bank statement)
  extrato_id: string|null    // Statement document ID if reconciled
}
```

### 2. Double-Entry Creation Protocol (R1)
- `createTransferPair(leg1)`:
  - Generates `Leg 1` (Original): `conta = A`, `subcategoria = B`, `valor = -X`, `transfer_match_id = matchId`, `pendente_destino = false`.
  - Generates `Leg 2` (Counterparty): `conta = B`, `subcategoria = A`, `valor = +X`, `transfer_match_id = matchId`, `pendente_destino = false`, `descricao = "Contra-partida: " + Leg1.descricao`.

### 3. Pending Destination Protocol (R2)
- If `subcategoria` is empty, null, or generic/unassigned:
  - Set `pendente_destino = true`.
  - Set `subcategoria = "Pendente de Destino"`.
  - DO NOT invoke `checkAndCreateAccount()` or create dummy accounts in `Contas`.
  - DO NOT affect balances of other physical accounts until destination is assigned and resolved.

### 4. Gold Rule Conflict Resolution (R3)
- If Account X has `conciliado_ate` set and transaction T_X on Account X has `conciliado = true`:
  - Transaction T_X is **Verdade Absoluta** (locked, immutable bank anchor).
  - T_X cannot be auto-modified or force-overwritten.
  - Conflicts with T_Y (on Account Y) are resolved by keeping T_X intact and suggesting/applying the correction on T_Y (Account Y).

## Code Layout
- `c:/Corta Gastos/App/transactions.js` — `TransactionManager`: Core transaction CRUD & transfer double-entry / pending hooks.
- `c:/Corta Gastos/App/db.js` — `Database`: Sync, batch writes, and statement reconciliation invalidation.
- `c:/Corta Gastos/App/accounts.js` — `AccountManager`: Account CRUD & `saldo_inicial` immutability lock.
- `c:/Corta Gastos/App/app_v2.js` — UI controller, Central de Conciliação panel rendering, `selectTransferForMatch`, `linkTransfers`.
- `c:/Corta Gastos/App/index.html` — `#panel-transfer-reconciliation` visual layout & components.
- `c:/Corta Gastos/App/ia_conciliador.js` — AI Conciliador ("O Ninja Auditor") for transfer suggestions.
- `c:/Corta Gastos/App/tests/` — Test runner & test suites (Unit, Integration, E2E, Stress).
