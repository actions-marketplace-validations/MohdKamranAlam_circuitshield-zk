# CircuitShield Pilot Outreach Playbook

## Positioning

CircuitShield is a CI audit gate for ZK projects. It helps teams check whether Circom circuits, Solidity verifiers, proving artifacts, and declared invariants have drifted from the assumptions of a previous audit or review.

It does not replace a professional ZK audit. It creates a repeatable audit-readiness report before releases and pull requests.

## Productized Service Offer

Offer:

```text
ZK Audit-Readiness Drift Report
```

What the report includes:

- Circuit and verifier discovery
- Missing or weak invariant coverage
- Public input and unsafe witness risk checks
- Verifier binding risk checks
- Proving artifact drift notes
- Toolchain execution status
- CI gate recommendation: `PASS`, `WARN`, `MANUAL_REVIEW`, `REBASELINE_REQUIRED`, or `BLOCK_CI`
- Fix checklist for maintainers

Initial pricing:

```text
First 2-3 pilots: free or discounted for feedback
Early paid reports: $500-$2,000
Larger protocol reports: $3,000-$10,000 after credibility improves
```

## 3-Minute Demo Script

### 0:00-0:30 - Problem

ZK audits are tied to a specific commit. After the audit, teams keep changing circuits, verifiers, dependencies, and proving artifacts. CircuitShield answers one release question:

```text
Has this repo drifted from audited assumptions enough to require manual review or CI blocking?
```

### 0:30-1:15 - Run A Scan

```bash
npm install
npm run build
node dist/cli.js scan examples --config examples/circuitshield.yml --format markdown --out pilot-report.md
```

Show:

- discovered circuits
- verifier checks
- finding severity
- audit gate decision
- toolchain status

### 1:15-2:00 - Baseline Drift

```bash
npm run baseline:example
node dist/cli.js scan examples --config examples/circuitshield.yml --baseline audited-v1.0.0 --format markdown
```

Explain:

- baseline = last audited/reviewed state
- current scan = release candidate
- drift = reason to review, rebaseline, or block CI

### 2:00-2:40 - Real Repo Validation

Show:

```text
docs/validation/real-repo-validation.md
docs/sample-reports/pilot-report-final-all-tools.md
```

Say clearly:

```text
These results do not claim upstream projects are insecure. They show CircuitShield can scan real Circom repositories, normalize findings, and fail conservatively when config or baseline context is missing.
```

### 2:40-3:00 - Call To Action

```text
I am looking for 3 pilot ZK teams. I can run CircuitShield on your repo and deliver an audit-readiness drift report with findings, limitations, and a fix checklist.
```

## Outreach Message

```text
Hey <name>,

I am building CircuitShield, a CI audit gate for ZK/Circom projects.

It checks whether circuits, Solidity verifiers, proving artifacts, and declared invariants have drifted from the last audited or reviewed baseline.

I am looking for 3 pilot teams. I can run it on your repo and deliver an audit-readiness drift report with:

- invariant coverage
- verifier binding risk
- artifact drift notes
- risky findings
- manual review / CI gate recommendation
- fix checklist

It does not replace a professional ZK audit. It helps catch risky changes before production.

Open to a 20-minute demo?
```

## Target Teams

Start with teams that already have public Circom repositories or active ZK protocol development:

- Semaphore ecosystem projects
- MACI / PSE ecosystem projects
- zk-email and zk-regex style projects
- privacy protocol teams
- ZK app teams using Circom verifiers
- audit firms that review ZK circuits

## Qualification Questions

Ask these before a pilot:

- Do you use Circom, Noir, Halo2, or another circuit framework?
- Do you have a known audited commit or release baseline?
- Do you use Solidity verifiers?
- Do you want CI to block risky circuit or verifier changes?
- Are reports for internal engineering enough, or do you need customer/investor-facing audit-readiness language?

## Next Internal Work

- Record one 3-minute demo video.
- Polish the sample report into a customer-facing PDF/Markdown.
- Run one configured third-party repo demo with a temporary `circuitshield.yml`.
- Track false positives and manual triage notes.
- Collect 3 pilot feedback calls before adding SaaS features.
