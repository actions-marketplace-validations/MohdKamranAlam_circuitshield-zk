# GitHub Action Workflow

Example workflow for a repository that vendors or installs CircuitShield:

```yaml
name: circuitshield

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build

      - run: node dist/cli.js scan . --config circuitshield.yml --baseline audited-v1.0.0 --format json --out circuitshield-report.json
      - run: node dist/cli.js comment --scan circuitshield-report.json --out circuitshield-comment.md

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: circuitshield-comment.md

      - run: node dist/cli.js ci . --config circuitshield.yml --baseline audited-v1.0.0 --fail-on manual --format sarif --out circuitshield.sarif

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: circuitshield.sarif
```

The PR comment is a summary. The SARIF upload lets GitHub Code Scanning show individual findings.
