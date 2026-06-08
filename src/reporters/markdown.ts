import type { ScanResult } from "../types.js";

export function renderMarkdown(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`# CircuitShield Scan Report`);
  lines.push("");
  lines.push(`Project: **${result.projectName}**`);
  lines.push(`Scanned at: ${result.scannedAt}`);
  lines.push(`Audit Gate: **${result.auditGate.state}**`);
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- Protocol Drift Risk: ${result.metrics.protocolDriftStatus === "unknown" ? "N/A (no baseline loaded)" : `${result.metrics.protocolDriftIndex}/100`}`);
  lines.push(`- Circuit Integrity Risk: ${result.metrics.circuitIntegrityRisk}/100`);
  lines.push(`- Invariant Coverage Score: ${result.metrics.invariantCoverageScore}/100`);
  lines.push(`- Verifier Binding Risk: ${result.metrics.verifierBindingRisk}/100`);
  lines.push(`- Static Finding Risk: ${result.metrics.staticFindingRisk}/100`);
  lines.push(`- Scan Confidence: ${result.metrics.scanConfidence}/100`);
  lines.push(`- Security Posture Risk: ${result.metrics.securityPostureRisk}/100`);
  lines.push("");
  lines.push("## Invariant Coverage");
  lines.push("");
  if (!result.invariantStatuses.length) {
    lines.push("No invariants were declared in circuitshield.yml.");
  } else {
    for (const invariant of result.invariantStatuses) {
      lines.push(`- ${invariant.id} (${invariant.type}, ${invariant.severity}) on ${invariant.circuitId}: ${invariant.status}`);
    }
  }
  lines.push("");
  lines.push("## Verifier Binding Checks");
  lines.push("");
  const verifierChecks = result.verifierChecks ?? [];
  if (!verifierChecks.length) {
    lines.push("No verifier checks were available. Configure verifiers in circuitshield.yml.");
  } else {
    for (const check of verifierChecks) {
      lines.push(`- ${check.label} (${check.verifierId}): ${check.status} - ${check.detail}`);
    }
  }
  lines.push("");
  lines.push("## Tool Status");
  lines.push("");
  lines.push(`- Config loaded: ${yesNo(result.toolStatus.configLoaded)}`);
  lines.push(`- Baseline loaded: ${yesNo(result.toolStatus.baselineLoaded)}`);
  lines.push("");
  lines.push("| Tool | Requested | Available | Executed | Succeeded | Version | Reason | Install hint | Confidence impact |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | ---: |");
  for (const tool of result.toolStatus.tools ?? []) {
    lines.push(`| ${tableCell(tool.name)} | ${yesNo(tool.requested)} | ${yesNo(tool.available)} | ${yesNo(tool.executed)} | ${yesNo(tool.succeeded)} | ${tableCell(tool.version ?? "-")} | ${tableCell(tool.reason)} | ${tableCell(tool.available ? "-" : tool.installHint ?? "-")} | -${tool.confidenceImpact} |`);
  }
  lines.push("");
  lines.push(`- Repository artifacts tracked: ${Object.keys(result.snapshots.artifactHashes).length}`);
  lines.push(`- Compiled artifacts tracked: ${Object.keys(result.snapshots.compilerArtifactHashes).length}`);
  lines.push(`- Artifact inspections: ${result.snapshots.artifactInspections.length}`);
  lines.push(`- Tool versions tracked: ${Object.keys(result.snapshots.toolVersions).length}`);
  lines.push("");
  lines.push("## Tool Versions");
  lines.push("");
  if (!Object.keys(result.snapshots.toolVersions).length) {
    lines.push("No external ZK tool versions were detected on PATH.");
  } else {
    for (const [tool, version] of Object.entries(result.snapshots.toolVersions)) {
      lines.push(`- ${tool}: ${version}`);
    }
  }
  lines.push("");
  lines.push("## Artifact Drift");
  lines.push("");
  if (!result.snapshots.artifactDrift.length) {
    lines.push("No artifact drift rows were generated.");
  } else {
    lines.push("| Artifact | Kind | Status | Risk | Gate | Current | Baseline |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const item of result.snapshots.artifactDrift) {
      lines.push(`| ${item.path} | ${item.kind} | ${item.status} | ${item.riskImpact} | ${item.gateImpact ?? "-"} | ${shortHash(item.currentHash)} | ${shortHash(item.baselineHash)} |`);
    }
  }
  lines.push("");
  lines.push("## Artifact Inspections");
  lines.push("");
  if (!result.snapshots.artifactInspections.length) {
    lines.push("No proof artifacts were inspected.");
  } else {
    for (const inspection of result.snapshots.artifactInspections) {
      lines.push(`- ${inspection.path} (${inspection.kind}): ${inspection.status} - ${inspection.detail}`);
    }
  }
  lines.push("");
  lines.push("## Audit Gate Reasons");
  lines.push("");
  for (const reason of result.auditGate.reasons) lines.push(`- ${cleanText(reason)}`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (result.findings.length === 0) {
    lines.push("No configured findings were detected.");
  } else {
    for (const finding of result.findings) {
      const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""}` : "project";
      lines.push(`### ${finding.severity.toUpperCase()} - ${finding.title}`);
      lines.push("");
      lines.push(`- Source: ${finding.source}`);
      lines.push(`- Category: ${finding.category}`);
      lines.push(`- Location: ${location}`);
      lines.push(`- Confidence: ${Math.round((finding.confidence ?? 0) * 100)}%`);
      if (finding.invariantId) lines.push(`- Invariant affected: ${finding.invariantId}`);
      if (finding.gateImpact) lines.push(`- Gate impact: ${finding.gateImpact}`);
      lines.push(`- Message: ${cleanText(finding.message)}`);
      if (finding.recommendation) lines.push(`- Recommendation: ${cleanText(finding.recommendation)}`);
      lines.push("");
    }
  }
  lines.push("## Suppressed Findings");
  lines.push("");
  if (!result.suppressedFindings.length) {
    lines.push("No findings were suppressed.");
  } else {
    for (const item of result.suppressedFindings) {
      const finding = item.finding;
      const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""}` : "project";
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.id} at ${location} suppressed by ${item.source}: ${item.reason}`);
    }
  }
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  lines.push("CircuitShield does not replace a professional ZK audit or formal verification. It detects configured risk patterns, invariant drift, artifact drift, and verifier binding weaknesses to improve audit-readiness.");
  lines.push("- This report does not prove the protocol is secure or bug-free.");
  lines.push("- Findings are based on configured checks, heuristics, and available artifacts.");
  lines.push("- Critical ZK protocol changes still require expert human review.");
  return `${lines.join("\n")}\n`;
}

function shortHash(value?: string): string {
  if (!value) return "-";
  return value.length > 16 ? `${value.slice(0, 12)}...` : value;
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function tableCell(value: string): string {
  return cleanText(value).replace(/\|/g, "/");
}

function cleanText(value: string): string {
  return stripAnsi(value).replace(/\s+/g, " ").trim();
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}
