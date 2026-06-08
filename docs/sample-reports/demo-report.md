# CircuitShield Scan Report

Project: **private-withdraw-protocol**
Scanned at: 2026-06-08T11:37:25.798Z
Audit Gate: **BLOCK_CI**

## Metrics

- Protocol Drift Risk: N/A (no baseline loaded)
- Circuit Integrity Risk: 72/100
- Invariant Coverage Score: 20/100
- Verifier Binding Risk: 79/100
- Static Finding Risk: 76/100
- Scan Confidence: 64/100
- Security Posture Risk: 64/100

## Invariant Coverage

- merkle_membership (merkle_membership, critical) on withdraw: weak
- nullifier_unique (nullifier_unique, critical) on withdraw: covered
- value_conservation (value_conservation, critical) on withdraw: weak
- amount_range (range_bound, high) on withdraw: missing
- domain_binding (domain_binding, high) on withdraw: weak

## Verifier Binding Checks

- Verifier contract detected (withdraw_verifier): pass - Verifier contract is present and hash-tracked.
- Proof verification enforced (withdraw_verifier): weak - verifyProof was found, but enforcement evidence is weak.
- Public input order configured (withdraw_verifier): pass - 6 public input(s) configured.
- Public input order matched (withdraw_verifier): pass - Configured public inputs were found in verifier contract text.
- Verifier contract hash tracked (withdraw_verifier): pass - Verifier contract hash is included in baseline snapshots.
- Domain/chain binding configured (withdraw_verifier): pass - Domain-like public input is configured for verifier binding.
- Nullifier binding configured (withdraw_verifier): pass - Nullifier-like public input is configured.
- Nullifier reuse rejected (withdraw_verifier): weak - Nullifier storage exists, but no obvious replay rejection guard was found.

## Tool Status

- Config loaded: yes
- Baseline loaded: no

| Tool | Requested | Available | Executed | Succeeded | Version | Reason | Install hint | Confidence impact |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| circom | no | yes | no | no | circom compiler 2.2.3 | not requested | - | -0 |
| circomspect | yes | yes | yes | yes | circomspect | executed | - | -0 |
| snarkjs | yes | yes | yes | no | snarkjs@0.7.6 | Error: /workspaces/circuitshield-zk/examples/artifacts/withdraw.r1cs: Invalid File format | - | -6 |
| native_r1cs | yes | yes | yes | yes | - | native R1CS header validation executed | - | -0 |

- Repository artifacts tracked: 4
- Compiled artifacts tracked: 0
- Artifact inspections: 1
- Tool versions tracked: 3

## Tool Versions

- circom: circom compiler 2.2.3
- circomspect: circomspect 
- snarkjs: snarkjs@0.7.6

## Artifact Drift

| Artifact | Kind | Status | Risk | Gate | Current | Baseline |
| --- | --- | --- | --- | --- | --- | --- |
| artifacts/withdraw.r1cs | repository | not_tracked | low | - | c183a1a1e761... | - |
| circuits/withdraw.circom | repository | not_tracked | low | - | c75138e8411a... | - |
| circuitshield.yml | repository | not_tracked | low | - | 30b5992ffc90... | - |
| contracts/WithdrawVerifier.sol | repository | not_tracked | low | - | 7c3f01fad6e6... | - |
| circom | tool | not_tracked | low | - | circom compi... | - |
| circomspect | tool | not_tracked | low | - | circomspect  | - |
| snarkjs | tool | not_tracked | low | - | snarkjs@0.7.6 | - |

## Artifact Inspections

- artifacts/withdraw.r1cs (r1cs): invalid - R1CS artifact magic header is 'demo', expected 'r1cs'.

## Audit Gate Reasons

