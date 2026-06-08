#!/usr/bin/env node
import { Command } from "commander";
import { promises as fs } from "node:fs";
import path from "node:path";
import { findConfig, writeDefaultConfig } from "./config.js";
import { loadBaseline, saveBaseline, toBaselineSnapshot } from "./baseline.js";
import { scanProject } from "./scanner.js";
import { renderMarkdown } from "./reporters/markdown.js";
import { renderSarif } from "./reporters/sarif.js";
import type { ScanResult } from "./types.js";
import { renderBenchmarkMarkdown, runBenchmarks } from "./benchmark.js";
import { renderGithubComment } from "./reporters/githubComment.js";
import { ensureDatabase, getDatabaseStatus } from "./db.js";
import { renderBaselineDriftDemoMarkdown, runBaselineDriftDemo } from "./demo.js";
import { resolveTool } from "./tooling.js";

const program = new Command();

program
  .name("circuitshield")
  .description("Post-audit invariant drift monitoring and audit gate for ZK circuits.")
  .version("0.1.0");

program
  .command("init")
  .description("Create a starter circuitshield.yml file.")
  .option("-t, --target <path>", "Project root", ".")
  .action(async (options: { target: string }) => {
    const root = path.resolve(options.target);
    await fs.mkdir(root, { recursive: true });
    const configPath = await writeDefaultConfig(root);
    console.log(`Created ${configPath}`);
  });

program
  .command("doctor")
  .description("Check CircuitShield config discovery and optional ZK toolchain availability.")
  .argument("[target]", "Project root", ".")
  .option("-c, --config <path>", "Path to circuitshield.yml")
  .action(async (target: string, options: { config?: string }) => {
    const root = path.resolve(target);
    const configPath = await findConfig(root, options.config);
    const tools = [resolveTool("circom"), resolveTool("circomspect"), resolveTool("snarkjs")];

    console.log("CircuitShield Doctor");
    console.log("");
    console.log(`Root: ${root}`);
    console.log(`Config loaded: ${configPath ? "yes" : "no"}`);
    console.log(`Config path: ${configPath ?? "not found"}`);
    console.log("");
    console.log("| Tool | Available | Version | Command | Reason |");
    console.log("| --- | --- | --- | --- | --- |");
    for (const tool of tools) {
      console.log(`| ${tool.name} | ${tool.available ? "yes" : "no"} | ${tool.version ?? "-"} | ${tool.available ? tool.command : "-"} | ${tool.reason.replace(/\|/g, "/")} |`);
    }
    console.log("");
    console.log("Install hints:");
    console.log("- circom: install Circom 2 and ensure the binary is on PATH, or set CIRCOM_BIN=/absolute/path/to/circom");
    console.log("- circomspect: run `cargo install circomspect` and ensure ~/.cargo/bin is on PATH, or set CIRCOMSPECT_BIN=/absolute/path/to/circomspect");
    console.log("- snarkjs: run `npm install -g snarkjs` and ensure the npm global bin directory is on PATH, or set SNARKJS_BIN=/absolute/path/to/snarkjs");
  });

program
  .command("scan")
  .description("Scan a ZK project for invariant drift and audit gate findings.")
  .argument("[target]", "Project root", ".")
  .option("-c, --config <path>", "Path to circuitshield.yml")
  .option("-b, --baseline <ref>", "Baseline ref to compare against")
  .option("-f, --format <format>", "json, markdown, or sarif", "markdown")
  .option("-o, --out <path>", "Write report to file")
  .option("--no-circomspect", "Disable optional Circomspect integration")
  .option("--compile", "Compile Circom circuits into temporary R1CS/WASM/SYM artifacts for drift tracking")
  .action(async (target: string, options: { config?: string; baseline?: string; format: string; out?: string; circomspect?: boolean; compile?: boolean }) => {
    const root = path.resolve(target);
    const baseline = await loadBaseline(root, options.baseline);
    const result = await scanProject({ root, configPath: options.config, baseline, useCircomspect: options.circomspect, compileArtifacts: options.compile });
    await outputResult(result, options.format, options.out);
  });

program
  .command("ci")
  .description("Run scan and exit non-zero when the audit gate blocks CI.")
  .argument("[target]", "Project root", ".")
  .option("-c, --config <path>", "Path to circuitshield.yml")
  .option("-b, --baseline <ref>", "Baseline ref to compare against")
  .option("-f, --format <format>", "json, markdown, or sarif", "markdown")
  .option("-o, --out <path>", "Write report to file")
  .option("--fail-on <state>", "block, manual, warn, or never", "block")
  .option("--no-circomspect", "Disable optional Circomspect integration")
  .option("--compile", "Compile Circom circuits into temporary R1CS/WASM/SYM artifacts for drift tracking")
  .action(async (target: string, options: { config?: string; baseline?: string; format: string; out?: string; failOn: string; circomspect?: boolean; compile?: boolean }) => {
    const root = path.resolve(target);
    const baseline = await loadBaseline(root, options.baseline);
    const result = await scanProject({ root, configPath: options.config, baseline, useCircomspect: options.circomspect, compileArtifacts: options.compile });
    await outputResult(result, options.format, options.out);
    if (shouldFail(result.auditGate.state, options.failOn)) {
      process.exitCode = 1;
    }
  });

