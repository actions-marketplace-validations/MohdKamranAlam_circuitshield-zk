import { promises as fs } from "node:fs";
import path from "node:path";
import type { ArtifactDriftComparison, BaselineSnapshot, Finding, ScanResult } from "./types.js";
import { clamp, pathExists, safeRef, severityRank } from "./utils.js";

export function baselinePath(root: string, ref: string): string {
  return path.join(root, ".circuitshield", "baselines", `${safeRef(ref)}.json`);
}

export async function saveBaseline(root: string, snapshot: BaselineSnapshot): Promise<string> {
  const target = baselinePath(root, snapshot.ref);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(snapshot, null, 2), "utf8");
  return target;
}

export async function loadBaseline(root: string, ref?: string): Promise<BaselineSnapshot | undefined> {
  if (!ref) return undefined;
  const target = baselinePath(root, ref);
  if (!(await pathExists(target))) return undefined;
  return JSON.parse(await fs.readFile(target, "utf8")) as BaselineSnapshot;
}

export function toBaselineSnapshot(result: ScanResult, ref: string): BaselineSnapshot {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    ref,
    project: result.projectName,
    circuits: result.snapshots.circuits,
    verifiers: result.snapshots.verifiers,
    dependencyHashes: result.snapshots.dependencyHashes,
    artifactHashes: result.snapshots.artifactHashes,
    compilerArtifactHashes: result.snapshots.compilerArtifactHashes,
    artifactInspections: result.snapshots.artifactInspections,
    toolVersions: result.snapshots.toolVersions,
  };
}

