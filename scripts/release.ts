#!/usr/bin/env bun
// Usage: bun run release [major|minor|patch|alpha]
// Auto-detects bump type from conventional commits if not specified.
// Use "alpha" to increment the prerelease counter on the current base version.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

function git(...args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], { cwd: ROOT });
  if (!result.success) return "";
  return result.stdout.toString().trim();
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 1. Find last tag
const lastTag = git("describe", "--tags", "--abbrev=0") || null;

// 2. Validate CLI arg early so bump is known before logRange computation
type BumpType = "major" | "minor" | "patch" | "alpha";
const cliArg = process.argv[2] as BumpType | undefined;
const validBumps = new Set<string>(["major", "minor", "patch", "alpha"]);

if (cliArg && !validBumps.has(cliArg)) {
  console.error(`Unknown bump type: ${cliArg}. Use: major | minor | patch | alpha`);
  process.exit(1);
}

// 3. Parse commits for auto-detection using stable logRange
const stableLogRange = lastTag ? `${lastTag}..HEAD` : "HEAD";
const stableLog = git("log", stableLogRange, "--pretty=format:%H|%s");
const stableCommits = stableLog
  ? stableLog.split("\n").map((line) => {
      const [hash, ...rest] = line.split("|");
      return { hash: hash.slice(0, 7), subject: rest.join("|") };
    })
  : [];

if (stableCommits.length === 0 && !cliArg) {
  console.log("No commits since last tag. Pass bump type explicitly to force.");
  process.exit(0);
}

// 4. Determine bump type
let bump: BumpType;
if (cliArg) {
  bump = cliArg;
} else {
  const hasBreaking = stableCommits.some(
    (c) =>
      c.subject.includes("BREAKING CHANGE") ||
      /^[a-z]+(\(.+\))?!:/.test(c.subject),
  );
  const hasFeat = stableCommits.some((c) => c.subject.startsWith("feat"));
  bump = hasBreaking ? "major" : hasFeat ? "minor" : "patch";
}

// 5. Compute logRange — alpha uses last release commit as boundary
let logRange: string;
let commits: { hash: string; subject: string }[];

if (bump === "alpha") {
  const lastReleaseCommit =
    git("log", "--pretty=format:%H", "-1", "--grep=^chore: release v") || null;
  logRange = lastReleaseCommit
    ? `${lastReleaseCommit}..HEAD`
    : lastTag
      ? `${lastTag}..HEAD`
      : "HEAD";
  const alphaLog = git("log", logRange, "--pretty=format:%H|%s");
  commits = alphaLog
    ? alphaLog.split("\n").map((line) => {
        const [hash, ...rest] = line.split("|");
        return { hash: hash.slice(0, 7), subject: rest.join("|") };
      })
    : [];
} else {
  logRange = stableLogRange;
  commits = stableCommits;
}

// 6. Compute next version
const pkgPath = resolve(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const currentVersion: string = pkg.version;
const baseVersion = currentVersion.replace(/-.*$/, "");
const [maj, min, pat] = baseVersion.split(".").map(Number);

let next: string;
if (bump === "alpha") {
  const alphaMatch = currentVersion.match(/-alpha(?:\.(\d+))?$/);
  const currentAlphaNum = alphaMatch ? Number(alphaMatch[1] ?? 0) : 0;
  next = `${baseVersion}-alpha.${currentAlphaNum + 1}`;
} else {
  const isPrerelease = currentVersion !== baseVersion;
  const semver =
    bump === "major"
      ? `${maj + 1}.0.0`
      : bump === "minor"
        ? `${maj}.${min + 1}.0`
        : isPrerelease
          ? baseVersion
          : `${maj}.${min}.${pat + 1}`;
  next = semver;
}

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// 7. Categorize commits for changelog
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

// 8. Prepend to CHANGELOG.md (stable release removes prior alpha entries for this base version)
const changelogPath = resolve(ROOT, "CHANGELOG.md");
const header = "# Changelog\n";
const existing = existsSync(changelogPath)
  ? readFileSync(changelogPath, "utf-8")
  : header;
let body = existing.startsWith(header)
  ? existing.slice(header.length)
  : existing;

if (bump !== "alpha") {
  // Remove existing alpha pre-release entries for this base version
  const sections = body.split(/(?=\n## \[)/);
  const filtered = sections.filter(
    (s) => !s.match(new RegExp(`^\\n## \\[${escapeRegex(baseVersion)}-alpha`)),
  );
  body = filtered.join("");
}

writeFileSync(changelogPath, header + entry + body);

// 9. Commit and optionally tag
git("add", "package.json", "CHANGELOG.md");
git("commit", "-m", `chore: release v${next}`);
if (bump !== "alpha") {
  git("tag", "-a", `v${next}`, "-m", `Release v${next}`);
}

console.log(`Released v${next} (${bump} bump)`);
if (bump !== "alpha") {
  console.log(`Tag v${next} created — push with: git push && git push --tags`);
} else {
  console.log(`Alpha release committed (no tag) — push with: git push`);
}
