import path from "node:path";
import type { BaselineSnapshot, Finding, ProjectConfig, ScanResult, ToolExecutionStatus } from "./types.js";
import { loadConfig } from "./config.js";
import { discoverRepo } from "./discovery.js";
import { analyzeCircomCircuit } from "./rules/circom.js";
import { analyzeVerifier } from "./rules/verifier.js";
import { compareBaseline } from "./baseline.js";
import { computeAuditGate, computeMetrics, invariantCoverage, scanConfidence } from "./scoring.js";
import { artifactHashes, buildCircuitSnapshot, buildVerifierSnapshot, dependencyHashes } from "./snapshot.js";
import { compileCircomArtifacts, detectToolVersions, inspectProofArtifacts, isCircomAvailable, isCircomspectAvailable, isSnarkjsAvailable, runCircomspect } from "./tooling.js";
import { normalizePath } from "./utils.js";
import { applySuppressions } from "./suppressions.js";
import { buildInvariantStatuses } from "./invariants.js";
import { buildVerifierChecks } from "./verifierChecks.js";

export interface ScanOptions {
  root: string;
  configPath?: string;
  baseline?: BaselineSnapshot;
  useCircomspect?: boolean;
  compileArtifacts?: boolean;
}

export async function scanProject(options: ScanOptions): Promise<ScanResult> {
  const root = path.resolve(options.root);
  const { config, path: loadedConfigPath } = await loadConfig(root, options.configPath);
  const repo = await discoverRepo(root);
  const configLoaded = Boolean(loadedConfigPath);
  const circomspectAvailable = isCircomspectAvailable();
  const circomAvailable = isCircomAvailable();
  const snarkjsAvailable = isSnarkjsAvailable();
  const circomspectRequested = options.useCircomspect !== false;
  const circomRequested = Boolean(options.compileArtifacts);
  const findings: Finding[] = [];

  if (!configLoaded) {
    findings.push(addFindingDefaults({
      id: "config_missing",
      title: "circuitshield.yml not found",
      severity: "medium",
      category: "configuration",
      source: "config",
      message: "No circuitshield.yml was found. The scan can run, but invariant intent and public input binding are limited.",
      recommendation: "Run 'circuitshield init' and declare critical protocol invariants.",
      gateImpact: "WARN",
    }));
  }

  const circuits = resolveCircuits(config, repo.circomFiles);
  const verifiers = resolveVerifiers(config, circuits);

  for (const circuit of circuits) {
    findings.push(...await analyzeCircomCircuit(root, circuit));
  }

  const circomspectRun = circomspectRequested && circomspectAvailable
    ? await runCircomspect(root, circuits.map((circuit) => circuit.path))
    : {
      findings: [],
      executed: false,
      succeeded: false,
      reason: toolReason(circomspectRequested, circomspectAvailable, circuits.length, "circomspect"),
    };

  if (circomspectRun.executed) {
    findings.push(...circomspectRun.findings);
  } else if (circomspectRequested && !circomspectAvailable) {
    findings.push(addFindingDefaults({
      id: "circomspect_unavailable",
      title: "Circomspect was requested but not executed",
      severity: "info",
      category: "tooling",
      source: "cli",
      message: "Circomspect was requested, but the 'circomspect' binary was not found on PATH.",
      recommendation: installHint("circomspect"),
    }));
  } else {
    findings.push(addFindingDefaults({
      id: "circomspect_disabled",
      title: "Circomspect integration disabled",
      severity: "info",
      category: "tooling",
      source: "cli",
      message: "Circomspect was not run because --no-circomspect was provided.",
    }));
  }

  for (const verifier of verifiers) {
    findings.push(...await analyzeVerifier(root, verifier));
  }

  const preDriftSuppression = await applySuppressions(root, config, findings);
  const preDriftFindings = preDriftSuppression.active;
  const coverageScore = invariantCoverage(preDriftFindings);
  const circuitSnapshots = await Promise.all(circuits.map((circuit) => buildCircuitSnapshot(root, circuit, coverageScore)));
  const verifierSnapshots = await Promise.all(verifiers.map((verifier) => buildVerifierSnapshot(root, verifier)));
  const deps = await dependencyHashes(root, config);
  const toolVersions = detectToolVersions();
  const trackedArtifactFiles = uniquePaths([
    ...repo.artifactFiles,
    ...circuits.map((circuit) => circuit.path),
    ...verifiers.map((verifier) => verifier.contract),
    ...(loadedConfigPath ? [normalizePath(path.relative(root, loadedConfigPath))] : []),
  ]);
  const artifacts = await artifactHashes(root, trackedArtifactFiles);
  const artifactInspection = await inspectProofArtifacts(root, repo.artifactFiles);
  preDriftFindings.push(...artifactInspection.findings);
  const compiledArtifacts = options.compileArtifacts
    ? await compileCircomArtifacts(root, circuits)
    : { hashes: {}, findings: [], executed: false, succeeded: false, reason: "not requested" };
  preDriftFindings.push(...compiledArtifacts.findings);

  const partialResult: ScanResult = {
    version: "0.1.0",
    scannedAt: new Date().toISOString(),
    root,
    projectName: config.project?.name ?? path.basename(root),
    configPath: loadedConfigPath ? normalizePath(path.relative(root, loadedConfigPath)) : undefined,
    baselineRef: options.baseline?.ref,
    findings: preDriftFindings,
    suppressedFindings: preDriftSuppression.suppressed,
    metrics: {
      protocolDriftIndex: 0,
      protocolDriftStatus: "known",
      circuitIntegrityRisk: 0,
      invariantCoverageScore: coverageScore,
      verifierBindingRisk: 0,
      staticFindingRisk: 0,
      scanConfidence: 0,
      securityPostureRisk: 0,
    },
    invariantStatuses: [],
    verifierChecks: [],
    auditGate: { state: "PASS", reasons: [] },
    snapshots: {
      circuits: circuitSnapshots,
      verifiers: verifierSnapshots,
      dependencyHashes: deps,
      artifactHashes: artifacts,
      compilerArtifactHashes: compiledArtifacts.hashes,
      artifactInspections: artifactInspection.inspections,
      artifactDrift: [],
      toolVersions,
    },
    toolStatus: {
      circomspectRequested,
      circomspectAvailable,
      circomspectExecuted: circomspectRun.executed,
      circomspectSucceeded: circomspectRun.succeeded,
      circomspectReason: circomspectRun.reason,
      circomspectVersion: toolVersions.circomspect,
      circomAvailable,
      circomRequested,
      circomCompilerExecuted: compiledArtifacts.executed,
      circomCompilerSucceeded: compiledArtifacts.succeeded,
      circomCompilerReason: compiledArtifacts.reason,
      circomVersion: toolVersions.circom,
      snarkjsAvailable,
      snarkjsRequested: repo.artifactFiles.some((file) => file.toLowerCase().endsWith(".r1cs")),
      snarkjsExecuted: artifactInspection.snarkjsExecuted,
      snarkjsSucceeded: artifactInspection.snarkjsSucceeded,
      snarkjsReason: artifactInspection.snarkjsReason,
      snarkjsVersion: toolVersions.snarkjs,
      nativeR1csInspectorExecuted: repo.artifactFiles.some((file) => file.toLowerCase().endsWith(".r1cs")),
      tools: [],
      configLoaded,
      baselineLoaded: Boolean(options.baseline),
      compilerArtifactsRequested: Boolean(options.compileArtifacts),
    },
  };

  const drift = compareBaseline(options.baseline, partialResult);
  partialResult.snapshots.artifactDrift = drift.artifactDrift;
  const finalSuppression = await applySuppressions(root, config, decorateFindings([...preDriftFindings, ...drift.findings]));
  partialResult.findings = finalSuppression.active;
  partialResult.suppressedFindings = mergeSuppressed(preDriftSuppression.suppressed, finalSuppression.suppressed);
  partialResult.invariantStatuses = buildInvariantStatuses(config, partialResult.findings);
  partialResult.verifierChecks = buildVerifierChecks(config, partialResult.snapshots.verifiers, partialResult.findings);
  const confidence = scanConfidence({
    configLoaded,
    baselineLoaded: Boolean(options.baseline),
    circomspectAvailable: circomspectRun.succeeded,
    circomAvailable,
    compilerArtifactsRequested: Boolean(options.compileArtifacts),
    compilerArtifactsSucceeded: compiledArtifacts.succeeded,
    snarkjsRequested: partialResult.toolStatus.snarkjsRequested,
    snarkjsSucceeded: artifactInspection.snarkjsSucceeded,
    findingCount: partialResult.findings.length,
  });
  partialResult.toolStatus.tools = buildToolStatuses(partialResult);
  partialResult.metrics = computeMetrics(partialResult.findings, drift.driftIndex, confidence, drift.driftKnown);
  partialResult.auditGate = computeAuditGate(partialResult.findings, partialResult.metrics);
  return partialResult;
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean).map((item) => normalizePath(item))));
}

