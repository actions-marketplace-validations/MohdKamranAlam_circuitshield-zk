import type { Finding, ScanResult } from "../types.js";

function level(finding: Finding): "error" | "warning" | "note" {
  if (finding.severity === "critical" || finding.severity === "high") return "error";
  if (finding.severity === "medium") return "warning";
  return "note";
}

export function renderSarif(result: ScanResult): string {
  const rules = new Map(
    result.findings.map((finding) => [
      finding.id,
      {
        id: finding.id,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.recommendation ?? finding.message },
        properties: { category: finding.category, severity: finding.severity },
      },
    ])
  );
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "CircuitShield",
            semanticVersion: result.version,
            informationUri: "https://github.com/circuitshield/circuitshield",
            rules: Array.from(rules.values()),
          },
        },
        results: result.findings.map((finding) => ({
          ruleId: finding.id,
          level: level(finding),
          message: { text: finding.message },
          locations: finding.file
            ? [
                {
                  physicalLocation: {
                    artifactLocation: { uri: finding.file },
                    region: { startLine: finding.line ?? 1 },
                  },
                },
              ]
            : [],
          properties: {
            severity: finding.severity,
            category: finding.category,
            source: finding.source,
            recommendation: finding.recommendation,
          },
        })),
      },
    ],
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}
