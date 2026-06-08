import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ArtifactInspection, CircuitConfig, Finding } from "./types.js";
import { normalizePath, sha256File, toAbsolute } from "./utils.js";

export interface CircomspectRunResult {
  findings: Finding[];
  executed: boolean;
  succeeded: boolean;
  reason: string;
}

export interface CircomCompileResult {
  hashes: Record<string, string>;
  findings: Finding[];
  executed: boolean;
  succeeded: boolean;
  reason: string;
}

export interface ArtifactInspectionResult {
  inspections: ArtifactInspection[];
  findings: Finding[];
  snarkjsExecuted: boolean;
  snarkjsSucceeded: boolean;
  snarkjsReason: string;
}

export type ZkToolName = "circom" | "circomspect" | "snarkjs";

export interface ResolvedTool {
  name: ZkToolName;
  command: string;
  argsPrefix?: string[];
  available: boolean;
  version?: string;
  reason: string;
  checked: string[];
}

interface ToolCandidate {
  command: string;
  argsPrefix?: string[];
  display: string;
  acceptIfExists?: boolean;
  versionHint?: string;
}

const TOOL_ENV: Record<ZkToolName, string> = {
  circom: "CIRCOM_BIN",
  circomspect: "CIRCOMSPECT_BIN",
  snarkjs: "SNARKJS_BIN",
};

const VERSION_ARGS: Record<ZkToolName, string[]> = {
  circom: ["--version"],
  circomspect: ["--help"],
  snarkjs: ["--help"],
};

let cachedCommonToolDirs: string[] | undefined;
const resolvedToolCache = new Map<ZkToolName, ResolvedTool>();

export function isCommandAvailable(command: string, args = ["--version"]): boolean {
  const result = runToolCommand(command, args);
  return result.status === 0;
}

export function commandVersion(command: string, args = ["--version"]): string | undefined {
  const result = runToolCommand(command, args);
  if (result.status !== 0) return undefined;
  return (result.stdout || result.stderr || "").trim().split(/\r?\n/)[0]?.slice(0, 160) || "available";
}

export function detectToolVersions(): Record<string, string> {
  const versions: Record<string, string> = {};
  const circom = resolveTool("circom");
  const circomspect = resolveTool("circomspect");
  const snarkjs = resolveTool("snarkjs");

  versions.circom = circom.version ?? "missing";
  versions.circomspect = circomspect.version ?? "missing";
  versions.snarkjs = snarkjs.version ?? "missing";

  return versions;
}

export function isCircomspectAvailable(): boolean {
  return resolveTool("circomspect").available;
}

export function isCircomAvailable(): boolean {
  return resolveTool("circom").available;
}

export function isSnarkjsAvailable(): boolean {
  return resolveTool("snarkjs").available;
}

export function resolveTool(name: ZkToolName): ResolvedTool {
  const cached = resolvedToolCache.get(name);
  if (cached) return cached;
  const args = VERSION_ARGS[name];
  const candidates = toolCandidates(name);
  for (const candidate of candidates) {
    const result = runToolCommand(candidate.command, args, candidate.argsPrefix);
    if (result.status === 0 || candidate.acceptIfExists) {
      const version = (result.stdout || result.stderr || "").trim().split(/\r?\n/)[0]?.slice(0, 160) || candidate.versionHint || "available";
      const resolved = {
        name,
        command: candidate.command,
        argsPrefix: candidate.argsPrefix,
        available: true,
        version,
        reason: candidate.display === name ? "found on PATH" : `found at ${candidate.display}`,
        checked: candidates.map((item) => item.display),
      };
      resolvedToolCache.set(name, resolved);
      return resolved;
    }
  }
  const resolved = {
    name,
    command: name,
    available: false,
    reason: `${name} binary not found. Checked: ${candidates.map((item) => item.display).join(", ")}`,
    checked: candidates.map((item) => item.display),
  };
  resolvedToolCache.set(name, resolved);
  return resolved;
}

