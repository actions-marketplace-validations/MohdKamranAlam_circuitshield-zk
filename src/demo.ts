import path from "node:path";
import { toBaselineSnapshot } from "./baseline.js";
import { scanProject } from "./scanner.js";
import type { BaselineDriftDemoReport } from "./types.js";

export async function runBaselineDriftDemo(root: string): Promise<BaselineDriftDemoReport> {
  const demoRoot = path.resolve(root);
  const auditedRoot = path.join(demoRoot, "audited");
  const currentRoot = path.join(demoRoot, "current");
  const baselineRef = "audited-safe-v1.0.0";

  const audited = await scanProject({
    root: auditedRoot,
    configPath: path.join(auditedRoot, "circuitshield.yml"),
  });
  const baseline = toBaselineSnapshot(audited, baselineRef);
  const auditedWithBaseline = await scanProject({
    root: auditedRoot,
    configPath: path.join(auditedRoot, "circuitshield.yml"),
    baseline,
  });
  const current = await scanProject({
    root: currentRoot,
    configPath: path.join(currentRoot, "circuitshield.yml"),
    baseline,
  });

  const driftFindings = current.findings.filter((finding) => finding.category === "baseline_drift");
  return {
    version: "0.1.0",
    scannedAt: new Date().toISOString(),
    root: demoRoot,
    baselineRef,
    audited,
    auditedWithBaseline,
    current,
    summary: {
      auditedGate: audited.auditGate.state,
      auditedWithBaselineGate: auditedWithBaseline.auditGate.state,
      currentGate: current.auditGate.state,
      currentDrift: current.metrics.protocolDriftIndex,
      driftStatus: current.metrics.protocolDriftStatus,
      driftFindings: driftFindings.length,
      artifactDriftFindings: driftFindings.filter((finding) => finding.id.includes("artifact")).length,
      verifierDriftFindings: driftFindings.filter((finding) => finding.id.includes("verifier")).length,
    },
  };
}

export function renderBaselineDriftDemoMarkdown(report: BaselineDriftDemoReport): string {
  const lines: string[] = [];
  lines.push("# CircuitShield Baseline Drift Demo");
  lines.push("");
  lines.push(`Scanned at: ${report.scannedAt}`);
  lines.push(`Baseline ref: ${report.baselineRef}`);
  lines.push("");
  lines.push("| Step | Gate | Drift | Findings | High+ |");
  lines.push("| --- | --- | ---: | ---: | ---: |");
  lines.push(row("Audited source without baseline", report.audited));
  lines.push(row("Audited source with baseline", report.auditedWithBaseline));
  lines.push(row("Current risky source vs baseline", report.current));
  lines.push("");
  lines.push("## Current Drift Findings");
  lines.push("");
  const drift = report.current.findings.filter((finding) => finding.category === "baseline_drift");
  if (!drift.length) {
    lines.push("No baseline drift findings were detected.");
  } else {
    for (const finding of drift) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.id}: ${finding.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function row(label: string, result: BaselineDriftDemoReport["current"]): string {
  const high = result.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const drift = result.metrics.protocolDriftIndex == null ? "N/A" : `${result.metrics.protocolDriftIndex}/100`;
  return `| ${label} | ${result.auditGate.state} | ${drift} | ${result.findings.length} | ${high} |`;
}
