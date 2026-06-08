import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, Number.isFinite(value) ? value : 0));
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function toAbsolute(root: string, maybeRelative: string): string {
  return path.isAbsolute(maybeRelative) ? maybeRelative : path.join(root, maybeRelative);
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function sha256File(filePath: string): Promise<string | undefined> {
  try {
    const buffer = await fs.readFile(filePath);
    return createHash("sha256").update(buffer).digest("hex");
  } catch {
    return undefined;
  }
}

export async function sha256Buffer(buffer: Buffer): Promise<string> {
  return createHash("sha256").update(buffer).digest("hex");
}

export function safeRef(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export function severityRank(severity: string): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
