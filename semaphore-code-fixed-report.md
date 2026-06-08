# CircuitShield Scan Report

Project: **circuitshield-zk**
Scanned at: 2026-06-08T07:09:27.805Z
Audit Gate: **MANUAL_REVIEW**

## Metrics

- Protocol Drift Risk: N/A (no baseline loaded)
- Circuit Integrity Risk: 24/100
- Invariant Coverage Score: 100/100
- Verifier Binding Risk: 0/100
- Static Finding Risk: 73/100
- Scan Confidence: 24/100
- Security Posture Risk: 26/100

## Invariant Coverage

No invariants were declared in circuitshield.yml.

## Verifier Binding Checks

No verifier checks were available. Configure verifiers in circuitshield.yml.

## Tool Status

- Config loaded: no
- Baseline loaded: no

| Tool | Requested | Available | Executed | Succeeded | Version | Reason | Install hint | Confidence impact |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| circom | no | yes | no | no | circom compiler 2.2.3 | not requested | - | -0 |
| circomspect | yes | no | no | no | missing | circomspect binary not found on PATH | Install Circomspect and ensure 'circomspect' is on PATH. See https://github.com/trailofbits/circomspect | -10 |
| snarkjs | yes | no | no | no | missing | snarkjs binary not found on PATH; native R1CS header validation still ran | Install snarkjs and ensure 'snarkjs' is on PATH, for example: npm install -g snarkjs | -6 |
| native_r1cs | yes | yes | yes | yes | - | native R1CS header validation executed | - | -0 |

- Repository artifacts tracked: 13
- Compiled artifacts tracked: 0
- Artifact inspections: 1
- Tool versions tracked: 3

## Tool Versions

- circom: circom compiler 2.2.3
- circomspect: missing
- snarkjs: missing

## Artifact Drift

| Artifact | Kind | Status | Risk | Gate | Current | Baseline |
| --- | --- | --- | --- | --- | --- | --- |
| package-lock.json | dependency | not_tracked | low | - | 35ecb20ccda4... | - |
| package.json | dependency | not_tracked | low | - | 92fb7b4c395c... | - |
| benchmarks/critical-missing-nullifier/circuits/withdraw.circom | repository | not_tracked | low | - | 4fe3bf601e67... | - |
| benchmarks/ignored-verifier-proof/circuits/simple.circom | repository | not_tracked | low | - | 6ef625632f8a... | - |
| benchmarks/public-input-mismatch/circuits/mismatch.circom | repository | not_tracked | low | - | 867312677b92... | - |
| benchmarks/safe-withdraw/circuits/withdraw.circom | repository | not_tracked | low | - | 5c2374a622cd... | - |
| benchmarks/suppressed-unsafe/circuits/suppressed.circom | repository | not_tracked | low | - | 9d5937f04c7d... | - |
| benchmarks/unsafe-verifier-replay/circuits/replay.circom | repository | not_tracked | low | - | d55cbcbfed90... | - |
| benchmarks/unsafe-witness/circuits/unsafe.circom | repository | not_tracked | low | - | 5929ad0d0c2d... | - |
| benchmarks/weak-domain-binding/circuits/domain.circom | repository | not_tracked | low | - | 5a78e0eeb0cd... | - |
| demos/baseline-drift/audited/circuits/withdraw.circom | repository | not_tracked | low | - | 36c9f7934eb1... | - |
| demos/baseline-drift/current/circuits/withdraw.circom | repository | not_tracked | low | - | b8b159d014c0... | - |
| examples/artifacts/withdraw.r1cs | repository | not_tracked | low | - | c183a1a1e761... | - |
| examples/circuits/withdraw.circom | repository | not_tracked | low | - | c75138e8411a... | - |
| testing/semaphore/packages/circuits/src/semaphore.circom | repository | not_tracked | low | - | d67fbae45044... | - |
| circom | tool | not_tracked | low | - | circom compi... | - |
| circomspect | tool | not_tracked | low | - | missing | - |
| snarkjs | tool | not_tracked | low | - | missing | - |

## Artifact Inspections

- examples/artifacts/withdraw.r1cs (r1cs): invalid - R1CS artifact magic header is 'demo', expected 'r1cs'.

## Audit Gate Reasons

- circuitshield.yml not found: No circuitshield.yml was found. The scan can run, but invariant intent and public input binding are limited.
- Actual public input is not declared in circuitshield.yml: Public input 'merkleRoot' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'out' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'root' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'recipient' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'amount' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'chainId' appears in component main but is not declared in circuitshield.yml.
- Actual public input is not declared in circuitshield.yml: Public input 'assetId' appears in component main but is not declared in circuitshield.yml.
- Witness assignment may be unconstrained: Signal 'out' is assigned with '<--' and no obvious matching constraint was found.
- R1CS artifact is not structurally valid: R1CS artifact magic header is 'demo', expected 'r1cs'.
- Audited baseline is missing: No baseline snapshot was loaded. Protocol drift cannot be fully assessed.
- Protocol Drift is unknown because no trusted baseline is loaded.
- Scan confidence is low.

## Findings

### MEDIUM - circuitshield.yml not found

