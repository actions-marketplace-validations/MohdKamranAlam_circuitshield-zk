# CircuitShield

Post-audit invariant drift monitoring and audit gate for ZK circuits.

CircuitShield is not an AI auditor and does not claim that a protocol is secure. It tracks whether ZK circuits, public inputs, verifier bindings, and declared invariants have drifted from a last audited baseline.

## What It Solves

ZK audits are performed against a specific commit. After that, teams keep changing circuits, verifiers, dependencies, and proving artifacts. CircuitShield answers the practical release question:

```text
Has this PR drifted from the audited assumptions enough to require manual review or CI blocking?
```

## MVP Scope

- Circom-first CLI
- `circuitshield.yml` invariant spec
- baseline snapshot creation
- current-vs-baseline drift comparison
- custom Circom rules for unsafe witness assignment, public input usage, and invariant coverage
- Circom `component main { public [...] }` public-input extraction
- proof artifact hash tracking for `.r1cs`, `.zkey`, `.wasm`, `.sym`, and `.ptau`
- native R1CS artifact header validation, with optional external `snarkjs r1cs info`
- basic Solidity verifier binding checks
- optional Circomspect integration when installed
- JSON, Markdown, and SARIF reports
- audit gate states: `PASS`, `WARN`, `MANUAL_REVIEW`, `REBASELINE_REQUIRED`, `BLOCK_CI`

## Baseline Semantics

Protocol drift is only meaningful when a trusted baseline is loaded. If no baseline is provided, CircuitShield reports `Protocol Drift Risk: N/A`, marks drift status as `unknown`, and prevents a `PASS` gate by requiring manual review.

The posture score still applies a conservative unknown-drift penalty internally, but it does not pretend to know a drift percentage.

Tool status is split into requested, available, executed, and reason fields. For example, Circomspect can be requested but not executed when the binary is not on `PATH`; the report shows that explicitly.

## Toolchain Reality

CircuitShield runs without external ZK tooling, but credibility improves when these binaries are available on `PATH`:

```powershell
circom --version
circomspect --version
snarkjs --help
```

Current behavior (now always reports status clearly):

- `detectToolVersions()` always returns `circom`, `circomspect`, and `snarkjs` — either with version or `"missing"`.
- If `circom` is installed and `--compile` is used → temporary artifacts are created.
- If `snarkjs` is installed → `snarkjs r1cs info` is used for deeper inspection.
- If `circomspect` is installed → SARIF findings are imported.
- Missing tools are explicitly shown in reports (e.g. `circom: missing`).

## Install

```powershell
npm install
npm run build
```

Quick health check:

```powershell
node dist/cli.js doctor . --config circuitshield.yml
```

### Recommended Toolchain (for full features)

For complete functionality (artifact compilation, Circomspect analysis, R1CS inspection), install these tools:

**snarkjs** (easiest):
```powershell
npm install -g snarkjs
```

**circom + circomspect** (require Rust):

1. Install Rust: https://rustup.rs/ (Windows installer)
2. Then run:
   ```powershell
   cargo install circom
   cargo install circomspect
   ```

After installation, verify:
```powershell
circom --version
circomspect --version
snarkjs --version
```

> **Note:** CircuitShield works without these tools, but `--compile` and Circomspect rules will be skipped with clear "missing" status in reports.

### GitHub Codespaces Toolchain Fix

If a Codespace report shows `Config loaded: no`, run scans from the repository root with the root config:

```bash
node dist/cli.js scan . \
  --config circuitshield.yml \
  --format markdown \
  --out pilot-report.md
```

If `circomspect` or `snarkjs` are missing, install the optional toolchain:

```bash
bash scripts/setup-zk-toolchain.sh
export PATH="$HOME/.cargo/bin:$PATH"
npm run build
node dist/cli.js doctor . --config circuitshield.yml
```

You can also bypass PATH issues with explicit binary paths:

