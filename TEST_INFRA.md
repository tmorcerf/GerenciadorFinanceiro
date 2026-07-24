# Corta Gastos — E2E Testing Infrastructure (`TEST_INFRA.md`)

## Executive Summary
This project incorporates a zero-dependency, lightweight, high-performance E2E and integration testing harness built natively in Node.js. It verifies all core business modules (`transactions.js`, `store.js`, `accounts.js`, `db.js`, `ia_conciliador.js`) without external browser or heavy npm test dependencies.

---

## 1. Test Suite Architecture

### 1.1 In-Memory Environment Simulator (`tests/harness/mock_env.js`)
- **DOM & Browser Globals**: Simulates `window`, `document`, `localStorage`, `EventTarget`, and `CustomEvent`.
- **In-Memory Firestore Engine (`MockFirestoreDB`)**:
  - Full support for `collection`, `doc`, `set`, `update`, `delete`, `get`, `where` filters (`==`, `in`, `>=`, `<=`), and `onSnapshot` real-time listener synchronization.
  - Implements Firestore `batch()` writes (`set`, `update`, `delete`, `commit()`) with synchronous event notification.
- **State Store Binding**: Automatically initializes `window.StoreManager`, `window.accountManager`, `window.transactionManager`, `window.DB`, and `window.IAConciliador`.
- **UI Helper Simulation**: Integrates `window.linkTransfers(cod1, cod2)` and `window.renderTransferReconciliation()` for end-to-end visual UI matching tests.

### 1.2 Test Harness Framework (`tests/harness/test_framework.js`)
- Custom lightweight test runner supporting `describe()`, `test()`, `it()`, and Node `assert`.
- Fully async-aware suite execution, microsecond/millisecond performance benchmarking, colorful console output, and automatic process exit code evaluation (`0` on pass, `1` on fail).

---

## 2. 4-Tier Test Design & Coverage

| Tier | Category | Focus Area | Minimum Spec | Implemented Tests |
|------|----------|------------|--------------|-------------------|
| **Tier 1** | Feature Coverage | R1 Counterparty, R2 Pending Destination, R3 Central UI & AI, Gold Rule Protection | >=5 per feature (20 total) | **20 Test Cases** |
| **Tier 2** | Boundary & Corner Cases | High precision, zero values, whitespace trimming, threshold strictness, atomic update failures | >=5 per feature (20 total) | **20 Test Cases** |
| **Tier 3** | Cross-Feature Pairwise | Interactions between R1+R2, R1+R3, R2+Gold Rule, R1+Gold Rule, R3+Gold Rule | >=15 total | **15 Test Cases** |
| **Tier 4** | Real-World Scenarios | End-to-end user workflows, monthly statement imports, multi-account rings, cascading invalidations | >=10 total | **10 Test Cases** |
| **TOTAL** | **Full Suite** | **Comprehensive Dual-Track Audit** | **>=65 Total** | **65 Test Cases (100% PASS)** |

---

## 3. Test File Organization

```
c:/Corta Gastos/App/tests/
├── harness/
│   ├── mock_env.js                 # In-memory browser & Firestore simulation environment
│   └── test_framework.js           # Lightweight async test runner & assertion harness
├── tier1_feature_coverage.test.js  # Tier 1: Core feature verification (20 tests)
├── tier2_boundary_corner_cases.test.js # Tier 2: Boundary & corner cases (20 tests)
├── tier3_cross_feature_pairwise.test.js # Tier 3: Pairwise feature combinations (15 tests)
├── tier4_real_world_scenarios.test.js # Tier 4: E2E user workflows & scenarios (10 tests)
└── run_tests.js                    # Master entry-point runner script
```

---

## 4. How to Execute Tests

### Command Line Execution
```bash
# Direct Node.js execution
node tests/run_tests.js

# Standard npm test command (configured in package.json)
npm test
# On Windows PowerShell where script execution policy is active:
cmd /c npm test
```

### Expected Output
```
=============================================================
 🚀 CORTA GASTOS - E2E DUAL TRACK TEST HARNESS
=============================================================

📦 [SUITE] Tier 1 - Feature 1: R1 Counterparty Logic
  ✓ [PASS] T1_R1_01: Outbound transfer creates counterparty Inflow leg on target account (2ms)
  ...
=============================================================
 📊 TEST EXECUTION SUMMARY
=============================================================
 Total Suites  : 10
 Total Tests   : 65
 Passed        : 65
 Failed        : 0
 Execution Time: ~80ms
 Status        : ✅ ALL TESTS PASSED
=============================================================
```
