import { promises as fs } from "node:fs";
import path from "node:path";
import type { DiscoveredRepo } from "./types.js";
import { normalizePath } from "./utils.js";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".circuitshield", ".tmp", "target"]);

export async function discoverRepo(root: string): Promise<DiscoveredRepo> {
  const circomFiles: string[] = [];
  const solidityFiles: string[] = [];
  const artifactFiles: string[] = [];
  const packageFiles: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      const relative = normalizePath(path.relative(root, absolute));
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        if (entry.name.endsWith(".circom")) circomFiles.push(relative);
        if (entry.name.endsWith(".sol")) solidityFiles.push(relative);
        if (/\.(r1cs|sym|zkey|ptau|wasm)$/i.test(entry.name) || entry.name === "verification_key.json") artifactFiles.push(relative);
        if (["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].includes(entry.name)) {
          packageFiles.push(relative);
        }
      }
    }
  }

  await walk(root);
  return { root, circomFiles, solidityFiles, artifactFiles, packageFiles };
}
