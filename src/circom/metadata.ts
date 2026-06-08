import type { CircomConstraintMetadata, CircomMetadata, CircomSignalMetadata } from "../types.js";

const RESERVED = new Set([
  "pragma",
  "circom",
  "template",
  "component",
  "main",
  "public",
  "signal",
  "input",
  "output",
  "var",
  "for",
  "if",
  "else",
  "return",
  "include",
  "assert",
]);

export function parseCircomMetadata(content: string): CircomMetadata {
  const stripped = stripComments(content);
  const lines = stripped.split(/\r?\n/);
  const signals: CircomSignalMetadata[] = [];
  const constraints: CircomConstraintMetadata[] = [];
  const unsafeAssignments: Array<{ signal: string; line: number; text: string }> = [];
  const constrainedSignals: Record<string, number> = {};
  const meaningfulConstrainedSignals: Record<string, number> = {};

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const declaration = line.match(/^\s*signal\s+(input|output)?\s*([A-Za-z_][A-Za-z0-9_]*)/);
    if (declaration) {
      signals.push({
        name: declaration[2],
        kind: declaration[1] === "input" ? "input" : declaration[1] === "output" ? "output" : "internal",
        line: lineNumber,
      });
    }

    const unsafe = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*<--/);
    if (unsafe) {
      unsafeAssignments.push({ signal: unsafe[1], line: lineNumber, text: line.trim() });
    }

    if (line.includes("===") || line.includes("<==")) {
      const identifiers = extractIdentifiers(line);
      const uniqueIdentifiers = Array.from(new Set(identifiers));
      const tautological = isTautologicalConstraint(line, uniqueIdentifiers);
      constraints.push({ line: lineNumber, text: line.trim(), identifiers: uniqueIdentifiers, tautological });
      for (const identifier of uniqueIdentifiers) {
        constrainedSignals[identifier] = (constrainedSignals[identifier] ?? 0) + 1;
        if (!tautological) {
          meaningfulConstrainedSignals[identifier] = (meaningfulConstrainedSignals[identifier] ?? 0) + 1;
        }
      }
    }
  });

  return {
    publicInputs: extractPublicInputs(stripped),
    signals,
    constraints,
    constrainedSignals,
    meaningfulConstrainedSignals,
    unsafeAssignments,
    constraintLikeCount: constraints.length,
    unsafeAssignmentCount: unsafeAssignments.length,
  };
}

export function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

export function extractPublicInputs(content: string): string[] {
  const matches = Array.from(content.matchAll(/component\s+main\s*\{[\s\S]*?public\s*\[([\s\S]*?)\][\s\S]*?\}/g));
  const raw = matches.at(-1)?.[1] ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(item));
}

export function extractIdentifiers(line: string): string[] {
  return Array.from(line.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g))
    .map((match) => match[0])
    .filter((identifier) => !RESERVED.has(identifier) && !/^\d/.test(identifier));
}

function isTautologicalConstraint(line: string, identifiers: string[]): boolean {
  const compact = line.replace(/\s+/g, "");
  for (const identifier of identifiers) {
    if (compact === `${identifier}===${identifier};` || compact === `${identifier}===${identifier}`) {
      return true;
    }
  }
  return identifiers.length === 1 && line.includes("===");
}

export function hasSignal(content: string, signal: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_])${escapeRegex(signal)}([^A-Za-z0-9_]|$)`).test(content);
}

export function occurrenceCount(content: string, signal: string): number {
  const matches = content.match(new RegExp(`(^|[^A-Za-z0-9_])${escapeRegex(signal)}([^A-Za-z0-9_]|$)`, "g"));
  return matches?.length ?? 0;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
