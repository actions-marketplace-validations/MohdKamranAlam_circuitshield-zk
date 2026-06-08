import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildStarterConfig } from "../dist/config.js";
import { renderMarkdown } from "../dist/reporters/markdown.js";

const root = await mkdtemp(path.join(tmpdir(), "circuitshield-test-"));

try {
  await mkdir(path.join(root, "circuits"), { recursive: true });
  await mkdir(path.join(root, "contracts"), { recursive: true });
  await writeFile(
    path.join(root, "circuits", "withdraw.circom"),
    `pragma circom 2.0.0;
template Withdraw() {
  signal input merkleRoot;
  signal input nullifierHash;
  signal output out;
  out <== merkleRoot + nullifierHash;
}
component main { public [merkleRoot, nullifierHash] } = Withdraw();
`,
    "utf8",
  );
  await writeFile(path.join(root, "contracts", "WithdrawVerifier.sol"), "contract WithdrawVerifier {}", "utf8");

  const config = await buildStarterConfig(root);
  assert.match(config, /name: .*circuitshield-test-/);
  assert.match(config, /path: circuits\/withdraw\.circom/);
  assert.match(config, /contract: contracts\/WithdrawVerifier\.sol/);
  assert.match(config, /merkleRoot/);
  assert.match(config, /nullifierHash/);
  assert.doesNotMatch(config, /&a\d|public_input_order: \*a\d/);

  const report = renderMarkdown(fakeResult());
  assert.match(report, /## Executive Summary/);
  assert.match(report, /Recommended action: Block CI\/release/);
  assert.match(report, /Findings: 1 critical, 0 high, 1 medium, 0 low, 0 info/);
  assert.doesNotMatch(report, /\x1b\[/);
  assert.doesNotMatch(report, /node_modules/);
} finally {
  await rm(root, { recursive: true, force: true });
}

function fakeResult() {
  return {
    version: "0.1.0",
    scannedAt: "2026-06-08T00:00:00.000Z",
    root,
    projectName: "demo",
    configPath: "circuitshield.yml",
    findings: [
      {
        id: "critical_demo",
        title: "Critical demo finding",
        severity: "critical",
        category: "invariant",
        source: "test",
        file: "circuits/withdraw.circom",
        message: "Critical issue",
        gateImpact: "BLOCK_CI",
        confidence: 0.9,
      },
      {
        id: "snarkjs_demo",
        title: "snarkjs R1CS inspection failed",
        severity: "medium",
        category: "tooling",
        source: "snarkjs",
        file: "artifacts/withdraw.r1cs",
        message: "\u001b[31mError:\u001b[0m Invalid File format at node_modules/snarkjs",
        recommendation: "Regenerate the R1CS artifact.",
        gateImpact: "WARN",
        confidence: 0.6,
      },
    ],
    suppressedFindings: [],
    metrics: {
      protocolDriftIndex: null,
      protocolDriftStatus: "unknown",
      circuitIntegrityRisk: 80,
      invariantCoverageScore: 20,
      verifierBindingRisk: 70,
      staticFindingRisk: 60,
      scanConfidence: 50,
      securityPostureRisk: 75,
    },
    invariantStatuses: [],
    verifierChecks: [],
    auditGate: {
      state: "BLOCK_CI",
      reasons: ["\u001b[31mCritical reason\u001b[0m"],
    },
    snapshots: {
      circuits: [{ id: "withdraw", path: "circuits/withdraw.circom" }],
      verifiers: [{ id: "withdraw_verifier", path: "contracts/WithdrawVerifier.sol" }],
      dependencyHashes: {},
      artifactHashes: { "circuits/withdraw.circom": "abc" },
      compilerArtifactHashes: {},
      artifactInspections: [],
      artifactDrift: [],
      toolVersions: {},
    },
    toolStatus: {
      configLoaded: true,
      baselineLoaded: false,
      tools: [],
    },
  };
}