export async function runCircomspect(root: string, circomFiles: string[]): Promise<CircomspectRunResult> {
  const tool = resolveTool("circomspect");
  if (!tool.available) return { findings: [], executed: false, succeeded: false, reason: tool.reason };
  if (!circomFiles.length) return { findings: [], executed: false, succeeded: false, reason: "no Circom circuits discovered" };
  const findings: Finding[] = [];
  let succeeded = true;
  let reason = "executed";
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "circuitshield-"));
  try {
    for (const file of circomFiles) {
      const sarifPath = path.join(tempDir, `${path.basename(file)}.sarif.json`);
      const absolute = toAbsolute(root, file);
      const result = spawnSync(
        tool.command,
        [...(tool.argsPrefix ?? []), absolute, "--sarif-file", sarifPath],
        spawnOptions(tool.command)
      );
      if (result.status !== 0 && result.stderr) {
        succeeded = false;
        reason = result.stderr.trim().slice(0, 500);
        findings.push({
          id: "circomspect_run_failed",
          title: "Circomspect run failed",
          severity: "info",
          category: "tooling",
          source: "circomspect",
          file,
          message: result.stderr.trim().slice(0, 500),
          recommendation: "Run circomspect locally to inspect the complete output.",
        });
        continue;
      }
      const raw = await readFile(sarifPath, "utf8").catch(() => "");
      if (!raw) {
        reason = "executed; no SARIF output was produced";
        continue;
      }
      const parsed = JSON.parse(raw) as {
        runs?: Array<{ results?: Array<{ ruleId?: string; message?: { text?: string }; locations?: Array<{ physicalLocation?: { region?: { startLine?: number } } }> }> }>;
      };
      for (const sarifFinding of parsed.runs?.flatMap((run) => run.results ?? []) ?? []) {
        findings.push({
          id: sarifFinding.ruleId ?? "circomspect_finding",
          title: sarifFinding.ruleId ?? "Circomspect finding",
          severity: "medium",
          category: "static",
          source: "circomspect",
          file: normalizePath(file),
          line: sarifFinding.locations?.[0]?.physicalLocation?.region?.startLine,
          message: sarifFinding.message?.text ?? "Circomspect reported a finding.",
          recommendation: "Review the Circomspect finding and add a suppression only with a clear reason.",
        });
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
  return { findings, executed: true, succeeded, reason };
}

export async function compileCircomArtifacts(root: string, circuits: CircuitConfig[]): Promise<CircomCompileResult> {
  const findings: Finding[] = [];
  const hashes: Record<string, string> = {};
  const tool = resolveTool("circom");
  if (!circuits.length) return { hashes, findings, executed: false, succeeded: false, reason: "no Circom circuits discovered" };
  if (!tool.available) {
    findings.push({
      id: "circom_compiler_missing",
      title: "Circom compiler is not available",
      severity: "info",
      category: "tooling",
      source: "circom-compiler",
      message: "Compiler artifact extraction was requested, but 'circom' was not found on PATH.",
      recommendation: "Install Circom 2 to enable compiled R1CS/WASM/SYM artifact drift tracking.",
    });
    return { hashes, findings, executed: false, succeeded: false, reason: tool.reason };
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "circuitshield-compile-"));
  let succeeded = true;
  let reason = "executed";
  try {
    for (const circuit of circuits) {
      const outputDir = path.join(tempRoot, circuit.id);
      const absolute = toAbsolute(root, circuit.path);
      await mkdir(outputDir, { recursive: true });
      const result = spawnSync(
        tool.command,
        [...(tool.argsPrefix ?? []), absolute, "--r1cs", "--wasm", "--sym", "-o", outputDir],
        spawnOptions(tool.command)
      );
      if (result.status !== 0) {
        succeeded = false;
        reason = (result.stderr || result.stdout || "Circom compilation failed.").trim().slice(0, 800);
        findings.push({
          id: "circom_compile_failed",
          title: "Circom compile failed",
          severity: "high",
          category: "tooling",
          source: "circom-compiler",
          file: circuit.path,
          message: (result.stderr || result.stdout || "Circom compilation failed.").trim().slice(0, 800),
          recommendation: "Fix circuit compilation before treating drift results as release-ready.",
          gateImpact: "MANUAL_REVIEW",
        });
        continue;
      }
      const files = await listFiles(outputDir);
      for (const file of files.filter((item) => /\.(r1cs|wasm|sym)$/i.test(item))) {
        const hash = await sha256File(file);
        if (!hash) continue;
        const key = `compiled/${circuit.id}/${normalizePath(path.relative(outputDir, file))}`;
        hashes[key] = hash;
      }
      if (!Object.keys(hashes).some((key) => key.startsWith(`compiled/${circuit.id}/`))) {
        findings.push({
          id: "circom_compile_no_artifacts",
          title: "Circom compile produced no tracked artifacts",
          severity: "medium",
          category: "tooling",
          source: "circom-compiler",
          file: circuit.path,
          message: `No .r1cs, .wasm, or .sym artifacts were found after compiling '${circuit.path}'.`,
          recommendation: "Check compiler output paths and circuit entrypoint.",
          gateImpact: "WARN",
        });
      }
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  if (!Object.keys(hashes).length && succeeded) {
    succeeded = false;
    reason = "circom executed but no tracked .r1cs/.wasm/.sym artifacts were produced";
  }
  return { hashes, findings, executed: true, succeeded, reason };
}

export async function inspectProofArtifacts(root: string, artifactFiles: string[]): Promise<ArtifactInspectionResult> {
  const findings: Finding[] = [];
  const inspections: ArtifactInspection[] = [];
  const snarkjsTool = resolveTool("snarkjs");
  const snarkjsAvailable = snarkjsTool.available;
  let snarkjsExecuted = false;
  let snarkjsSucceeded = false;
  let snarkjsReason = artifactFiles.some((file) => file.toLowerCase().endsWith(".r1cs"))
    ? "snarkjs binary not found on PATH; native R1CS header validation still ran"
    : "no R1CS artifacts discovered";

  for (const file of artifactFiles) {
    const kind = artifactKind(file);
    const absolute = toAbsolute(root, file);
    const sha256 = await sha256File(absolute);
    if (kind !== "r1cs") {
      inspections.push({
        path: normalizePath(file),
        kind,
        status: sha256 ? "unknown" : "invalid",
        detail: sha256 ? "Artifact hash is tracked; no native structural inspector is available for this artifact type yet." : "Artifact could not be hashed.",
        sha256,
      });
      continue;
    }

    const buffer = await readFile(absolute).catch(() => undefined);
    if (!buffer) {
      inspections.push({
        path: normalizePath(file),
        kind: "r1cs",
        status: "invalid",
        detail: "R1CS artifact could not be read.",
        sha256,
      });
      findings.push({
        id: "r1cs_artifact_unreadable",
        title: "R1CS artifact is unreadable",
        severity: "medium",
        category: "tooling",
        source: "artifact-inspector",
        file,
        message: `R1CS artifact '${file}' could not be read.`,
        recommendation: "Regenerate and commit the expected proof artifact, or remove stale artifact references.",
        gateImpact: "WARN",
      });
      continue;
    }

    const native = inspectR1csHeader(buffer);
    const metadata: Record<string, unknown> = { ...native.metadata };
    let detail = native.detail;
    let status = native.status;

    if (snarkjsAvailable) {
      const result = spawnSync(snarkjsTool.command, [...(snarkjsTool.argsPrefix ?? []), "r1cs", "info", absolute], spawnOptions(snarkjsTool.command));
      snarkjsExecuted = true;
      if (result.status === 0) {
        snarkjsSucceeded = true;
        snarkjsReason = "executed for R1CS artifacts";
        metadata.snarkjsInfo = result.stdout.trim().slice(0, 2000);
        detail = `${detail} snarkjs r1cs info executed successfully.`;
        if (status !== "invalid") status = "valid";
      } else {
        metadata.snarkjsError = summarizeToolError(result.stderr || result.stdout || "snarkjs failed");
        snarkjsReason = String(metadata.snarkjsError);
        findings.push({
          id: "snarkjs_r1cs_info_failed",
          title: "snarkjs R1CS inspection failed",
          severity: "medium",
          category: "tooling",
          source: "snarkjs",
          file,
          message: String(metadata.snarkjsError),
          recommendation: "Regenerate the R1CS artifact or run 'snarkjs r1cs info' locally for the full error.",
          gateImpact: "WARN",
        });
      }
    }

    inspections.push({
      path: normalizePath(file),
      kind: "r1cs",
      status,
      detail,
      sha256,
      metadata,
    });

    if (native.status === "invalid") {
      findings.push({
        id: "r1cs_artifact_invalid",
        title: "R1CS artifact is not structurally valid",
        severity: "high",
        category: "tooling",
        source: "artifact-inspector",
        file,
        message: native.detail,
        recommendation: "Regenerate the R1CS artifact from the audited circuit before relying on artifact drift checks.",
        gateImpact: "MANUAL_REVIEW",
      });
    }
  }

  return { inspections, findings, snarkjsExecuted, snarkjsSucceeded, snarkjsReason };
}

function summarizeToolError(output: string): string {
  const clean = stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("at ") && !line.startsWith("at async "));
  const errorLine =
    clean.find((line) => /error:/i.test(line)) ??
    clean.find((line) => !line.includes("node_modules")) ??
    clean[0] ??
    "External tool failed.";
  return errorLine.replace(/^.*?Error:\s*/i, "Error: ").slice(0, 240);
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function runToolCommand(command: string, args: string[], argsPrefix: string[] = []) {
  return spawnSync(command, [...argsPrefix, ...args], spawnOptions(command));
}

function spawnOptions(command: string) {
  return {
    encoding: "utf8" as const,
    shell: process.platform === "win32" && !looksLikePath(command),
    env: { ...process.env, PATH: augmentedPath() },
    timeout: 3000,
  };
}

function looksLikePath(command: string): boolean {
  return path.isAbsolute(command) || command.includes("/") || command.includes("\\");
}

function augmentedPath(): string {
  const delimiter = path.delimiter;
  const current = process.env.PATH ?? "";
  const entries = new Set(current.split(delimiter).filter(Boolean));
  for (const candidate of commonToolDirs()) entries.add(candidate);
  return Array.from(entries).join(delimiter);
}

function commonToolDirs(): string[] {
  if (cachedCommonToolDirs) return cachedCommonToolDirs;
  const dirs: string[] = [];
  const home = os.homedir();
  const cwd = process.cwd();
  dirs.push(path.dirname(process.execPath));
  if (home) {
    dirs.push(path.join(home, ".cargo", "bin"));
    dirs.push(path.join(home, ".local", "bin"));
    dirs.push(path.join(home, ".npm-global", "bin"));
    dirs.push(path.join(home, ".npm", "bin"));
  }
  if (process.env.CARGO_HOME) dirs.push(path.join(process.env.CARGO_HOME, "bin"));
  if (process.env.NPM_CONFIG_PREFIX) dirs.push(path.join(process.env.NPM_CONFIG_PREFIX, "bin"));
  if (process.env.APPDATA) dirs.push(path.join(process.env.APPDATA, "npm"));
  dirs.push(...npmGlobalToolDirs());
  dirs.push(path.join(cwd, "node_modules", ".bin"));
  cachedCommonToolDirs = Array.from(new Set(dirs));
  return cachedCommonToolDirs;
}

function toolCandidates(name: ZkToolName): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];
  const envValue = process.env[TOOL_ENV[name]];
  if (envValue) candidates.push({ command: envValue, display: envValue });
  candidates.push({ command: name, display: name });
  for (const dir of commonToolDirs()) {
    candidates.push({ command: path.join(dir, executableName(name)), display: path.join(dir, executableName(name)) });
    if (process.platform === "win32") {
      candidates.push(
        { command: path.join(dir, `${name}.cmd`), display: path.join(dir, `${name}.cmd`) },
        { command: path.join(dir, `${name}.exe`), display: path.join(dir, `${name}.exe`) },
      );
    }
  }
  if (name === "snarkjs") candidates.push(...snarkjsNodeCliCandidates());
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.command}:${candidate.argsPrefix?.join(" ") ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return candidate.display === name || existsSync(candidate.command) || Boolean(candidate.argsPrefix?.every((file) => existsSync(file)));
  });
}