- Witness assignment may be unconstrained: Signal 'out' is assigned with '<--' and no obvious matching constraint was found.
- Declared public input has no meaningful constraint binding: Public input 'recipient' exists but does not appear in a meaningful constraint.
- Declared public input has no meaningful constraint binding: Public input 'amount' exists but does not appear in a meaningful constraint.
- Declared public input has no meaningful constraint binding: Public input 'chainId' exists but does not appear in a meaningful constraint.
- Declared public input has no meaningful constraint binding: Public input 'assetId' exists but does not appear in a meaningful constraint.
- Merkle-membership invariant has weak evidence: Root 'merkleRoot' is constrained, but no clear Merkle path and hash evidence was found outside comments.
- Value-conservation invariant is underspecified: Value-conservation invariant is declared but no input/output value signals are specified.
- Range-bound invariant is not covered: No clear range-check evidence was found for 'amount'.
- Domain-binding invariant has weak binding evidence: Domain signal(s) lack meaningful constraints: chainId, assetId.
- Proof verification result may be weakly enforced: verifyProof(...) appears in the contract, but no obvious require(...) or negative guard was found.
- Nullifier reuse may not be rejected: A nullifier-like mapping is written, but no obvious require(!usedNullifiers[...]) or revert guard was found before use.
- snarkjs R1CS inspection failed: Error: /workspaces/circuitshield-zk/examples/artifacts/withdraw.r1cs: Invalid File format
- R1CS artifact is not structurally valid: R1CS artifact magic header is 'demo', expected 'r1cs'.
- Audited baseline is missing: No baseline snapshot was loaded. Protocol drift cannot be fully assessed.
- Protocol Drift is unknown because no trusted baseline is loaded.
- Scan confidence is limited.

## Findings

### HIGH - Witness assignment may be unconstrained

- Source: custom-circom-rule
- Category: static
- Location: circuits/withdraw.circom:17
- Confidence: 74%
- Gate impact: MANUAL_REVIEW
- Message: Signal 'out' is assigned with '<--' and no obvious matching constraint was found.
- Recommendation: Use '<==' when possible, or add an explicit '===' constraint binding the assigned witness value.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: circuits/withdraw.circom:28
- Confidence: 74%
- Message: Constraint 'chainId === chainId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: circuits/withdraw.circom:29
- Confidence: 74%
- Message: Constraint 'assetId === assetId;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### MEDIUM - Tautological constraint does not bind protocol state

- Source: custom-circom-rule
- Category: static
- Location: circuits/withdraw.circom:32
- Confidence: 74%
- Message: Constraint 'recipient === recipient;' appears self-referential and may not bind any external value.
- Recommendation: Replace self-constraints with constraints that bind the signal into a hash, range check, Merkle path, or verifier input.

### HIGH - Declared public input has no meaningful constraint binding

- Source: circom-metadata
- Category: static
- Location: circuits/withdraw.circom
- Confidence: 78%
- Gate impact: MANUAL_REVIEW
- Message: Public input 'recipient' exists but does not appear in a meaningful constraint.
- Recommendation: Bind this public input into the statement being proven.

### HIGH - Declared public input has no meaningful constraint binding

- Source: circom-metadata
- Category: static
- Location: circuits/withdraw.circom
- Confidence: 78%
- Gate impact: MANUAL_REVIEW
- Message: Public input 'amount' exists but does not appear in a meaningful constraint.
- Recommendation: Bind this public input into the statement being proven.

### HIGH - Declared public input has no meaningful constraint binding

- Source: circom-metadata
- Category: static
- Location: circuits/withdraw.circom
- Confidence: 78%
- Gate impact: MANUAL_REVIEW
- Message: Public input 'chainId' exists but does not appear in a meaningful constraint.
- Recommendation: Bind this public input into the statement being proven.

### HIGH - Declared public input has no meaningful constraint binding

- Source: circom-metadata
- Category: static
- Location: circuits/withdraw.circom
- Confidence: 78%
- Gate impact: MANUAL_REVIEW
- Message: Public input 'assetId' exists but does not appear in a meaningful constraint.
- Recommendation: Bind this public input into the statement being proven.

### CRITICAL - Merkle-membership invariant has weak evidence

- Source: invariant-checker
- Category: invariant
- Location: circuits/withdraw.circom
- Confidence: 72%
- Invariant affected: merkle_membership
- Gate impact: BLOCK_CI
- Message: Root 'merkleRoot' is constrained, but no clear Merkle path and hash evidence was found outside comments.
- Recommendation: Use an audited Merkle path/hash component and constrain the computed root to the declared public root.

### MEDIUM - Value-conservation invariant is underspecified

- Source: invariant-checker
- Category: invariant
- Location: circuits/withdraw.circom
- Confidence: 72%
- Invariant affected: value_conservation
- Gate impact: MANUAL_REVIEW
- Message: Value-conservation invariant is declared but no input/output value signals are specified.
- Recommendation: Declare value input/output signals so CircuitShield can track conservation coverage and drift.

