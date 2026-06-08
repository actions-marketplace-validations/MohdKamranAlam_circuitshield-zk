import type { CircuitConfig, Finding, InvariantStatus, ProjectConfig, Severity } from "./types.js";

export function buildInvariantStatuses(config: ProjectConfig, findings: Finding[]): InvariantStatus[] {
  const circuits = config.circuits ?? [];
  return circuits.flatMap((circuit) => (circuit.invariants ?? []).map((invariant, index) => {
    const id = invariant.id ?? `${invariant.type}_${index + 1}`;
    const related = findings.filter((finding) => finding.invariantId === id && finding.file === circuit.path);
    return {
      id,
      type: invariant.type,
      severity: invariant.severity ?? "high" as Severity,
      circuitId: circuit.id,
      circuitPath: circuit.path,
      status: statusFromFindings(related),
      findingIds: related.map((finding) => finding.id),
    };
  }));
}

function statusFromFindings(findings: Finding[]): InvariantStatus["status"] {
  if (findings.length === 0) return "covered";
  if (findings.some((finding) => finding.id.includes("missing") || finding.id.includes("uncovered"))) return "missing";
  return "weak";
}

export function invariantCount(config: ProjectConfig): number {
  return (config.circuits ?? []).reduce((sum: number, circuit: CircuitConfig) => sum + (circuit.invariants?.length ?? 0), 0);
}
