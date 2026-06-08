import type { Finding, ScanResult } from "../types.js";
import { severityRank } from "../utils.js";

export function renderGithubComment(result: ScanResult): string {
  const highFindings = result.findings
    .filter((finding) => severityRank(finding.severity) >= severityRank("high"))
    .slice(0, 8);
  const lines: string[] = [];
  lines.push("## CircuitShield Audit Gate");
  lines.push("");
  lines.push(`**State:** \`${result.auditGate.state}\``);
  lines.push("");
  lines.push("| Metric | Score |");
  lines.push("| --- | ---: |");
  lines.push(`| Protocol Drift Risk | ${result.metrics.protocolDriftStatus === "unknown" ? "N/A" : `${result.metrics.protocolDriftIndex}/100`} |`);
  lines.push(`| Circuit Integrity Risk | ${result.metrics.circuitIntegrityRisk}/100 |`);
  lines.push(`| Invariant Coverage | ${result.metrics.invariantCoverageScore}/100 |`);
  lines.push(`| Verifier Binding Risk | ${result.metrics.verifierBindingRisk}/100 |`);
  lines.push(`| Scan Confidence | ${result.metrics.scanConfidence}/100 |`);
  lines.push("");
  const weakVerifierChecks = (result.verifierChecks ?? [])
    .filter((check) => check.status !== "pass")
    .slice(0, 6);
  if (weakVerifierChecks.length) {
    lines.push("### Verifier Binding Checks");
    lines.push("");
    for (const check of weakVerifierChecks) {
      lines.push(`- **${check.status.toUpperCase()}** ${check.label}: ${check.detail}`);
    }
    lines.push("");
  }
  lines.push("### Gate Reasons");
  lines.push("");
  for (const reason of result.auditGate.reasons.slice(0, 8)) {
    lines.push(`- ${reason}`);
  }
  if (result.auditGate.reasons.length > 8) lines.push(`- ...${result.auditGate.reasons.length - 8} more`);
  lines.push("");
  lines.push("### High Priority Findings");
  lines.push("");
  if (!highFindings.length) {
    lines.push("No high or critical findings were detected by configured checks.");
  } else {
    for (const finding of highFindings) {
      lines.push(formatFinding(finding));
    }
  }
  lines.push("");
  lines.push(`Suppressed findings: ${result.suppressedFindings.length}`);
  lines.push("");
  lines.push("> CircuitShield is an audit-readiness and drift-monitoring tool. It does not prove the protocol is secure or bug-free.");
  return `${lines.join("\n")}\n`;
}

function formatFinding(finding: Finding): string {
  const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ""}` : "project";
  const context = [
    `confidence ${Math.round((finding.confidence ?? 0) * 100)}%`,
    finding.invariantId ? `invariant ${finding.invariantId}` : undefined,
    finding.gateImpact ? `gate ${finding.gateImpact}` : undefined,
  ].filter(Boolean).join(", ");
  return `- **${finding.severity.toUpperCase()}** \`${finding.id}\` at \`${location}\` (${context}): ${finding.message}`;
}
