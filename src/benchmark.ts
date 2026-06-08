import { promises as fs } from "node:fs";
import path from "node:path";
import { toBaselineSnapshot } from "./baseline.js";
import { scanProject } from "./scanner.js";
import type { AuditGateState, BenchmarkReport } from "./types.js";
import { pathExists, severityRank } from "./utils.js";

interface BenchmarkCaseConfig {
  id?: string;
  expectedGate?: AuditGateState;
  expectedFindingIds?: string[];
  forbiddenFindingIds?: string[];
  selfBaseline?: boolean;
}

export async function runBenchmarks(root: string, options: { compileArtifacts?: boolean } = {}): Promise<BenchmarkReport> {
  const absoluteRoot = path.resolve(root);
  const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });
  const caseDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(absoluteRoot, entry.name));

  const cases = [];
  for (const caseDir of caseDirs) {
    const configPath = path.join(caseDir, "circuitshield.yml");
    if (!(await pathExists(configPath))) continue;
    const benchmarkConfig = await readBenchmarkConfig(caseDir);
    const baselineScan = benchmarkConfig.selfBaseline
      ? await scanProject({ root: caseDir, configPath, compileArtifacts: options.compileArtifacts })
      : undefined;
    const baseline = baselineScan ? toBaselineSnapshot(baselineScan, "benchmark-self-baseline") : undefined;
    const result = await scanProject({ root: caseDir, configPath, baseline, compileArtifacts: options.compileArtifacts });
    const expectedGate = benchmarkConfig.expectedGate;
    const actualGate = result.auditGate.state;
    const findingIds = new Set(result.findings.map((finding) => finding.id));
    const expectedFindingIds = benchmarkConfig.expectedFindingIds ?? [];
    const forbiddenFindingIds = benchmarkConfig.forbiddenFindingIds ?? [];
    const missingExpectedFindingIds = expectedFindingIds.filter((id) => !findingIds.has(id));
    const presentForbiddenFindingIds = forbiddenFindingIds.filter((id) => findingIds.has(id));
    const gatePassed = expectedGate ? actualGate === expectedGate : true;
    cases.push({
      id: benchmarkConfig.id ?? path.basename(caseDir),
      path: path.relative(absoluteRoot, caseDir).replace(/\\/g, "/"),
      expectedGate,
      actualGate,
      passedExpectation: gatePassed && missingExpectedFindingIds.length === 0 && presentForbiddenFindingIds.length === 0,
      expectedFindingIds,
      missingExpectedFindingIds,
      forbiddenFindingIds,
      presentForbiddenFindingIds,
      findings: result.findings.length,
      criticalFindings: result.findings.filter((finding) => finding.severity === "critical").length,
      highFindings: result.findings.filter((finding) => severityRank(finding.severity) >= severityRank("high")).length,
      securityPostureRisk: result.metrics.securityPostureRisk,
    });
  }

  const failed = cases.filter((item) => !item.passedExpectation).length;
  return {
    version: "0.1.0",
    scannedAt: new Date().toISOString(),
    root: absoluteRoot,
    cases,
    summary: {
      total: cases.length,
      passed: cases.length - failed,
      failed,
    },
  };
}

export function renderBenchmarkMarkdown(report: BenchmarkReport): string {
  const lines: string[] = [];
  lines.push("# CircuitShield Benchmark Report");
  lines.push("");
  lines.push(`Scanned at: ${report.scannedAt}`);
  lines.push(`Cases: ${report.summary.total}`);
  lines.push(`Passed expectations: ${report.summary.passed}`);
  lines.push(`Failed expectations: ${report.summary.failed}`);
  lines.push("");
  lines.push("| Case | Expected | Actual | Findings | High+ | Risk | Result |");
  lines.push("| --- | --- | --- | ---: | ---: | ---: | --- |");
  for (const item of report.cases) {
    const result = item.passedExpectation
      ? "PASS"
      : `FAIL missing=[${item.missingExpectedFindingIds.join(", ")}] forbidden=[${item.presentForbiddenFindingIds.join(", ")}]`;
    lines.push(`| ${item.id} | ${item.expectedGate ?? "-"} | ${item.actualGate} | ${item.findings} | ${item.highFindings} | ${item.securityPostureRisk} | ${result} |`);
  }
  return `${lines.join("\n")}\n`;
}

async function readBenchmarkConfig(caseDir: string): Promise<BenchmarkCaseConfig> {
  const file = path.join(caseDir, "benchmark.json");
  if (!(await pathExists(file))) return {};
  return JSON.parse(await fs.readFile(file, "utf8")) as BenchmarkCaseConfig;
}
