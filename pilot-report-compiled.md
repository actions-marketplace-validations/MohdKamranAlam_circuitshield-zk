# CircuitShield Scan Report

Project: **circuitshield-zk**
Scanned at: 2026-06-08T07:30:59.768Z
Audit Gate: **MANUAL_REVIEW**

## Metrics

- Protocol Drift Risk: N/A (no baseline loaded)
- Circuit Integrity Risk: 5/100
- Invariant Coverage Score: 100/100
- Verifier Binding Risk: 0/100
- Static Finding Risk: 0/100
- Scan Confidence: 70/100
- Security Posture Risk: 12/100

## Invariant Coverage

- merkle_membership (merkle_membership, critical) on safe_withdraw: covered
- nullifier_unique (nullifier_unique, critical) on safe_withdraw: covered
- value_conservation (value_conservation, critical) on safe_withdraw: covered
- amount_range (range_bound, high) on safe_withdraw: covered
- domain_binding (domain_binding, high) on safe_withdraw: covered

## Verifier Binding Checks

- Verifier contract detected (safe_withdraw_verifier): pass - Verifier contract is present and hash-tracked.
- Proof verification enforced (safe_withdraw_verifier): pass - Proof verification appears to be enforced by configured checks.
- Public input order configured (safe_withdraw_verifier): pass - 6 public input(s) configured.
- Public input order matched (safe_withdraw_verifier): pass - Configured public inputs were found in verifier contract text.
- Verifier contract hash tracked (safe_withdraw_verifier): pass - Verifier contract hash is included in baseline snapshots.
- Domain/chain binding configured (safe_withdraw_verifier): pass - Domain-like public input is configured for verifier binding.
- Nullifier binding configured (safe_withdraw_verifier): pass - Nullifier-like public input is configured.
- Nullifier reuse rejected (safe_withdraw_verifier): pass - A nullifier-like verifier input is configured and no replay-guard issue was detected.

## Tool Status

- Config loaded: yes
- Baseline loaded: no

| Tool | Requested | Available | Executed | Succeeded | Version | Reason | Install hint | Confidence impact |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| circom | yes | yes | yes | yes | circom compiler 2.2.3 | executed | - | -0 |
| circomspect | yes | no | no | no | missing | circomspect binary not found. Checked: circomspect, /home/codespace/.cargo/bin/circomspect | Run 'cargo install circomspect', ensure ~/.cargo/bin is on PATH, or set CIRCOMSPECT_BIN to the binary path. See https://github.com/trailofbits/circomspect | -10 |
| snarkjs | no | no | no | no | missing | no R1CS artifacts discovered | Run 'npm install -g snarkjs', ensure the npm global bin directory is on PATH, or set SNARKJS_BIN to the binary path. | -0 |
| native_r1cs | no | yes | no | no | - | no R1CS artifacts discovered | - | -0 |

- Repository artifacts tracked: 3
- Compiled artifacts tracked: 3
- Artifact inspections: 0
- Tool versions tracked: 3

## Tool Versions

- circom: circom compiler 2.2.3
- circomspect: missing
- snarkjs: missing

## Artifact Drift

| Artifact | Kind | Status | Risk | Gate | Current | Baseline |
| --- | --- | --- | --- | --- | --- | --- |
| compiled/safe_withdraw/withdraw_js/withdraw.wasm | compiled | not_tracked | low | - | d0caebf9d5b6... | - |
| compiled/safe_withdraw/withdraw.r1cs | compiled | not_tracked | low | - | cb6e4aafff2a... | - |
| compiled/safe_withdraw/withdraw.sym | compiled | not_tracked | low | - | 0764f7439852... | - |
| package-lock.json | dependency | not_tracked | low | - | 35ecb20ccda4... | - |
| package.json | dependency | not_tracked | low | - | 92fb7b4c395c... | - |
| benchmarks/safe-withdraw/circuits/withdraw.circom | repository | not_tracked | low | - | 5c2374a622cd... | - |
| benchmarks/safe-withdraw/contracts/Verifier.sol | repository | not_tracked | low | - | d4a70265c936... | - |
| circuitshield.yml | repository | not_tracked | low | - | f9c4532eb259... | - |
| circom | tool | not_tracked | low | - | circom compi... | - |
| circomspect | tool | not_tracked | low | - | missing | - |
| snarkjs | tool | not_tracked | low | - | missing | - |

## Artifact Inspections

No proof artifacts were inspected.

## Audit Gate Reasons

- Audited baseline is missing: No baseline snapshot was loaded. Protocol drift cannot be fully assessed.
- Protocol Drift is unknown because no trusted baseline is loaded.
- Scan confidence is limited.

## Findings

### INFO - Circomspect was requested but not executed

- Source: cli
- Category: tooling
- Location: project
- Confidence: 60%
- Message: Circomspect was requested, but it was not executed: circomspect binary not found. Checked: circomspect, /home/codespace/.cargo/bin/circomspect.
- Recommendation: Run 'cargo install circomspect', ensure ~/.cargo/bin is on PATH, or set CIRCOMSPECT_BIN to the binary path. See https://github.com/trailofbits/circomspect

### MEDIUM - Audited baseline is missing

- Source: baseline-diff
- Category: baseline_drift
- Location: project
- Confidence: 100%
- Gate impact: MANUAL_REVIEW
- Message: No baseline snapshot was loaded. Protocol drift cannot be fully assessed.
- Recommendation: Create a baseline from the last audited commit with 'circuitshield baseline create --ref <audit-ref>'.

## Suppressed Findings

No findings were suppressed.

## Limitations

CircuitShield does not replace a professional ZK audit or formal verification. It detects configured risk patterns, invariant drift, artifact drift, and verifier binding weaknesses to improve audit-readiness.
- This report does not prove the protocol is secure or bug-free.
- Findings are based on configured checks, heuristics, and available artifacts.
- Critical ZK protocol changes still require expert human review.
