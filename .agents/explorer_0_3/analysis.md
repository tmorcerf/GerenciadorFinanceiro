# Test Infrastructure & Account Reconciliation ("Gold Rule") Analysis Report

**Date**: 2026-07-24  
**Author**: explorer_0_3 (Test Infra & Gold-Rule Verification Explorer)  
**Target Repository**: `c:/Corta Gastos/App`

---

## Executive Summary

This report documents the findings from an in-depth investigation into the test runner and build environment, test suite baseline, and account reconciliation integrity rules ("Gold Rule" / "Verdade Absoluta") of Corta Gastos.

Key Findings:
1. **Test Infrastructure Baseline**:
   - The web codebase (`c:/Corta Gastos/App`) currently lacks JS/TS test runner configuration (Jest, Vitest, Cypress, Playwright, etc.). `package.json` contains default script `"test": "echo \"Error: no test specified\" && exit 1"`.
   - The native Android component (`android/`) includes Gradle-based unit test (`ExampleUnitTest.java`) and instrumented test (`ExampleInstrumentedTest.java`) boilerplate.
   - Test execution verification (`cmd /c npm test`) returns exit code 1 as expected. Android test execution (`cmd /c gradlew.bat test`) failed due to environment Java version mismatch (host Java 8 vs AGP 8.13+ requirement of Java 11+).
2. **Account Reconciliation & The "Gold Rule" ("Verdade Absoluta")**:
   - **Account Lock Fields**: Accounts track closed dates via `conciliado_ate` and `conciliado_desde`. Transactions hold boolean `conciliado` and `extrato_id`. Statements (`Extratos`) store `saldo_inicial`, `saldo_final`, `soma_lancamentos`, `diferenca`, and `status` (`'conciliado'`, `'divergente'`, `'aberto'`).
   - **Initial Balance Protection**: `accounts.js` (`AccountManager.updateAccount`) strictly prohibits modifying `saldo_inicial` if `conciliado_ate` is set.
   - **Selective Field Lock**: On reconciled transactions (`conciliado: true`), financial anchor fields (`data`, `conta`, `valor`) are locked against unauthorized mutation, while metadata fields (`obs`, `categoria`, `subcategoria`) remain editable without breaking bank balance locks.
   - **Cascading Invalidation on Explicit Unlock**: If a user explicitly unlocks financial fields on a reconciled transaction, the system triggers `DB.recalcularExtratoEAtualizarCascata`, reverting `conciliado: false` for all transactions on or after the trigger date, reopening affected statements, and recalculating `conciliado_ate`.
   - **Counterpart Account Rules**: Reconciled accounts serve as the immutable source of truth ("Verdade Absoluta"). Adjustments or transfers are handled by modifying or creating counterpart entries (`create-contrapartida`) on unlocked accounts without tampering with reconciled bank records.

---

## 1. Test Framework Setup & Build System Analysis

### 1.1 Root Package & Web App Setup
- **`package.json`**:
  ```json
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
  ```
- **Dependencies**: No testing framework (`jest`, `vitest`, `cypress`, `playwright`, `mocha`, `chai`) is present in `dependencies` or `devDependencies`.
- **Build Steps**: The web app uses standard static assets (`index.html`, `app_v2.js`, `importacao.js`, `db.js`, `accounts.js`, `transactions.js`, `store.js`, `ia_*.js`) and Capacitor CLI (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) for Android packaging.

### 1.2 Mobile Android Test Setup
- **Location**: `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java`
- **Location**: `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java`
- **Build Tool**: Gradle (`gradlew.bat`), Android Gradle Plugin `8.14.3` / `8.13.0`.

### 1.3 Baseline Test Execution Results
1. **Command**: `cmd /c npm test`
   - **Result**: Fails with exit code 1.
   - **Output**: `"Error: no test specified"`
2. **Command**: `cmd /c gradlew.bat test` (run in `android/`)
   - **Result**: Fails at configuration phase.
   - **Output**: `Dependency requires at least JVM runtime version 11. This build uses a Java 8 JVM.`

---

## 2. Reconciled & Locked Account Integrity Rules ("Gold Rule")

