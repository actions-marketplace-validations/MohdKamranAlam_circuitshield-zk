import path from "node:path";
import type { CircuitConfig, CircuitSnapshot, ProjectConfig, VerifierConfig, VerifierSnapshot } from "./types.js";
import { parseCircomMetadata } from "./circom/metadata.js";
import { normalizePath, readText, sha256File, toAbsolute } from "./utils.js";

export async function buildCircuitSnapshot(root: string, circuit: CircuitConfig, invariantCoverageScore: number): Promise<CircuitSnapshot> {
  const absolute = toAbsolute(root, circuit.path);
  const content = await readText(absolute).catch(() => "");
  const metadata = parseCircomMetadata(content);
  const signalCounts = {
    input: metadata.signals.filter((signal) => signal.kind === "input").length,
    output: metadata.signals.filter((signal) => signal.kind === "output").length,
    internal: metadata.signals.filter((signal) => signal.kind === "internal").length,
  };
  return {
    id: circuit.id,
    path: normalizePath(path.relative(root, absolute)),
    sha256: await sha256File(absolute),
    constraintLikeCount: metadata.constraintLikeCount,
    unsafeAssignmentCount: metadata.unsafeAssignmentCount,
    publicInputs: circuit.public_inputs ?? [],
    actualPublicInputs: metadata.publicInputs,
    signalCounts,
    invariantCoverageScore,
  };
}

export async function buildVerifierSnapshot(root: string, verifier: VerifierConfig): Promise<VerifierSnapshot> {
  const absolute = toAbsolute(root, verifier.contract);
  return {
    id: verifier.id,
    path: normalizePath(path.relative(root, absolute)),
    sha256: await sha256File(absolute),
    publicInputOrder: verifier.public_input_order ?? [],
  };
}

export async function dependencyHashes(root: string, config: ProjectConfig): Promise<Record<string, string>> {
  const files = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"];
  const hashes: Record<string, string> = {};
  for (const file of files) {
    const hash = await sha256File(path.join(root, file));
    if (hash) hashes[file] = hash;
  }
  void config;
  return hashes;
}

export async function artifactHashes(root: string, artifactFiles: string[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const file of artifactFiles) {
    const hash = await sha256File(path.join(root, file));
    if (hash) hashes[normalizePath(file)] = hash;
  }
  return hashes;
}
