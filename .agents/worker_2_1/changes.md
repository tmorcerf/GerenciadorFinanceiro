# Changes Log — Milestone 2 (R2: Tratamento de Destinos Pendentes)

## Summary of Modifications

### 1. `accounts.js`
- **Updated `checkAndCreateAccount()`**: Enforced strict checks to ignore blank, `null`, `'Pendente de Destino'`, `'Pendente'`, `'Unassigned'`, `'Desconhecido'`, `'Indefinido'`, and common generic category placeholders (`dinheiro`, `carteira`, `diversos`). Prevents auto-creation of dummy accounts in `Contas`.
- **Added `AccountManager.prototype.recalcularSaldo()`**: Implemented balance calculation logic that computes single or all account balances from active transaction lists without allowing unassigned or pending counterparty entries to alter secondary accounts.
- **Exported `AccountManager`**: Added CommonJS export (`module.exports = { AccountManager }`) for modular testing environment.

### 2. `transactions.js`
- **Updated `TransactionManager.prototype.createTransaction()`**: Enhanced pending transfer detection to inspect `subcategoria`. If empty, null, or generic (`Pendente de Destino`, `Unassigned`, etc.), sets `pendente_destino = true`, `subcategoria = 'Pendente de Destino'`, and `transfer_match_id = null`, saving as a single leg without creating counterparty entries.
- **Updated `TransactionManager.prototype.resolvePendingDestination()`**: Added document lookup fallback so pending transfers can be resolved smoothly in both live and test contexts.

### 3. `db.js`
- **Updated `Database.prototype.processDoubleEntryTransfers()`**: Added pending destination branch when `catIsTransfer` is true but `subcategoria` is pending/unassigned/blank. Sets `pendente_destino = true`, `subcategoria = 'Pendente de Destino'`, `transfer_match_id = null`, and pushes a single transaction leg without counterparty generation.
- **Updated `Database.prototype.sincronizarPeriodo()`**: Updated internal `checkAndCreateAccount` helper to skip dummy account creation for pending destination transfers and guaranteed `pendente_destino = true` and `subcategoria = 'Pendente de Destino'` attributes on saved Firestore batch records.

### 4. `app_v2.js`
- **Updated Inline Edit `checkAndCreateAccount`**: Ensured inline editing checks ignore pending destination strings.
- **Updated Step 4 Import Processing**: Handled transfers with unassigned or pending destination accounts during batch/statement imports, marking them with `pendente_destino: true`, `subcategoria: 'Pendente de Destino'`, and `transfer_match_id: null` without creating counterparty legs.
- **Updated `saveNewTransaction()`**: Enforced setting `sub = 'Pendente de Destino'` for transfers created with unassigned destination accounts.

### 5. `tests/test_r2_pending_destination.js` (NEW)
- Created dedicated unit and integration test suite for R2 protocol verifying:
  - Tagging of pending transfers with `pendente_destino: true` and `subcategoria: 'Pendente de Destino'`.
  - Prevention of dummy account creation in `Contas`.
  - Physical account balance isolation (primary account balance updated while secondary physical account balances remain unaffected).
  - Proper isolation in batch double-entry processing (`processDoubleEntryTransfers`).
  - Pending transfer resolution via `resolvePendingDestination()`.

### 6. `tests/run_tests.js`
- Integrated `test_r2_pending_destination.js` into main test runner.

## Verification
- All 5 tests in `node tests/test_r2_pending_destination.js` PASSED.
- All 65 tests in `node tests/run_tests.js` PASSED.
- All 7 tests in `node tests/test_r1_counterparty.js` PASSED.
