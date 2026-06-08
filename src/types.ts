export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AuditGateState = "PASS" | "WARN" | "MANUAL_REVIEW" | "BLOCK_CI" | "REBASELINE_REQUIRED";

export interface ProjectConfig {
  version: number;
  project?: {
    name?: string;
    baseline?: {
      type?: "git" | "snapshot";
      ref?: string;
    };
  };
  policy?: {
    fail_on?: string[];
    require_manual_review?: string[];
  };
  circuits?: CircuitConfig[];
  verifiers?: VerifierConfig[];
  suppressions?: SuppressionConfig[];
}

export interface SuppressionConfig {
  id?: string;
  category?: Finding["category"];
  file?: string;
  reason: string;
  expires?: string;
}

export interface CircuitConfig {
  id: string;
  path: string;
  framework?: "circom" | "noir" | "halo2" | "gnark" | string;
  verifier?: string;
  public_inputs?: string[];
  invariants?: InvariantConfig[];
}

export interface InvariantConfig {
  id?: string;
  type: string;
  severity?: Severity;
  signal?: string;
  signals?: string[];
  root?: string;
  bits?: number;
  [key: string]: unknown;
}

export interface VerifierConfig {
  id: string;
  contract: string;
  circuit?: string;
  public_input_order?: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category:
    | "static"
    | "invariant"
    | "verifier"
    | "baseline_drift"
    | "configuration"
    | "tooling";
  file?: string;
  line?: number;
  source: string;
  message: string;
  recommendation?: string;
  invariantId?: string;
  gateImpact?: AuditGateState;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface SuppressedFinding {
  finding: Finding;
  reason: string;
  source: "config" | "inline";
}

export interface DiscoveredRepo {
  root: string;
  circomFiles: string[];
  solidityFiles: string[];
  artifactFiles: string[];
  packageFiles: string[];
}

export interface CircomSignalMetadata {
  name: string;
  kind: "input" | "output" | "internal";
  line: number;
}

export interface CircomConstraintMetadata {
  line: number;
  text: string;
  identifiers: string[];
  tautological: boolean;
}

export interface CircomMetadata {
  publicInputs: string[];
  signals: CircomSignalMetadata[];
  constraints: CircomConstraintMetadata[];
  constrainedSignals: Record<string, number>;
  meaningfulConstrainedSignals: Record<string, number>;
  unsafeAssignments: Array<{ signal: string; line: number; text: string }>;
  constraintLikeCount: number;
  unsafeAssignmentCount: number;
}

export interface CircuitSnapshot {
  id: string;
  path: string;
  sha256?: string;
  constraintLikeCount: number;
  unsafeAssignmentCount: number;
  publicInputs: string[];
  actualPublicInputs: string[];
  signalCounts: {
    input: number;
    output: number;
    internal: number;
  };
  invariantCoverageScore: number;
}

export interface VerifierSnapshot {
  id: string;
  path: string;
  sha256?: string;
  publicInputOrder: string[];
}

export interface BaselineSnapshot {
  version: 1;
  createdAt: string;
  ref: string;
  project?: string;
  circuits: CircuitSnapshot[];
  verifiers: VerifierSnapshot[];
  dependencyHashes: Record<string, string>;
  artifactHashes?: Record<string, string>;
  compilerArtifactHashes?: Record<string, string>;
  artifactInspections?: ArtifactInspection[];
  toolVersions?: Record<string, string>;
}

export interface Metrics {
  protocolDriftIndex: number | null;
  protocolDriftStatus: "known" | "unknown";
  circuitIntegrityRisk: number;
  invariantCoverageScore: number;
  verifierBindingRisk: number;
  staticFindingRisk: number;
  scanConfidence: number;
  securityPostureRisk: number;
}

export interface InvariantStatus {
  id: string;
  type: string;
  severity: Severity;
  circuitId: string;
  circuitPath: string;
  status: "covered" | "weak" | "missing";
  findingIds: string[];
}

export interface VerifierBindingCheck {
  id: string;
  verifierId: string;
  contract: string;
  label: string;
  status: "pass" | "weak" | "missing" | "unknown";
  detail: string;
  findingIds: string[];
}

export interface ArtifactInspection {
  path: string;
  kind: "r1cs" | "wasm" | "sym" | "zkey" | "ptau" | "verification_key" | "unknown";
  status: "valid" | "weak" | "invalid" | "unknown";
  detail: string;
  sha256?: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactDriftComparison {
  path: string;
  kind: "repository" | "compiled" | "dependency" | "tool";
  currentHash?: string;
  baselineHash?: string;
  status: "new" | "removed" | "changed" | "unchanged" | "not_tracked";
  riskImpact: "none" | "low" | "medium" | "high";
  gateImpact?: AuditGateState;
}

export interface ToolExecutionStatus {
  name: "circom" | "circomspect" | "snarkjs" | "native_r1cs";
  requested: boolean;
  available: boolean;
  executed: boolean;
  succeeded: boolean;
  version?: string;
  reason: string;
  installHint?: string;
  confidenceImpact: number;
}

export interface AuditGate {
  state: AuditGateState;
  reasons: string[];
}

export interface ScanResult {
  version: string;
  scannedAt: string;
  root: string;
  projectName: string;
  configPath?: string;
  baselineRef?: string;
  findings: Finding[];
  suppressedFindings: SuppressedFinding[];
  metrics: Metrics;
  invariantStatuses: InvariantStatus[];
  verifierChecks: VerifierBindingCheck[];
  auditGate: AuditGate;
  snapshots: {
    circuits: CircuitSnapshot[];
    verifiers: VerifierSnapshot[];
    dependencyHashes: Record<string, string>;
    artifactHashes: Record<string, string>;
    compilerArtifactHashes: Record<string, string>;
    artifactInspections: ArtifactInspection[];
    artifactDrift: ArtifactDriftComparison[];
    toolVersions: Record<string, string>;
  };
  toolStatus: {
    circomspectRequested: boolean;
    circomspectAvailable: boolean;
    circomspectExecuted: boolean;
    circomspectSucceeded: boolean;
    circomspectReason?: string;
    circomspectVersion?: string;
    circomAvailable: boolean;
    circomCompilerExecuted: boolean;
    circomCompilerSucceeded: boolean;
    circomCompilerReason?: string;
    circomVersion?: string;
    circomRequested: boolean;
    snarkjsAvailable: boolean;
    snarkjsRequested: boolean;
    snarkjsExecuted: boolean;
    snarkjsSucceeded: boolean;
    snarkjsReason?: string;
    snarkjsVersion?: string;
    nativeR1csInspectorExecuted: boolean;
    tools: ToolExecutionStatus[];
    configLoaded: boolean;
    baselineLoaded: boolean;
    compilerArtifactsRequested: boolean;
  };
}

export interface BenchmarkCaseResult {
  id: string;
  path: string;
  expectedGate?: AuditGateState;
  actualGate: AuditGateState;
  passedExpectation: boolean;
  expectedFindingIds: string[];
  missingExpectedFindingIds: string[];
  forbiddenFindingIds: string[];
  presentForbiddenFindingIds: string[];
  findings: number;
  criticalFindings: number;
  highFindings: number;
  securityPostureRisk: number;
}

export interface BenchmarkReport {
  version: string;
  scannedAt: string;
  root: string;
  cases: BenchmarkCaseResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface BaselineDriftDemoReport {
  version: string;
  scannedAt: string;
  root: string;
  baselineRef: string;
  audited: ScanResult;
  auditedWithBaseline: ScanResult;
  current: ScanResult;
  summary: {
    auditedGate: AuditGateState;
    auditedWithBaselineGate: AuditGateState;
    currentGate: AuditGateState;
    currentDrift: number | null;
    driftStatus: "known" | "unknown";
    driftFindings: number;
    artifactDriftFindings: number;
    verifierDriftFindings: number;
  };
}
