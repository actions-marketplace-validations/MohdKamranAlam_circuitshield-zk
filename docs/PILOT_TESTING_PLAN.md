# CircuitShield - Pre-Pilot Testing Plan

## Objective
CircuitShield ko 3-5 public Circom projects pe test karke ek professional validation report banana hai, jisse potential pilot customers ko value demonstrate ki ja sake.

---

## Phase 1: Project Selection (Recommended)

| # | Project | Repository | Type | Recommended For |
|---|---------|------------|------|-----------------|
| 1 | Semaphore | https://github.com/semaphore-protocol/semaphore | Production-grade | Medium |
| 2 | Tornado Cash (Legacy) | https://github.com/tornadocash/tornado-core | Classic ZK | Easy |
| 3 | MACI | https://github.com/privacy-scaling-explorations/maci | Complex | Hard |
| 4 | Rate Limiting Nullifier (RLN) | https://github.com/Rate-Limiting-Nullifier/rln | Modern | Medium |
| 5 | zkRegex | https://github.com/0xPARC/zk-regex | Small & Clean | Easy |

**Suggestion**: Pehle **Semaphore** aur **Tornado Cash** se shuru karo.

---

## Phase 2: Testing Steps (Har Project ke liye)

### Step 1: Repository Clone
```bash
git clone https://github.com/semaphore-protocol/semaphore
cd <project-folder>
```

### Step 2: Circuit Files Discover
```bash
# Find all .circom files
find . -name "*.circom" -type f
```

### Step 3: Create circuitshield.yml
```yaml
project:
  name: <Project-Name>
  framework: circom

circuits:
  - path: circuits/main.circom
    framework: circom

invariants:
  - type: nullifier_reuse
  - type: unsafe_witness
```

### Step 4: Run Scan
```bash
# Recommended command
npx circuitshield scan . \
  --config circuitshield.yml \
  --format markdown \
  --out reports/<project-name>-scan.md
```

### Step 5: Capture Key Metrics
Har project ke liye ye record karo:

- Total circuits scanned
- High severity findings
- Medium severity findings
- Time taken
- Any false positives / useful findings

### Step 6: Generate Summary
Ek short summary likho har project ke liye (2-3 lines).

---

## Phase 3: Report Structure

Final report mein ye sections hone chahiye:

1. Executive Summary
2. Projects Tested
3. Key Findings (per project)
4. Value Delivered
5. Limitations
6. Next Steps

---

## Tools & Commands Reference

```bash
# Full scan with markdown
node dist/cli.js scan . --config circuitshield.yml --format markdown --out report.md

# Baseline creation
node dist/cli.js baseline create --ref audited-v1.0.0 --target .

# Benchmark
npm run benchmark
```

---

## Timeline (Recommended)

| Day | Activity |
|-----|----------|
| Day 1 | 2 projects clone + first scan |
| Day 2 | Remaining projects + report writing |
| Day 3 | Final report polish + outreach preparation |

---

**Note**: Ye plan existing benchmarks aur examples ke upar based hai. Real public projects pe testing se realistic value dikhegi.