program
  .command("baseline")
  .description("Manage audited baseline snapshots.")
  .command("create")
  .description("Create a baseline snapshot from the current working tree.")
  .requiredOption("--ref <ref>", "Baseline reference, for example audited-v1.0.0")
  .option("-t, --target <path>", "Project root", ".")
  .option("-c, --config <path>", "Path to circuitshield.yml")
  .option("--no-circomspect", "Disable optional Circomspect integration")
  .option("--compile", "Compile Circom circuits into temporary R1CS/WASM/SYM artifacts for baseline tracking")
  .action(async (options: { ref: string; target: string; config?: string; circomspect?: boolean; compile?: boolean }) => {
    const root = path.resolve(options.target);
    const result = await scanProject({ root, configPath: options.config, useCircomspect: options.circomspect, compileArtifacts: options.compile });
    const snapshot = toBaselineSnapshot(result, options.ref);
    const savedPath = await saveBaseline(root, snapshot);
    console.log(`Created baseline '${options.ref}' at ${savedPath}`);
    console.log(`Audit Gate at baseline creation: ${result.auditGate.state}`);
  });

program
  .command("benchmark")
  .description("Run CircuitShield against benchmark cases.")
  .argument("[target]", "Benchmark root", "benchmarks")
  .option("-f, --format <format>", "json or markdown", "markdown")
  .option("-o, --out <path>", "Write report to file")
  .option("--compile", "Compile Circom circuits during benchmark scans")
  .action(async (target: string, options: { format: string; out?: string; compile?: boolean }) => {
    const report = await runBenchmarks(path.resolve(target), { compileArtifacts: options.compile });
    const body = options.format.toLowerCase() === "json" ? `${JSON.stringify(report, null, 2)}\n` : renderBenchmarkMarkdown(report);
    if (options.out) {
      const outputPath = path.resolve(options.out);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, body, "utf8");
      console.log(`Wrote ${outputPath}`);
      console.log(`Benchmark: ${report.summary.passed}/${report.summary.total} expectations passed`);
    } else {
      process.stdout.write(body);
    }
    if (report.summary.failed > 0) process.exitCode = 1;
  });

program
  .command("demo")
  .description("Run built-in CircuitShield product demos.")
  .command("baseline-drift")
  .description("Run the audited baseline to risky current-code drift demo.")
  .option("-t, --target <path>", "Demo root", "demos/baseline-drift")
  .option("-f, --format <format>", "json or markdown", "markdown")
  .option("-o, --out <path>", "Write report to file")
  .action(async (options: { target: string; format: string; out?: string }) => {
    const report = await runBaselineDriftDemo(path.resolve(options.target));
    const body = options.format.toLowerCase() === "json" ? `${JSON.stringify(report, null, 2)}\n` : renderBaselineDriftDemoMarkdown(report);
    if (options.out) {
      const outputPath = path.resolve(options.out);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, body, "utf8");
      console.log(`Wrote ${outputPath}`);
      console.log(`Current Gate: ${report.summary.currentGate}`);
    } else {
      process.stdout.write(body);
    }
  });

program
  .command("comment")
  .description("Render a GitHub PR comment from a scan JSON report.")
  .requiredOption("--scan <path>", "Path to scan JSON produced by 'circuitshield scan --format json'")
  .option("-o, --out <path>", "Write comment Markdown to file")
  .action(async (options: { scan: string; out?: string }) => {
    const raw = await fs.readFile(path.resolve(options.scan), "utf8");
    const result = JSON.parse(raw) as ScanResult;
    const body = renderGithubComment(result);
    if (options.out) {
      const outputPath = path.resolve(options.out);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, body, "utf8");
      console.log(`Wrote ${outputPath}`);
    } else {
      process.stdout.write(body);
    }
  });

program
  .command("db")
  .description("Manage CircuitShield PostgreSQL/Neon database.")
  .command("migrate")
  .description("Create or update CircuitShield database tables.")
  .action(async () => {
    await ensureDatabase();
    const status = await getDatabaseStatus();
    console.log(JSON.stringify(status, null, 2));
  });

program
  .command("db:status")
  .description("Print CircuitShield database connection status.")
  .action(async () => {
    const status = await getDatabaseStatus();
    console.log(JSON.stringify(status, null, 2));
  });

await program.parseAsync(process.argv);

async function outputResult(result: ScanResult, format: string, out?: string): Promise<void> {
  const normalized = format.toLowerCase();
  let body = "";
  if (normalized === "json") body = `${JSON.stringify(result, null, 2)}\n`;
  else if (normalized === "sarif") body = renderSarif(result);
  else body = renderMarkdown(result);

  if (out) {
    const target = path.resolve(out);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, "utf8");
    console.log(`Wrote ${target}`);
    console.log(`Audit Gate: ${result.auditGate.state}`);
  } else {
    process.stdout.write(body);
  }
}

function shouldFail(state: string, failOn: string): boolean {
  const normalized = failOn.toLowerCase();
  if (normalized === "never") return false;
  if (normalized === "warn") return ["WARN", "MANUAL_REVIEW", "REBASELINE_REQUIRED", "BLOCK_CI"].includes(state);
  if (normalized === "manual") return ["MANUAL_REVIEW", "REBASELINE_REQUIRED", "BLOCK_CI"].includes(state);
  return state === "BLOCK_CI";
}