function buildToolStatuses(result: ScanResult): ToolExecutionStatus[] {
  const status = result.toolStatus;
  return [
    {
      name: "circom",
      requested: status.circomRequested,
      available: status.circomAvailable,
      executed: status.circomCompilerExecuted,
      succeeded: status.circomCompilerSucceeded,
      version: status.circomVersion,
      reason: status.circomCompilerReason ?? "unknown",
      installHint: installHint("circom"),
      confidenceImpact: status.circomRequested && !status.circomCompilerSucceeded ? 12 : 0,
    },
    {
      name: "circomspect",
      requested: status.circomspectRequested,
      available: status.circomspectAvailable,
      executed: status.circomspectExecuted,
      succeeded: status.circomspectSucceeded,
      version: status.circomspectVersion,
      reason: status.circomspectReason ?? "unknown",
      installHint: installHint("circomspect"),
      confidenceImpact: status.circomspectRequested && !status.circomspectSucceeded ? 10 : 0,
    },
    {
      name: "snarkjs",
      requested: status.snarkjsRequested,
      available: status.snarkjsAvailable,
      executed: status.snarkjsExecuted,
      succeeded: status.snarkjsSucceeded,
      version: status.snarkjsVersion,
      reason: status.snarkjsReason ?? "unknown",
      installHint: installHint("snarkjs"),
      confidenceImpact: status.snarkjsRequested && !status.snarkjsSucceeded ? 6 : 0,
    },
    {
      name: "native_r1cs",
      requested: status.snarkjsRequested,
      available: true,
      executed: status.nativeR1csInspectorExecuted,
      succeeded: status.nativeR1csInspectorExecuted,
      reason: status.nativeR1csInspectorExecuted ? "native R1CS header validation executed" : "no R1CS artifacts discovered",
      confidenceImpact: 0,
    },
  ];
}

