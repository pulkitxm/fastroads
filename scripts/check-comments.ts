import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src", "tests", "scripts", "vite.config.ts"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".mjs"]);

const stripStrings = (source: string): string => {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      out += " ";
      index += 1;
      while (index < source.length) {
        const current = source[index];
        if (current === "\\") {
          index += 2;
          continue;
        }
        if (current === quote) {
          index += 1;
          break;
        }
        out += current === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }
    out += char ?? "";
    index += 1;
  }
  return out;
};

const allowedLine = (line: string): boolean =>
  line.includes("biome-ignore") ||
  line.includes("@ts-") ||
  line.includes("eslint-") ||
  line.includes("/*!");

const filesUnder = (path: string): string[] => {
  const stat = statSync(path);
  if (stat.isFile()) {
    return [path];
  }
  const found: string[] = [];
  for (const entry of readdirSync(path)) {
    const next = join(path, entry);
    const nextStat = statSync(next);
    if (nextStat.isDirectory()) {
      found.push(...filesUnder(next));
      continue;
    }
    const dot = entry.lastIndexOf(".");
    const extension = dot >= 0 ? entry.slice(dot) : "";
    if (extensions.has(extension)) {
      found.push(next);
    }
  }
  return found;
};

const violations: string[] = [];
for (const root of roots) {
  for (const file of filesUnder(root)) {
    const stripped = stripStrings(readFileSync(file, "utf8"));
    const lines = stripped.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const slash = line.indexOf("//");
      const block = line.indexOf("/*");
      if (slash < 0 && block < 0) {
        continue;
      }
      if (allowedLine(line)) {
        continue;
      }
      violations.push(`${relative(".", file)}:${index + 1}`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  console.error("comments are not allowed");
  process.exit(1);
}