### 2.1 Schema & Data Model
- **`Contas` Collection** (`accounts.js`, `db.js`):
  - `conciliado_ate`: Upper date boundary (`DD/MM/YYYY`) of hard-closed statements.
  - `conciliado_desde`: Lower date boundary (`DD/MM/YYYY`) of initial anchor / Marco Zero.
  - `saldo_inicial`: Initial balance anchor.
  - `ultimo_mes_fechamento` & `meses_validados`: Closed month records.
  - `ultima_fatura_fechada` & `faturas_validadas`: Credit card invoice closure tracking.
- **`Lancamentos` Collection** (`transactions.js`, `db.js`):
  - `conciliado`: Boolean flag (`true` when locked by bank statement, `false` otherwise).
  - `extrato_id`: Reference ID of the associated `Extratos` record.
- **`Extratos` Collection** (`db.js`):
  - `status`: `'conciliado'` when `|saldo_final - saldo_inicial - soma_lancamentos| <= 0.05`; otherwise `'divergente'` or `'aberto'`.

### 2.2 Immutability Rules & Security Checks
1. **Initial Balance Immutability**:
   - `accounts.js` (lines 44-48):
     ```javascript
     if (payload.saldo_inicial !== undefined) {
         const acc = this.data.find(c => c.id === id);
         if (acc && acc.conciliado_ate) {
             throw new Error("Não é possível alterar o saldo inicial de uma conta com conciliação ativa.");
         }
     }
     ```
2. **Selective UI Lock on Reconciled Transactions**:
   - `app_v2.js` (lines 6603-6633):
     - When `isConciliado === true`: UI disables `edit-tx-data`, `edit-tx-conta`, `edit-tx-valor`, and `edit-tx-create-contrapartida`.
     - Fields `obs`, `categoria`, and `subcategoria` remain editable (`disabled = false`) so categorizations and notes can be refined without breaking bank balance locks.
3. **Statement Import Hard-Closing (Trava de Conciliação)**:
   - `importacao.js` (lines 648-697): When importing statement files, transactions falling inside an already reconciled period (`tTime > cTimeDesde && tTime < cTimeAte`) are ignored by default.
   - Mathematical check (`|saldo_inicial + soma_lancamentos - saldo_final| <= 0.05`) validates balance integrity before allowing final save.
   - 5-Day Rule (`diasFaltantesCadeado`): Statement imports prior to day 5 of the following month perform `sincronizacao_parcial` (allowing manual edits), while statement imports after day 5 apply `fechamento_rigido` (hard locking the period).
4. **Cascading Invalidation & Explicit Unlock Protocol**:
   - `app_v2.js` (lines 6614-6625, 6760-6777) & `db.js` (`recalcularExtratoEAtualizarCascata`):
     - If user explicitly unlocks financial fields (`btn-unlock-tx`), a warning prompt alerts that changing Data, Conta, or Valor invalidates reconciliation for this and all subsequent transactions on the account.
     - `recalcularExtratoEAtualizarCascata` sets `conciliado = false` and `extrato_id = null` for transactions with `data >= dataGatilho`, reopens statements (`status = 'aberto'`), and recalculates `conciliado_ate`.
     - If account changed, cascade executes on both the original account and the new target account.
5. **Counterpart Account Handling ("Verdade Absoluta")**:
   - Reconciled accounts serve as the immutable ground truth.
   - For transfer transactions (`categoria: 'Transferência'`), adjustments are applied on the unlocked counterpart account via `contraPartida` payloads (`edit-tx-create-contrapartida`) rather than modifying the locked bank statement line.

---

## 3. Recommendations & Next Steps

1. **Add Automated JS/TS Test Suite (Jest or Vitest)**:
   - Install a modern unit test runner (Vitest or Jest) to test domain rules such as date parsing (`parseDataBR`), math tolerance check (`Math.abs(diff) <= 0.05`), account initial balance protection, and cascade trigger calculation.
2. **Configure JDK 11+ for Android Test Execution**:
   - Update environment configuration or local `JAVA_HOME` so `gradlew test` uses JDK 17 or JDK 11, allowing native Android unit tests to compile and pass.
3. **Add Automated E2E / Integration Tests for Gold Rule**:
   - Create tests asserting that editing locked transaction fields fails or triggers cascade reset as expected, and that initial balance edits on reconciled accounts throw errors.