function installHint(tool: "circom" | "circomspect" | "snarkjs"): string {
  if (tool === "circom") return "Install Circom 2 and ensure 'circom' is on PATH. See https://docs.circom.io/getting-started/installation/";
  if (tool === "circomspect") return "Install Circomspect and ensure 'circomspect' is on PATH. See https://github.com/trailofbits/circomspect";
  return "Install snarkjs and ensure 'snarkjs' is on PATH, for example: npm install -g snarkjs";
}

function toolReason(requested: boolean, available: boolean, circuitCount: number, binary: string): string {
  if (!requested) return "not requested";
  if (!available) return `${binary} binary not found on PATH`;
  if (circuitCount === 0) return "no Circom circuits discovered";
  return "executed";
}

function decorateFindings(findings: Finding[]): Finding[] {
  return findings.map(addFindingDefaults);
}

function addFindingDefaults(finding: Finding): Finding {
  return {
    ...finding,
    confidence: finding.confidence ?? confidenceForFinding(finding),
  };
}

function confidenceForFinding(finding: Finding): number {
  if (finding.category === "baseline_drift") return finding.id === "baseline_missing" ? 1 : 0.9;
  if (finding.source === "circom-metadata") return 0.78;
  if (finding.source === "invariant-checker") return 0.72;
  if (finding.source === "verifier-checker") return 0.7;
  if (finding.source === "custom-circom-rule") return 0.74;
  if (finding.source === "circomspect") return 0.8;
  return 0.6;
}

function mergeSuppressed(...groups: Array<NonNullable<ScanResult["suppressedFindings"]>>): ScanResult["suppressedFindings"] {
  const seen = new Set<string>();
  const merged: ScanResult["suppressedFindings"] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = `${item.finding.id}:${item.finding.file ?? ""}:${item.finding.line ?? ""}:${item.source}:${item.reason}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function resolveCircuits(config: ProjectConfig, discoveredCircomFiles: string[]): NonNullable<ProjectConfig["circuits"]> {
  if (config.circuits && config.circuits.length > 0) return config.circuits;
  return discoveredCircomFiles.map((file, index) => ({
    id: path.basename(file, ".circom") || `circuit_${index + 1}`,
    path: file,
    framework: "circom",
    public_inputs: [],
    invariants: [],
  }));
}

function resolveVerifiers(config: ProjectConfig, circuits: NonNullable<ProjectConfig["circuits"]>): NonNullable<ProjectConfig["verifiers"]> {
  const explicit = config.verifiers ?? [];
  const fromCircuits = circuits
    .filter((circuit) => circuit.verifier)
    .map((circuit) => ({
      id: `${circuit.id}_verifier`,
      contract: String(circuit.verifier),
      circuit: circuit.id,
      public_input_order: circuit.public_inputs ?? [],
    }));
  const seen = new Set<string>();
  return [...explicit, ...fromCircuits].filter((verifier) => {
    const key = `${verifier.id}:${verifier.contract}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