```bash
export CIRCOMSPECT_BIN="$HOME/.cargo/bin/circomspect"
export SNARKJS_BIN="$(npm bin -g)/snarkjs"
```

## Run UI

Terminal 1:

```powershell
npm run api
```

Terminal 2:

```powershell
npm run web:dev
```

Open:

```text
http://127.0.0.1:5174
```

## Database

CircuitShield supports Neon/PostgreSQL using the same env style as the machine project:

```env
DB_ENGINE=postgresql
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-polished-king-akppezrh-pooler.c-3.us-west-2.aws.neon.tech:5432/neondb?sslmode=require
```

Run:

```powershell
node dist/cli.js db migrate
node dist/cli.js db:status
```

Full setup: [docs/database.md](docs/database.md)

## Try The Example

```powershell
npm run scan:example
```

Create a baseline:

```powershell
npm run baseline:example
```

Scan against the baseline:

```powershell
node dist/cli.js scan examples --config examples/circuitshield.yml --baseline audited-v1.0.0 --format markdown
```

Request optional compiler artifact extraction when Circom is installed:

```powershell
node dist/cli.js scan examples --config examples/circuitshield.yml --compile
```

Write SARIF:

```powershell
node dist/cli.js scan examples --config examples/circuitshield.yml --format sarif --out .tmp/circuitshield.sarif
```

Run the vulnerable-circuit benchmark suite:

```powershell
node dist/cli.js benchmark benchmarks
```

Run the product baseline drift demo:

```powershell
node dist/cli.js demo baseline-drift
```

Demo flow:

```text
audited source without baseline -> MANUAL_REVIEW
audited source with generated baseline -> PASS
current risky source vs audited baseline -> BLOCK_CI
```

Render a GitHub PR comment from a JSON scan:

```powershell
node dist/cli.js scan examples --config examples/circuitshield.yml --format json --out .tmp/scan.json
node dist/cli.js comment --scan .tmp/scan.json --out .tmp/pr-comment.md
```

## Config

`circuitshield.yml` declares project intent that generic scanners cannot infer:

```yaml
version: 1

project:
  name: private-withdraw-protocol
  baseline:
    type: git
    ref: audited-v1.0.0

circuits:
  - id: withdraw
    path: circuits/withdraw.circom
    framework: circom
    verifier: contracts/WithdrawVerifier.sol
    public_inputs:
      - merkleRoot
      - nullifierHash
      - recipient
      - amount
      - chainId
      - assetId
    invariants:
      - id: nullifier_unique
        type: nullifier_unique
        signal: nullifierHash
        severity: critical
      - id: amount_range
        type: range_bound
        signal: amount
        bits: 64
        severity: high
```

## CLI

```powershell
circuitshield init
circuitshield doctor . --config circuitshield.yml
circuitshield scan .
circuitshield scan . --compile
circuitshield baseline create --ref audited-v1.0.0
circuitshield ci . --baseline audited-v1.0.0 --fail-on block
circuitshield benchmark benchmarks
circuitshield scan . --format sarif --out circuitshield.sarif
```

## Tech Stack

- TypeScript + Node.js for CLI, GitHub Action compatibility, and fast product iteration
- YAML config for invariant specification
- JSON snapshots for audited baseline history
- SARIF for GitHub code scanning integration
- Optional Circomspect execution when available locally
- Optional Circom compiler artifact extraction when available locally

## Suppressions

Suppressions must include a reason and are visible in reports.

Config-level:

```yaml
suppressions:
  - id: declared_public_input_unbound
    file: circuits/withdraw.circom
    reason: Bound in parent circuit; tracked in audit note CS-12.
    expires: "2026-12-31"
```

Inline:

```circom
// circuitshield-ignore unsafe_witness_assignment reason="witness bound by next constraint"
x <-- y + 1;
x === y + 1;
```

## Safety Language

Use:

```text
No critical findings detected by configured checks.
Manual review required.
Audit baseline drift detected.
```

Avoid:

```text
Secure.
Bug-free.
Supply is guaranteed safe.
AI certified.
```
