import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ProjectConfig } from "./types.js";
import { pathExists } from "./utils.js";

export const DEFAULT_CONFIG_NAME = "circuitshield.yml";

export async function findConfig(root: string, explicitPath?: string): Promise<string | undefined> {
  if (explicitPath) {
    const candidates = path.isAbsolute(explicitPath)
      ? [explicitPath]
      : [path.resolve(explicitPath), path.join(root, explicitPath)];
    for (const candidate of candidates) {
      if (await pathExists(candidate)) return candidate;
    }
    return undefined;
  }
  for (const name of ["circuitshield.yml", "circuitshield.yaml"]) {
    const candidate = path.join(root, name);
    if (await pathExists(candidate)) return candidate;
  }
  return undefined;
}

export async function loadConfig(root: string, explicitPath?: string): Promise<{ config: ProjectConfig; path?: string }> {
  const configPath = await findConfig(root, explicitPath);
  if (!configPath) {
    return { config: { version: 1, circuits: [], verifiers: [] } };
  }
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = YAML.parse(raw) as ProjectConfig | null;
  return {
    config: {
      version: parsed?.version ?? 1,
      project: parsed?.project,
      policy: parsed?.policy,
      circuits: parsed?.circuits ?? [],
      verifiers: parsed?.verifiers ?? [],
      suppressions: parsed?.suppressions ?? [],
    },
    path: configPath,
  };
}

export async function writeDefaultConfig(root: string): Promise<string> {
  const target = path.join(root, DEFAULT_CONFIG_NAME);
  if (await pathExists(target)) return target;
  const body = `version: 1

project:
  name: example-zk-protocol
  baseline:
    type: git
    ref: audited-v1.0.0

policy:
  fail_on:
    - critical_finding
    - critical_invariant_coverage_drop
  require_manual_review:
    - verifier_key_change
    - public_input_binding_change
      - baseline_missing

suppressions: []

circuits:
  - id: withdraw
    path: circuits/withdraw.circom
    framework: circom
    verifier: contracts/WithdrawVerifier.sol
    public_inputs:
      - merkleRoot
      - nullifierHash
      - recipient
      - amount
      - chainId
      - assetId
    invariants:
      - id: merkle_membership
        type: merkle_membership
        root: merkleRoot
        severity: critical
      - id: nullifier_unique
        type: nullifier_unique
        signal: nullifierHash
        severity: critical
      - id: value_conservation
        type: value_conservation
        severity: critical
      - id: amount_range
        type: range_bound
        signal: amount
        bits: 64
        severity: high
      - id: domain_binding
        type: domain_binding
        signals:
          - chainId
          - assetId
        severity: high

verifiers:
  - id: withdraw_verifier
    contract: contracts/WithdrawVerifier.sol
    circuit: withdraw
    public_input_order:
      - merkleRoot
      - nullifierHash
      - recipient
      - amount
      - chainId
      - assetId
`;
  await fs.writeFile(target, body, "utf8");
  return target;
}
