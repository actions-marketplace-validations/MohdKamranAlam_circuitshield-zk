import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { discoverRepo } from "./discovery.js";
import type { CircuitConfig, ProjectConfig, VerifierConfig } from "./types.js";
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
  const body = await buildStarterConfig(root);
  await fs.writeFile(target, body, "utf8");
  return target;
}

export async function buildStarterConfig(root: string): Promise<string> {
  const repo = await discoverRepo(root);
  const circuits = repo.circomFiles.map((file, index): CircuitConfig => {
    const publicInputs = inferPublicInputsFromFile(path.join(root, file));
    const id = toId(path.basename(file, ".circom"), index);
    return {
      id,
      path: file,
      framework: "circom",
      ...(publicInputs.length ? { public_inputs: publicInputs } : {}),
      invariants: [
        { id: `${id}_public_input_binding`, type: "domain_binding", signals: publicInputs.slice(0, 2), severity: "medium" as const },
      ].filter((invariant) => invariant.signals && invariant.signals.length > 0),
    };
  });
  const verifiers = repo.solidityFiles
    .filter((file) => /verifier/i.test(file))
    .map((file, index): VerifierConfig => ({
      id: toId(path.basename(file, ".sol"), index),
      contract: file,
      ...(circuits[index] ? { circuit: circuits[index].id, public_input_order: [...(circuits[index].public_inputs ?? [])] } : {}),
    }));

  const config: ProjectConfig = {
    version: 1,
    project: {
      name: path.basename(root),
      baseline: {
        type: "git",
        ref: "audited-v1.0.0",
      },
    },
    policy: {
      fail_on: ["critical_finding", "critical_invariant_coverage_drop"],
      require_manual_review: ["verifier_key_change", "public_input_binding_change", "baseline_missing"],
    },
    suppressions: [],
    circuits: circuits.length ? circuits : [
      {
        id: "main",
        path: "circuits/main.circom",
        framework: "circom",
        public_inputs: ["publicInput"],
        invariants: [
          {
            id: "public_input_binding",
            type: "domain_binding",
            signals: ["publicInput"],
            severity: "high",
          },
        ],
      },
    ],
    verifiers,
  };

  return YAML.stringify(config, { aliasDuplicateObjects: false });
}

function inferPublicInputsFromFile(file: string): string[] {
  try {
    const content = readFileSync(file, "utf8");
    const match = content.match(/component\s+main\s*\{\s*public\s*\[([^\]]*)\]/m);
    if (!match) return [];
    return match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function toId(name: string, index: number): string {
  const id = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return id || `item_${index + 1}`;
}
