# Real Repo Validation

This document records an early real-world validation run of CircuitShield against public Circom repositories.

The goal of this validation was not to produce a `PASS` gate. These repositories do not ship a CircuitShield baseline/config for our product-specific invariant checks. The goal was to verify that CircuitShield can scan real repositories, execute available ZK tooling, produce readable findings, and fail conservatively without crashing.

## Environment

- Runner: GitHub Codespaces
- CircuitShield branch: `master`
- Config for target repos: not present in scanned repositories
- Baseline for target repos: not present
- `circom`: available
- `circomspect`: available and executed
- `snarkjs`: available in the main CircuitShield toolchain check

## Summary

| Repository | Scan completed | Gate | Config loaded | Baseline loaded | Circuits | Verifiers | Findings | Severity mix | Invariant coverage | Verifier risk | Scan confidence | Circomspect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| `iden3/circomlib` | yes | `MANUAL_REVIEW` | no | no | 104 | 0 | 66 | 65 medium, 1 high | 100/100 | 0/100 | 40/100 | executed; no SARIF output was produced |
| `semaphore-protocol/semaphore` | yes | `MANUAL_REVIEW` | no | no | 1 | 0 | 7 | 7 medium | 100/100 | 0/100 | 50/100 | executed |
| `tornadocash/tornado-core` | yes | `MANUAL_REVIEW` | no | no | 2 | 0 | 4 | 3 medium, 1 info | 100/100 | 0/100 | 40/100 | unavailable in local run |

## circomlib

Repository:

```text
https://github.com/iden3/circomlib
```

Command shape:

```bash
git clone --depth 1 https://github.com/iden3/circomlib.git .tmp/validation/circomlib
node dist/cli.js scan .tmp/validation/circomlib --format json --out .tmp/validation/circomlib-scan.json
node dist/cli.js scan .tmp/validation/circomlib --format markdown --out .tmp/validation/circomlib-report.md
```

Result:

```text
Gate: MANUAL_REVIEW
Config loaded: false
Baseline loaded: false
Circuits: 104
Verifiers: 0
Findings: 66
Severity: {"medium":65,"high":1}
Invariant coverage: 100/100
Verifier risk: 0/100
Scan confidence: 40/100
circomspect: executed (executed; no SARIF output was produced)
```

Top findings:

```text
- MEDIUM config_missing project: circuitshield.yml not found
- HIGH unsafe_witness_assignment circuits/binsub.circom:31 | Witness assignment may be unconstrained
- MEDIUM tautological_constraint circuits/binsub.circom:32 | Tautological constraint does not bind protocol state
- MEDIUM suspicious_assert circuits/comparators.circom:90 | Suspicious assert usage
- MEDIUM tautological_constraint circuits/eddsa.circom:33 | Tautological constraint does not bind protocol state
- MEDIUM tautological_constraint circuits/eddsa.circom:34 | Tautological constraint does not bind protocol state
- MEDIUM tautological_constraint circuits/multiplexer.circom:44 | Tautological constraint does not bind protocol state
- MEDIUM tautological_constraint circuits/pointbits.circom:72 | Tautological constraint does not bind protocol state
- MEDIUM suspicious_assert circuits/pointbits.circom:35 | Suspicious assert usage
- MEDIUM suspicious_assert circuits/poseidon_constants.circom:2282 | Suspicious assert usage
```

Notes:

- The scan completed across a large real Circom library with 104 discovered circuits.
- `MANUAL_REVIEW` is expected because there is no CircuitShield config or audited baseline in the target repo.
- The single high finding is a heuristic unsafe witness-assignment pattern and should be manually triaged before being treated as an issue in the upstream project.
- Circomspect executed but did not produce SARIF output for this run.

## Semaphore

Repository:

```text
https://github.com/semaphore-protocol/semaphore
```

Command shape:

```bash
git clone --depth 1 https://github.com/semaphore-protocol/semaphore.git .tmp/validation/semaphore
node dist/cli.js scan .tmp/validation/semaphore --format json --out .tmp/validation/semaphore-scan.json
node dist/cli.js scan .tmp/validation/semaphore --format markdown --out .tmp/validation/semaphore-report.md
```

Result:

```text
Gate: MANUAL_REVIEW
Config loaded: false
Baseline loaded: false
Circuits: 1
Verifiers: 0
Findings: 7
Severity: {"medium":7}
Invariant coverage: 100/100
Verifier risk: 0/100
Scan confidence: 50/100
circomspect: executed (executed)
```

Top findings:

```text
- MEDIUM config_missing project: circuitshield.yml not found
- MEDIUM P1000 packages/circuits/src/semaphore.circom:3 | P1000
- MEDIUM P1000 packages/circuits/src/semaphore.circom:4 | P1000
- MEDIUM P1000 packages/circuits/src/semaphore.circom:5 | P1000
- MEDIUM P1000 packages/circuits/src/semaphore.circom:6 | P1000
- MEDIUM TAC01 packages/circuits/src/semaphore.circom:52 | TAC01
- MEDIUM baseline_missing project: Audited baseline is missing
```

Notes:

- The scan completed against a real Semaphore-style repository.
- Circomspect findings were normalized into CircuitShield findings.
- `MANUAL_REVIEW` is expected because the target repo did not include a CircuitShield config or audited baseline.

## Tornado Cash Core

Repository:

```text
https://github.com/tornadocash/tornado-core
```

Command shape:

```bash
git clone --depth 1 https://github.com/tornadocash/tornado-core.git .tmp/validation/tornado-core
node dist/cli.js scan .tmp/validation/tornado-core --format json --out .tmp/validation/tornado-core-scan.json
node dist/cli.js scan .tmp/validation/tornado-core --format markdown --out .tmp/validation/tornado-core-report.md
```

Result:

```text
Gate: MANUAL_REVIEW
Config loaded: false
Baseline loaded: false
Circuits: 2
Verifiers: 0
Findings: 4
Severity: {"medium":3,"info":1}
Invariant coverage: 100/100
Verifier risk: 0/100
Scan confidence: 40/100
circomspect: unavailable in local run
```

Top findings:

```text
- MEDIUM config_missing project: circuitshield.yml not found
- MEDIUM tautological_constraint circuits/merkleTree.circom:23 | Tautological constraint does not bind protocol state
- INFO circomspect_unavailable project: Circomspect was requested but not executed
- MEDIUM baseline_missing project: Audited baseline is missing
```

Notes:

- The scan completed against a well-known legacy Circom protocol repository.
- `MANUAL_REVIEW` is expected because the target repo did not include a CircuitShield config or audited baseline.
- The tautological-constraint finding should be manually triaged before being treated as a protocol issue.
- Circomspect was not available in this local run; this lowers scan confidence and should be rerun in a full toolchain environment for stronger evidence.

## Interpretation

These results support the paid-pilot MVP claim that CircuitShield can run beyond local fixtures and benchmarks:

- It scanned real open-source Circom repositories without crashing.
- It discovered real Circom files.
- It executed Circomspect when available.
- It produced normalized findings and conservative audit-gate decisions.
- It clearly reported missing project-specific config and baseline context.

These results do not claim the scanned repositories are insecure. Findings require manual triage by maintainers or ZK auditors, especially when scanning projects without a configured `circuitshield.yml`.

## Next Validation Steps

- Add one small configured third-party Circom project with a temporary `circuitshield.yml`.
- Run a real PR workflow demo where a safe change passes and an intentional risky change blocks CI.
- Add optional `snarkjs r1cs info` execution for compiled `.r1cs` artifacts when requested.
- Track false-positive notes for each real-repo validation run.