### HIGH - Range-bound invariant is not covered

- Source: invariant-checker
- Category: invariant
- Location: circuits/withdraw.circom
- Confidence: 72%
- Invariant affected: amount_range
- Gate impact: MANUAL_REVIEW
- Message: No clear range-check evidence was found for 'amount'.
- Recommendation: Add an explicit bit-length/range constraint, such as Num2Bits or a known range-check component.

### HIGH - Domain-binding invariant has weak binding evidence

- Source: invariant-checker
- Category: invariant
- Location: circuits/withdraw.circom
- Confidence: 72%
- Invariant affected: domain_binding
- Gate impact: MANUAL_REVIEW
- Message: Domain signal(s) lack meaningful constraints: chainId, assetId.
- Recommendation: Bind domain signals into a constrained hash/preimage rather than self-constraints.

### MEDIUM - CS0013

- Source: circomspect
- Category: static
- Location: circuits/withdraw.circom:17
- Confidence: 80%
- Message: Using the signal assignment operator `<--` is not necessary here.
- Recommendation: Review the Circomspect finding and add a suppression only with a clear reason.

### MEDIUM - CS0006

- Source: circomspect
- Category: static
- Location: circuits/withdraw.circom:17
- Confidence: 80%
- Message: The variable `out` is assigned a value, but this value is never read.
- Recommendation: Review the Circomspect finding and add a suppression only with a clear reason.

### MEDIUM - CA01

- Source: circomspect
- Category: static
- Location: circuits/withdraw.circom:9
- Confidence: 80%
- Message: The signal `recipient` is not constrained by the template.
- Recommendation: Review the Circomspect finding and add a suppression only with a clear reason.

### MEDIUM - CA01

- Source: circomspect
- Category: static
- Location: circuits/withdraw.circom:10
- Confidence: 80%
- Message: The signal `chainId` is not constrained by the template.
- Recommendation: Review the Circomspect finding and add a suppression only with a clear reason.

### MEDIUM - CA01

- Source: circomspect
- Category: static
- Location: circuits/withdraw.circom:11
- Confidence: 80%
- Message: The signal `assetId` is not constrained by the template.
- Recommendation: Review the Circomspect finding and add a suppression only with a clear reason.

### MEDIUM - CA01

- Source: circomspect
- Category: static
- Location: circuits/withdraw.circom:6
- Confidence: 80%
- Message: The signal `amount` is not constrained by the template.
- Recommendation: Review the Circomspect finding and add a suppression only with a clear reason.

### HIGH - Proof verification result may be weakly enforced

- Source: verifier-checker
- Category: verifier
- Location: contracts/WithdrawVerifier.sol
- Confidence: 70%
- Gate impact: MANUAL_REVIEW
- Message: verifyProof(...) appears in the contract, but no obvious require(...) or negative guard was found.
- Recommendation: Make sure invalid proofs cannot continue execution.

### HIGH - Nullifier reuse may not be rejected

- Source: verifier-checker
- Category: verifier
- Location: contracts/WithdrawVerifier.sol
- Confidence: 70%
- Gate impact: MANUAL_REVIEW
- Message: A nullifier-like mapping is written, but no obvious require(!usedNullifiers[...]) or revert guard was found before use.
- Recommendation: Reject reused nullifiers before state changes, for example require(!usedNullifiers[bytes32(nullifierHash)], 'nullifier used').

### MEDIUM - snarkjs R1CS inspection failed

- Source: snarkjs
- Category: tooling
- Location: artifacts/withdraw.r1cs
- Confidence: 60%
- Gate impact: WARN
- Message: Error: /workspaces/circuitshield-zk/examples/artifacts/withdraw.r1cs: Invalid File format
- Recommendation: Regenerate the R1CS artifact or run 'snarkjs r1cs info' locally for the full error.

### HIGH - R1CS artifact is not structurally valid

- Source: artifact-inspector
- Category: tooling
- Location: artifacts/withdraw.r1cs
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

No findings were suppressed.

## Limitations

CircuitShield does not replace a professional ZK audit or formal verification. It detects configured risk patterns, invariant drift, artifact drift, and verifier binding weaknesses to improve audit-readiness.
- This report does not prove the protocol is secure or bug-free.
- Findings are based on configured checks, heuristics, and available artifacts.
- Critical ZK protocol changes still require expert human review.