function executableName(name: ZkToolName): string {
  return process.platform === "win32" ? `${name}.exe` : name;
}

function npmGlobalToolDirs(): string[] {
  const dirs: string[] = [];
  const bin = npmCommandOutput(["bin", "-g"]);
  if (bin) dirs.push(bin);
  const prefix = npmCommandOutput(["prefix", "-g"]);
  if (prefix) {
    dirs.push(process.platform === "win32" ? prefix : path.join(prefix, "bin"));
  }
  return dirs;
}

function npmCommandOutput(args: string[]): string | undefined {
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
    timeout: 3000,
  });
  if (result.status !== 0) return undefined;
  return result.stdout.trim().split(/\r?\n/)[0];
}

function snarkjsNodeCliCandidates(): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];
  const cliFiles = [
    path.join(process.cwd(), "node_modules", "snarkjs", "build", "cli.cjs"),
  ];
  const globalRoot = npmCommandOutput(["root", "-g"]);
  if (globalRoot) cliFiles.push(path.join(globalRoot, "snarkjs", "build", "cli.cjs"));
  for (const cliFile of cliFiles) {
    if (existsSync(cliFile)) {
      candidates.push({
        command: process.execPath,
        argsPrefix: [cliFile],
        display: cliFile,
        acceptIfExists: true,
        versionHint: "snarkjs package CLI",
      });
    }
  }
  return candidates;
}

function inspectR1csHeader(buffer: Buffer): { status: ArtifactInspection["status"]; detail: string; metadata: Record<string, unknown> } {
  const magic = buffer.subarray(0, 4).toString("utf8");
  const metadata: Record<string, unknown> = {
    sizeBytes: buffer.length,
    magic,
  };
  if (buffer.length < 16) {
    return { status: "invalid", detail: `R1CS artifact is too small (${buffer.length} bytes).`, metadata };
  }
  if (magic !== "r1cs") {
    return { status: "invalid", detail: `R1CS artifact magic header is '${magic || "empty"}', expected 'r1cs'.`, metadata };
  }
  return { status: "valid", detail: "R1CS magic header is valid. Use snarkjs for full constraint/wire counts when available.", metadata };
}

function artifactKind(file: string): ArtifactInspection["kind"] {
  const lower = file.toLowerCase();
  if (lower.endsWith(".r1cs")) return "r1cs";
  if (lower.endsWith(".wasm")) return "wasm";
  if (lower.endsWith(".sym")) return "sym";
  if (lower.endsWith(".zkey")) return "zkey";
  if (lower.endsWith(".ptau")) return "ptau";
  if (lower.endsWith("verification_key.json")) return "verification_key";
  return "unknown";
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}
