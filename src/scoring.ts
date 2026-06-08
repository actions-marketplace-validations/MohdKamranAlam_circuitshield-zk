import type { AuditGate, AuditGateState, Finding, Metrics } from "./types.js";
import { clamp, severityRank } from "./utils.js";

const SEVERITY_RISK: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 45,
  low: 20,
  info: 5,
};

export function findingRisk(findings: Finding[], category?: Finding["category"]): number {
  const relevant = category ? findings.filter((finding) => finding.category === category) : findings;
  if (relevant.length === 0) return 0;
  const weighted = relevant.reduce((sum, finding) => sum + (SEVERITY_RISK[finding.severity] ?? 0), 0);
  const densityBoost = Math.min(20, relevant.length * 2);
  return clamp(weighted / relevant.length + densityBoost);
}

export function invariantCoverage(findings: Finding[]): number {
  const invariantFindings = findings.filter((finding) => finding.category === "invariant");
  if (invariantFindings.length === 0) return 100;
  const penalty = invariantFindings.reduce((sum, finding) => sum + (finding.severity === "critical" ? 30 : finding.severity === "high" ? 20 : 10), 0);
  return clamp(100 - penalty);
}

export function scanConfidence(options: {
  configLoaded: boolean;
  baselineLoaded: boolean;
  circomspectAvailable: boolean;
  compilerArtifactsRequested: boolean;
  compilerArtifactsSucceeded?: boolean;
  circomAvailable: boolean;
  snarkjsRequested?: boolean;
  snarkjsSucceeded?: boolean;
  findingCount: number;
}): number {
  let score = 100;
  if (!options.configLoaded) score -= 30;
  if (!options.baselineLoaded) score -= 20;
  if (!options.circomspectAvailable) score -= 10;
  if (options.compilerArtifactsRequested && !options.circomAvailable) score -= 12;
  else if (options.compilerArtifactsRequested && !options.compilerArtifactsSucceeded) score -= 10;
  if (options.snarkjsRequested && !options.snarkjsSucceeded) score -= 6;
  if (options.findingCount >= 20) score -= 10;
  return clamp(score);
}

export function computeMetrics(findings: Finding[], protocolDriftIndex: number, confidence: number, protocolDriftKnown = true): Metrics {
  const staticFindingRisk = findingRisk(findings, "static");
  const verifierBindingRisk = findingRisk(findings, "verifier");
  const invariantCoverageScore = invariantCoverage(findings);
  const invariantCoverageRisk = 100 - invariantCoverageScore;
  const driftRiskForPosture = protocolDriftKnown ? protocolDriftIndex : 35;
  const circuitIntegrityRisk = clamp(
    0.35 * invariantCoverageRisk +
      0.25 * staticFindingRisk +
      0.25 * verifierBindingRisk +
      0.15 * driftRiskForPosture
  );
  const securityPostureRisk = clamp(
    0.25 * driftRiskForPosture +
      0.25 * circuitIntegrityRisk +
      0.20 * invariantCoverageRisk +
      0.15 * verifierBindingRisk +
      0.10 * staticFindingRisk +
      0.05 * (100 - confidence)
  );
  return {
    protocolDriftIndex: protocolDriftKnown ? Math.round(protocolDriftIndex) : null,
    protocolDriftStatus: protocolDriftKnown ? "known" : "unknown",
    circuitIntegrityRisk: Math.round(circuitIntegrityRisk),
    invariantCoverageScore: Math.round(invariantCoverageScore),
    verifierBindingRisk: Math.round(verifierBindingRisk),
    staticFindingRisk: Math.round(staticFindingRisk),
    scanConfidence: Math.round(confidence),
    securityPostureRisk: Math.round(securityPostureRisk),
  };
}

export function computeAuditGate(findings: Finding[], metrics: Metrics): AuditGate {
  const reasons: string[] = [];
  let state: AuditGateState = "PASS";

  const applyState = (next: AuditGateState, reason: string): void => {
    const rank: Record<AuditGateState, number> = {
      PASS: 0,
      WARN: 1,
      MANUAL_REVIEW: 2,
      REBASELINE_REQUIRED: 3,
      BLOCK_CI: 4,
    };
    if (rank[next] > rank[state]) state = next;
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  for (const finding of findings) {
    if (finding.severity === "critical") {
      applyState("BLOCK_CI", `${finding.title}: ${finding.message}`);
    } else if (finding.gateImpact) {
      applyState(finding.gateImpact, `${finding.title}: ${finding.message}`);
    } else if (severityRank(finding.severity) >= severityRank("high")) {
      applyState("MANUAL_REVIEW", `${finding.title}: ${finding.message}`);
    }
  }

  if (metrics.protocolDriftStatus === "unknown") {
    applyState("MANUAL_REVIEW", "Protocol Drift is unknown because no trusted baseline is loaded.");
  } else if ((metrics.protocolDriftIndex ?? 0) >= 75) applyState("BLOCK_CI", "Protocol Drift Index is critical.");
  else if ((metrics.protocolDriftIndex ?? 0) >= 55) applyState("MANUAL_REVIEW", "Protocol Drift Index is high.");

  if (metrics.scanConfidence < 60) applyState("MANUAL_REVIEW", "Scan confidence is low.");
  else if (metrics.scanConfidence < 80) applyState("WARN", "Scan confidence is limited.");

  if (state === "PASS") reasons.push("No configured critical drift or invariant findings detected.");
  return { state, reasons };
}