export function compareBaseline(baseline: BaselineSnapshot | undefined, result: ScanResult): { findings: Finding[]; driftIndex: number; driftKnown: boolean; artifactDrift: ArtifactDriftComparison[] } {
  if (!baseline) {
    return {
      driftIndex: 0,
      driftKnown: false,
      artifactDrift: buildArtifactDrift(undefined, result),
      findings: [
        {
          id: "baseline_missing",
          title: "Audited baseline is missing",
          severity: "medium",
          category: "baseline_drift",
          source: "baseline-diff",
          message: "No baseline snapshot was loaded. Protocol drift cannot be fully assessed.",
          recommendation: "Create a baseline from the last audited commit with 'circuitshield baseline create --ref <audit-ref>'.",
          gateImpact: "MANUAL_REVIEW",
          confidence: 1,
        },
      ],
    };
  }

  const findings: Finding[] = [];
  const artifactDrift = buildArtifactDrift(baseline, result);
  let drift = 0;

  for (const current of result.snapshots.circuits) {
    const previous = baseline.circuits.find((item) => item.id === current.id || item.path === current.path);
    if (!previous) {
      drift += 25;
      findings.push({
        id: "new_circuit_since_baseline",
        title: "New circuit since baseline",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Circuit '${current.id}' did not exist in baseline '${baseline.ref}'.`,
        recommendation: "Require manual review before treating this release as audit-equivalent.",
        gateImpact: "MANUAL_REVIEW",
      });
      continue;
    }

    const constraintDelta = current.constraintLikeCount - previous.constraintLikeCount;
    if (constraintDelta < 0) {
      const magnitude = Math.min(35, Math.abs(constraintDelta) / Math.max(previous.constraintLikeCount, 1) * 100);
      drift += magnitude;
      findings.push({
        id: "constraint_count_drop",
        title: "Constraint count dropped from audited baseline",
        severity: magnitude >= 10 ? "high" : "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Constraint-like count changed from ${previous.constraintLikeCount} to ${current.constraintLikeCount}.`,
        recommendation: "Confirm constraints were intentionally removed and no invariant was weakened.",
        gateImpact: "MANUAL_REVIEW",
        metadata: { previous: previous.constraintLikeCount, current: current.constraintLikeCount },
      });
    }

    if (current.unsafeAssignmentCount > previous.unsafeAssignmentCount) {
      drift += 20;
      findings.push({
        id: "unsafe_assignment_increase",
        title: "Unsafe witness assignments increased",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Unsafe '<--' assignments increased from ${previous.unsafeAssignmentCount} to ${current.unsafeAssignmentCount}.`,
        recommendation: "Review new witness assignments and add explicit constraints.",
        gateImpact: "MANUAL_REVIEW",
      });
    }

    const previousInputs = previous.publicInputs.join(",");
    const currentInputs = current.publicInputs.join(",");
    if (previousInputs !== currentInputs) {
      drift += 25;
      findings.push({
        id: "public_input_list_changed",
        title: "Public input list changed from baseline",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Public inputs changed from [${previousInputs}] to [${currentInputs}].`,
        recommendation: "Confirm verifier/public-input order and protocol binding before merge.",
        gateImpact: "MANUAL_REVIEW",
      });
    }

    const previousActualInputs = (previous.actualPublicInputs ?? []).join(",");
    const currentActualInputs = (current.actualPublicInputs ?? []).join(",");
    if (previousActualInputs !== currentActualInputs) {
      drift += 25;
      findings.push({
        id: "circom_public_input_list_changed",
        title: "Actual Circom public input list changed from baseline",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Circom component main public inputs changed from [${previousActualInputs}] to [${currentActualInputs}].`,
        recommendation: "Confirm verifier public input order and audit assumptions before merge.",
        gateImpact: "MANUAL_REVIEW",
      });
    }

    const previousSignalCounts = previous.signalCounts ?? { input: 0, output: 0, internal: 0 };
    if (
      previousSignalCounts.input !== current.signalCounts.input ||
      previousSignalCounts.output !== current.signalCounts.output ||
      previousSignalCounts.internal !== current.signalCounts.internal
    ) {
      drift += 10;
      findings.push({
        id: "circom_signal_shape_changed",
        title: "Circuit signal shape changed from baseline",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Signal counts changed from input=${previousSignalCounts.input}, output=${previousSignalCounts.output}, internal=${previousSignalCounts.internal} to input=${current.signalCounts.input}, output=${current.signalCounts.output}, internal=${current.signalCounts.internal}.`,
        recommendation: "Review whether signal shape changes affect public inputs, witnesses, or invariants.",
      });
    }

    if (current.invariantCoverageScore < previous.invariantCoverageScore) {
      const drop = previous.invariantCoverageScore - current.invariantCoverageScore;
      drift += drop * 0.5;
      findings.push({
        id: "invariant_coverage_drop",
        title: "Invariant coverage dropped from baseline",
        severity: drop >= 25 ? "critical" : "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Invariant coverage dropped from ${previous.invariantCoverageScore}% to ${current.invariantCoverageScore}%.`,
        recommendation: "Restore invariant coverage or require audit approval before re-baselining.",
        gateImpact: drop >= 25 ? "BLOCK_CI" : "MANUAL_REVIEW",
      });
    }
  }

  for (const current of result.snapshots.verifiers) {
    const previous = baseline.verifiers.find((item) => item.id === current.id || item.path === current.path);
    if (!previous) continue;
    if (previous.sha256 && current.sha256 && previous.sha256 !== current.sha256) {
      drift += 30;
      findings.push({
        id: "verifier_hash_changed",
        title: "Verifier artifact changed from baseline",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: `Verifier '${current.id}' changed since baseline '${baseline.ref}'.`,
        recommendation: "Require manual review and re-baseline only after approval.",
        gateImpact: "REBASELINE_REQUIRED",
      });
    }
    if (previous.publicInputOrder.join(",") !== current.publicInputOrder.join(",")) {
      drift += 25;
      findings.push({
        id: "verifier_public_input_order_changed",
        title: "Verifier public input order changed",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file: current.path,
        message: "Verifier public input order changed from the audited baseline.",
        recommendation: "Confirm input ordering with the circuit and verifier key before merge.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
  }

  for (const [file, hash] of Object.entries(result.snapshots.dependencyHashes)) {
    if (baseline.dependencyHashes[file] && baseline.dependencyHashes[file] !== hash) {
      drift += 10;
      findings.push({
        id: "dependency_hash_changed",
        title: "Dependency manifest changed",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} changed since baseline '${baseline.ref}'.`,
        recommendation: "Review dependency/toolchain changes for proving, witness, or verifier impact.",
      });
    }
  }

  const baselineToolVersions = baseline.toolVersions ?? {};
  for (const [tool, version] of Object.entries(result.snapshots.toolVersions)) {
    if (baselineToolVersions[tool] && baselineToolVersions[tool] !== version) {
      drift += 10;
      findings.push({
        id: "tool_version_changed",
        title: "ZK toolchain version changed",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file: tool,
        message: `${tool} changed from '${baselineToolVersions[tool]}' to '${version}' since baseline '${baseline.ref}'.`,
        recommendation: "Review compiler/analyzer version changes before treating output as audit-equivalent.",
        metadata: { previous: baselineToolVersions[tool], current: version },
      });
    }
  }

  const baselineArtifactHashes = baseline.artifactHashes ?? {};
  for (const [file, hash] of Object.entries(result.snapshots.artifactHashes)) {
    if (!baselineArtifactHashes[file]) {
      drift += 15;
      findings.push({
        id: "new_proof_artifact_since_baseline",
        title: "New proof artifact since baseline",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} did not exist in baseline '${baseline.ref}'.`,
        recommendation: "Review whether the artifact belongs to an audited circuit and verifier key.",
        gateImpact: "MANUAL_REVIEW",
      });
    } else if (baselineArtifactHashes[file] !== hash) {
      drift += 25;
      findings.push({
        id: "proof_artifact_hash_changed",
        title: "Proof artifact changed from baseline",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} changed since baseline '${baseline.ref}'.`,
        recommendation: "Require manual review before treating changed R1CS/zkey/wasm artifacts as audit-equivalent.",
        gateImpact: "REBASELINE_REQUIRED",
      });
    }
  }

  const baselineCompilerArtifactHashes = (baseline as BaselineSnapshot & { compilerArtifactHashes?: Record<string, string> }).compilerArtifactHashes ?? {};
  for (const [file, hash] of Object.entries(result.snapshots.compilerArtifactHashes)) {
    if (!baselineCompilerArtifactHashes[file]) {
      drift += 15;
      findings.push({
        id: "new_compiled_artifact_since_baseline",
        title: "New compiled artifact since baseline",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} did not exist in compiled baseline artifacts for '${baseline.ref}'.`,
        recommendation: "Review compiled artifact changes and re-baseline only after approval.",
        gateImpact: "MANUAL_REVIEW",
      });
    } else if (baselineCompilerArtifactHashes[file] !== hash) {
      drift += 30;
      findings.push({
        id: "compiled_artifact_hash_changed",
        title: "Compiled artifact changed from baseline",
        severity: "high",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} changed since compiled baseline '${baseline.ref}'.`,
        recommendation: "Treat changed compiled artifacts as re-baseline-required unless reviewed by an auditor.",
        gateImpact: "REBASELINE_REQUIRED",
      });
    }
  }

  for (const file of Object.keys(baselineCompilerArtifactHashes)) {
    if (!result.snapshots.compilerArtifactHashes[file]) {
      drift += 15;
      findings.push({
        id: "compiled_artifact_missing_since_baseline",
        title: "Compiled artifact missing since baseline",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} existed in compiled baseline artifacts for '${baseline.ref}' but is missing now.`,
        recommendation: "Run with --compile or verify why the compiled artifact is no longer generated.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
  }

  for (const file of Object.keys(baselineArtifactHashes)) {
    if (!result.snapshots.artifactHashes[file]) {
      drift += 15;
      findings.push({
        id: "proof_artifact_removed_since_baseline",
        title: "Proof artifact removed since baseline",
        severity: "medium",
        category: "baseline_drift",
        source: "baseline-diff",
        file,
        message: `${file} existed in baseline '${baseline.ref}' but is missing now.`,
        recommendation: "Confirm artifact removal is intentional and does not hide a verifier/circuit mismatch.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
  }

  const maxSeverity = findings.reduce((max, finding) => Math.max(max, severityRank(finding.severity)), 0);
  if (maxSeverity >= severityRank("critical")) drift = Math.max(drift, 75);
  else if (maxSeverity >= severityRank("high")) drift = Math.max(drift, 55);
  return { findings, driftIndex: clamp(drift), driftKnown: true, artifactDrift };
}

function buildArtifactDrift(baseline: BaselineSnapshot | undefined, result: ScanResult): ArtifactDriftComparison[] {
  const rows: ArtifactDriftComparison[] = [];
  addHashRows(rows, "repository", result.snapshots.artifactHashes, baseline?.artifactHashes);
  addHashRows(rows, "compiled", result.snapshots.compilerArtifactHashes, baseline?.compilerArtifactHashes);
  addHashRows(rows, "dependency", result.snapshots.dependencyHashes, baseline?.dependencyHashes);
  addHashRows(rows, "tool", result.snapshots.toolVersions, baseline?.toolVersions);
  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
}

function addHashRows(
  rows: ArtifactDriftComparison[],
  kind: ArtifactDriftComparison["kind"],
  current: Record<string, string>,
  baseline: Record<string, string> | undefined
): void {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline ?? {})]);
  for (const key of keys) {
    const currentHash = current[key];
    const baselineHash = baseline?.[key];
    const status: ArtifactDriftComparison["status"] = !baseline
      ? "not_tracked"
      : currentHash && !baselineHash
        ? "new"
        : !currentHash && baselineHash
          ? "removed"
          : currentHash === baselineHash
            ? "unchanged"
            : "changed";
    rows.push({
      path: key,
      kind,
      currentHash,
      baselineHash,
      status,
      riskImpact: riskForArtifactStatus(kind, status),
      gateImpact: gateForArtifactStatus(kind, status),
    });
  }
}

function riskForArtifactStatus(kind: ArtifactDriftComparison["kind"], status: ArtifactDriftComparison["status"]): ArtifactDriftComparison["riskImpact"] {
  if (status === "unchanged") return "none";
  if (status === "not_tracked") return "low";
  if (kind === "repository" || kind === "compiled") return status === "changed" ? "high" : "medium";
  if (kind === "tool") return "medium";
  return "medium";
}

function gateForArtifactStatus(kind: ArtifactDriftComparison["kind"], status: ArtifactDriftComparison["status"]): ArtifactDriftComparison["gateImpact"] | undefined {
  if (status === "unchanged" || status === "not_tracked") return undefined;
  if (kind === "repository" || kind === "compiled") return "REBASELINE_REQUIRED";
  return "MANUAL_REVIEW";
}
