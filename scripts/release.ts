#!/usr/bin/env bun
// Usage: bun run release [major|minor|patch]
// Auto-detects bump type from conventional commits if not specified.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

// Set to a string like "alpha" or "beta" for pre-release builds; remove when releasing to production.
const PRERELEASE = "alpha";

function git(...args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], { cwd: ROOT });
  if (!result.success) return "";
  return result.stdout.toString().trim();
}

// 1. Find last tag
const lastTag = git("describe", "--tags", "--abbrev=0") || null;
const logRange = lastTag ? `${lastTag}..HEAD` : "HEAD";

// 2. Parse commits
const log = git("log", logRange, "--pretty=format:%H|%s");
const commits = log
  ? log.split("\n").map((line) => {
      const [hash, ...rest] = line.split("|");
      return { hash: hash.slice(0, 7), subject: rest.join("|") };
    })
  : [];

if (commits.length === 0 && !process.argv[2]) {
  console.log("No commits since last tag. Pass bump type explicitly to force.");
  process.exit(0);
}

// 3. Determine bump type
type BumpType = "major" | "minor" | "patch";
const cliArg = process.argv[2] as BumpType | undefined;
const validBumps = new Set(["major", "minor", "patch"]);

let bump: BumpType;
if (cliArg && validBumps.has(cliArg)) {
  bump = cliArg;
} else {
  const hasBreaking = commits.some(
    (c) =>
      c.subject.includes("BREAKING CHANGE") ||
      /^[a-z]+(\(.+\))?!:/.test(c.subject),
  );
  const hasFeat = commits.some((c) => c.subject.startsWith("feat"));
  bump = hasBreaking ? "major" : hasFeat ? "minor" : "patch";
}

// 4. Bump version in package.json
const pkgPath = resolve(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const baseVersion = pkg.version.replace(/-.*$/, "");
const [maj, min, pat] = baseVersion.split(".").map(Number);
const semver =
  bump === "major"
    ? `${maj + 1}.0.0`
    : bump === "minor"
      ? `${maj}.${min + 1}.0`
      : `${maj}.${min}.${pat + 1}`;
const next = PRERELEASE ? `${semver}-${PRERELEASE}` : semver;
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// 5. Categorize commits for changelog
const features = commits.filter((c) => c.subject.startsWith("feat"));
const fixes = commits.filter((c) => c.subject.startsWith("fix"));
const other = commits.filter(
  (c) => !c.subject.startsWith("feat") && !c.subject.startsWith("fix"),
);

const today = new Date().toISOString().slice(0, 10);
let entry = `\n## [${next}] — ${today}\n`;
if (features.length) {
  entry +=
    "\n### Features\n" +
    features
      .map(
        (c) =>
          `- ${c.subject.replace(/^feat(\([^)]+\))?:\s*/, "")} (${c.hash})`,
      )
      .join("\n") +
    "\n";
}
if (fixes.length) {
  entry +=
    "\n### Bug Fixes\n" +
    fixes
      .map(
        (c) => `- ${c.subject.replace(/^fix(\([^)]+\))?:\s*/, "")} (${c.hash})`,
      )
      .join("\n") +
    "\n";
}
if (other.length) {
  entry +=
    "\n### Other\n" +
    other.map((c) => `- ${c.subject} (${c.hash})`).join("\n") +
    "\n";
}

// 6. Prepend to CHANGELOG.md
const changelogPath = resolve(ROOT, "CHANGELOG.md");
const header = "# Changelog\n";
const existing = existsSync(changelogPath)
  ? readFileSync(changelogPath, "utf-8")
  : header;
const body = existing.startsWith(header)
  ? existing.slice(header.length)
  : existing;
writeFileSync(changelogPath, header + entry + body);

// 7. Commit and tag
git("add", "package.json", "CHANGELOG.md");
git("commit", "-m", `chore: release v${next}`);
git("tag", "-a", `v${next}`, "-m", `Release v${next}`);

console.log(`Released v${next} (${bump} bump)`);
console.log(`Tag v${next} created — push with: git push && git push --tags`);