- Source: config
- Category: configuration
- Location: project
- Confidence: 60%
- Gate impact: WARN
- Message: No circuitshield.yml was found. The scan can run, but invariant intent and public input binding are limited.
- Recommendation: Run 'circuitshield init' and declare critical protocol invariants.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/critical-missing-nullifier/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'merkleRoot' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/ignored-verifier-proof/circuits/simple.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'out' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/public-input-mismatch/circuits/mismatch.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'root' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/public-input-mismatch/circuits/mismatch.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/safe-withdraw/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'merkleRoot' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/safe-withdraw/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/safe-withdraw/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'recipient' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/safe-withdraw/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'amount' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/safe-withdraw/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'chainId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/safe-withdraw/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'assetId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/suppressed-unsafe/circuits/suppressed.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'out' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/unsafe-verifier-replay/circuits/replay.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'root' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/unsafe-verifier-replay/circuits/replay.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### HIGH - Witness assignment may be unconstrained

- Source: custom-circom-rule
- Category: static
- Location: benchmarks/unsafe-witness/circuits/unsafe.circom:7
- Confidence: 74%
- Gate impact: MANUAL_REVIEW
- Message: Signal 'out' is assigned with '<--' and no obvious matching constraint was found.
- Recommendation: Use '<==' when possible, or add an explicit '===' constraint binding the assigned witness value.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/unsafe-witness/circuits/unsafe.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'out' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: benchmarks/weak-domain-binding/circuits/domain.circom:8
- Confidence: 74%
- Message: Constraint 'chainId === chainId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: benchmarks/weak-domain-binding/circuits/domain.circom:9
- Confidence: 74%
- Message: Constraint 'assetId === assetId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/weak-domain-binding/circuits/domain.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'chainId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: benchmarks/weak-domain-binding/circuits/domain.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'assetId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/audited/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'merkleRoot' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/audited/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/audited/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'recipient' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/audited/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'amount' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/audited/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'chainId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/audited/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'assetId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### HIGH - Witness assignment may be unconstrained

- Source: custom-circom-rule
- Category: static
- Location: demos/baseline-drift/current/circuits/withdraw.circom:18
- Confidence: 74%
- Gate impact: MANUAL_REVIEW
- Message: Signal 'out' is assigned with '<--' and no obvious matching constraint was found.
- Recommendation: Use '<==' when possible, or add an explicit '===' constraint binding the assigned witness value.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: demos/baseline-drift/current/circuits/withdraw.circom:22
- Confidence: 74%
- Message: Constraint 'chainId === chainId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: demos/baseline-drift/current/circuits/withdraw.circom:23
- Confidence: 74%
- Message: Constraint 'assetId === assetId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: demos/baseline-drift/current/circuits/withdraw.circom:24
- Confidence: 74%
- Message: Constraint 'recipient === recipient;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/current/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'merkleRoot' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/current/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/current/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'recipient' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/current/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'amount' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/current/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'chainId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: demos/baseline-drift/current/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'assetId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### HIGH - Witness assignment may be unconstrained

- Source: custom-circom-rule
- Category: static
- Location: examples/circuits/withdraw.circom:17
- Confidence: 74%
- Gate impact: MANUAL_REVIEW
- Message: Signal 'out' is assigned with '<--' and no obvious matching constraint was found.
- Recommendation: Use '<==' when possible, or add an explicit '===' constraint binding the assigned witness value.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: examples/circuits/withdraw.circom:28
- Confidence: 74%
- Message: Constraint 'chainId === chainId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: examples/circuits/withdraw.circom:29
- Confidence: 74%
- Message: Constraint 'assetId === assetId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: examples/circuits/withdraw.circom:32
- Confidence: 74%
- Message: Constraint 'recipient === recipient;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: examples/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'merkleRoot' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: examples/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'nullifierHash' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: examples/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'recipient' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: examples/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'amount' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: examples/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'chainId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### MEDIUM - Actual public input is not declared in circuitshield.yml

- Source: circom-metadata
- Category: configuration
- Location: examples/circuits/withdraw.circom
- Confidence: 78%
- Gate impact: WARN
- Message: Public input 'assetId' appears in component main but is not declared in circuitshield.yml.
- Recommendation: Add the public input to circuitshield.yml so baseline drift and verifier binding can track it.

### INFO - Circomspect was requested but not executed

- Source: cli
- Category: tooling
- Location: project
- Confidence: 60%
- Message: Circomspect was requested, but the 'circomspect' binary was not found on PATH.
- Recommendation: Install Circomspect and ensure 'circomspect' is on PATH. See https://github.com/trailofbits/circomspect

### HIGH - R1CS artifact is not structurally valid

- Source: artifact-inspector
- Category: tooling
- Location: examples/artifacts/withdraw.r1cs
- Confidence: 60%
- Gate impact: MANUAL_REVIEW
- Message: R1CS artifact magic header is 'demo', expected 'r1cs'.
- Recommendation: Regenerate the R1CS artifact from the audited circuit before relying on artifact drift checks.

### MEDIUM - Audited baseline is missing

- Source: baseline-diff
- Category: baseline_drift
- Location: project
- Confidence: 100%
- Gate impact: MANUAL_REVIEW
- Message: No baseline snapshot was loaded. Protocol drift cannot be fully assessed.
- Recommendation: Create a baseline from the last audited commit with 'circuitshield baseline create --ref <audit-ref>'.

## Suppressed Findings

- HIGH unsafe_witness_assignment at benchmarks/suppressed-unsafe/circuits/suppressed.circom:8 suppressed by inline: benchmark suppression

## Limitations

CircuitShield does not replace a professional ZK audit or formal verification. It detects configured risk patterns, invariant drift, artifact drift, and verifier binding weaknesses to improve audit-readiness.
- This report does not prove the protocol is secure or bug-free.
- Findings are based on configured checks, heuristics, and available artifacts.
- Critical ZK protocol changes still require expert human review.
