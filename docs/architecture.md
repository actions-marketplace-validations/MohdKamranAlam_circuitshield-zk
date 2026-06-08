# CircuitShield Architecture

## Product Definition

CircuitShield is a post-audit drift monitor for ZK protocols. Its first wedge is value-bearing Circom projects where public input binding, nullifiers, Merkle membership, range bounds, and value conservation matter.

## Pipeline

```text
Repository
  -> circuitshield.yml
  -> Circom discovery
  -> custom static rules
  -> optional Circomspect
  -> optional Circom compile artifact extraction
  -> invariant coverage checks
  -> verifier binding checks
  -> baseline snapshot diff
  -> suppression policy
  -> scoring engine
  -> audit gate
  -> JSON / Markdown / SARIF reports
```

## Core Metrics

`Protocol Drift Index`

Tracks change from the last audited baseline:

- constraint-like count drop
- unsafe assignment increase
- public input list changes
- verifier hash changes
- R1CS/zkey/wasm/sym/ptau artifact hash changes
- invariant coverage drop
- dependency/toolchain manifest changes

`Circuit Integrity Risk`

Combines invariant, static, verifier, and drift evidence. This is a heuristic risk signal, not a proof.

`Invariant Coverage Score`

Measures how much of the configured intent remains covered by the available checks.

`Verifier Binding Risk`

Flags verifier contract and public input binding issues.

`Scan Confidence`

Drops when config, baseline, or optional analyzer coverage is missing.

`Audit Gate`

Rule-driven decision:

- `PASS`
- `WARN`
- `MANUAL_REVIEW`
- `REBASELINE_REQUIRED`
- `BLOCK_CI`

## Moat

The moat is not raw static analysis. Existing tools already cover important parts of that space. CircuitShield's moat is the workflow layer:

- invariant spec DSL
- audited baseline history
- verifier binding checks
- drift scoring
- audit gate policy
- SARIF and PR reporting
- future benchmark corpus of vulnerable ZK examples

## Next Engineering Milestones

1. Replace heuristic Circom parsing with proper AST/R1CS extraction.
2. Add first-class verifier key extraction instead of file-level artifact hash tracking.
3. Add GitHub PR comment renderer.
4. Add suppressions with reason and expiry.
5. Add vulnerable-circuit benchmark tests.
6. Add Noir support after Circom MVP is useful.
