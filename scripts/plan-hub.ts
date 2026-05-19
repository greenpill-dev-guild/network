#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const PLANS_ROOT = join(REPO_ROOT, ".plans");
const TEMPLATE_ROOT = join(PLANS_ROOT, "_templates", "feature");
const STAGES = ["ideas", "backlog", "active", "archive"];
const STAGE_TO_WORKFLOW_STATUS = {
  ideas: "idea",
  backlog: "backlog",
  active: "active",
  archive: "archived",
};
const REQUIRED_ROOT_ENTRIES = [
  "README.md",
  "ideas/README.md",
  "backlog/README.md",
  "active/README.md",
  "archive/README.md",
  "reviews/README.md",
  "audits/README.md",
  "_automation/README.md",
];
const REQUIRED_FILES = [
  "brief.md",
  "spec.md",
  "plan.todo.md",
  "eval.md",
  "status.json",
  "handoffs/README.md",
  "reports/README.md",
  "artifacts/README.md",
];
const TEMPLATE_FILES = [
  "brief.md",
  "spec.md",
  "plan.todo.md",
  "eval.md",
  "status.json",
  "handoffs/README.md",
  "reports/README.md",
  "artifacts/README.md",
];
const LANE_RULES = {
  ui: {
    allowedOwners: new Set(["claude", "codex", "human", "shared"]),
    depends_on: [],
  },
  content: {
    allowedOwners: new Set(["claude", "codex", "human", "shared"]),
    depends_on: [],
  },
  platform: {
    allowedOwners: new Set(["claude", "codex", "human", "shared"]),
    depends_on: [],
  },
  qa_pass_1: {
    allowedOwners: new Set(["claude", "codex", "human", "shared"]),
    depends_on: ["ui", "content", "platform"],
  },
  qa_pass_2: {
    allowedOwners: new Set(["claude", "codex", "human", "shared"]),
    depends_on: ["qa_pass_1"],
  },
};
const VALID_LANE_STATUSES = new Set([
  "todo",
  "ready",
  "in_progress",
  "blocked",
  "completed",
  "passed",
  "failed",
  "n/a",
  "skipped",
]);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv: string[]): {
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}

function assertStage(stage: string): void {
  if (!STAGES.includes(stage)) {
    fail(`Invalid stage "${stage}". Expected one of: ${STAGES.join(", ")}`);
  }
}

function assertSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail(`Invalid feature slug "${slug}". Use lowercase letters, numbers, and hyphens only.`);
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function nowIso() {
  return new Date().toISOString();
}

function applyTemplate(templateFile: string, destinationDir: string, replacements: Record<string, string>): void {
  const sourcePath = join(TEMPLATE_ROOT, templateFile);
  const destinationPath = join(destinationDir, templateFile);
  let contents = readFileSync(sourcePath, "utf8");

  for (const [key, value] of Object.entries(replacements)) {
    contents = contents.replaceAll(`{{${key}}}`, value);
  }

  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, contents);
}

function commandScaffold(args) {
  const { positional, flags } = parseArgs(args);
  const slug = positional[1];
  const stage = flags.stage ? String(flags.stage) : "backlog";
  const title = flags.title ? String(flags.title) : titleFromSlug(slug);

  if (!slug) {
    fail("Usage: bun scripts/plan-hub.ts scaffold <feature-slug> [--title \"Feature Title\"] [--stage backlog]");
  }

  assertSlug(slug);
  assertStage(stage);

  const destinationDir = join(PLANS_ROOT, stage, slug);
  if (existsSync(destinationDir)) {
    fail(`Feature hub already exists: ${destinationDir}`);
  }

  const timestamp = nowIso();
  const replacements = {
    FEATURE_SLUG: slug,
    FEATURE_TITLE: title,
    STAGE: stage,
    WORKFLOW_STATUS: STAGE_TO_WORKFLOW_STATUS[stage],
    DATE: timestamp,
  };

  mkdirSync(destinationDir, { recursive: true });
  for (const templateFile of TEMPLATE_FILES) {
    applyTemplate(templateFile, destinationDir, replacements);
  }

  console.log(`Scaffolded ${stage} hub at .plans/${stage}/${slug}/`);
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function validateStringArray(errors, pathLabel, value) {
  if (!Array.isArray(value)) {
    errors.push(`${pathLabel} must be an array`);
    return;
  }

  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      errors.push(`${pathLabel} must contain only non-empty strings`);
      return;
    }
  }
}

function validateRootSurface(errors) {
  for (const relativePath of REQUIRED_ROOT_ENTRIES) {
    if (!isFile(join(PLANS_ROOT, relativePath))) {
      errors.push(`.plans: missing required root entry ${relativePath}`);
    }
  }

  for (const templateFile of TEMPLATE_FILES) {
    if (!isFile(join(TEMPLATE_ROOT, templateFile))) {
      errors.push(`.plans: missing required template file _templates/feature/${templateFile}`);
    }
  }
}

function validateTaxonomy(errors, status, stage, slug, knownFeatureSlugs) {
  const taxonomy = status?.taxonomy;
  const basePath = `.plans/${stage}/${slug}: taxonomy`;

  if (!taxonomy || typeof taxonomy !== "object" || Array.isArray(taxonomy)) {
    errors.push(`${basePath} is required`);
    return;
  }

  if (typeof taxonomy.initiative !== "string" || taxonomy.initiative.length === 0) {
    errors.push(`${basePath}.initiative must be a non-empty string`);
  }

  validateStringArray(errors, `${basePath}.tracks`, taxonomy.tracks);
  validateStringArray(errors, `${basePath}.work_types`, taxonomy.work_types);
  validateStringArray(errors, `${basePath}.surfaces`, taxonomy.surfaces);
  validateStringArray(errors, `${basePath}.depends_on_features`, taxonomy.depends_on_features);

  if (Array.isArray(taxonomy.depends_on_features)) {
    for (const dependency of taxonomy.depends_on_features) {
      if (!knownFeatureSlugs.has(dependency)) {
        errors.push(`${basePath}.depends_on_features references missing hub "${dependency}"`);
      }
    }
  }
}

function validateFeatureDir(featureDir, stage, knownFeatureSlugs) {
  const errors = [];
  const slug = basename(featureDir);

  for (const relativePath of REQUIRED_FILES) {
    const fullPath = join(featureDir, relativePath);
    if (!isFile(fullPath)) {
      errors.push(`.plans/${stage}/${slug}: missing required file ${relativePath}`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  let status;
  try {
    status = JSON.parse(readFileSync(join(featureDir, "status.json"), "utf8"));
  } catch (error) {
    errors.push(`.plans/${stage}/${slug}: status.json is not valid JSON (${error.message})`);
    return errors;
  }

  if (status?.feature?.slug !== slug) {
    errors.push(`.plans/${stage}/${slug}: feature.slug must equal "${slug}"`);
  }

  if (status?.feature?.stage !== stage) {
    errors.push(`.plans/${stage}/${slug}: feature.stage must equal "${stage}"`);
  }

  if (status?.workflow?.overall_status !== STAGE_TO_WORKFLOW_STATUS[stage]) {
    errors.push(
      `.plans/${stage}/${slug}: workflow.overall_status must equal "${STAGE_TO_WORKFLOW_STATUS[stage]}"`
    );
  }

  if (status?.links?.brief !== "brief.md") {
    errors.push(`.plans/${stage}/${slug}: links.brief must equal "brief.md"`);
  }

  if (status?.links?.spec !== "spec.md") {
    errors.push(`.plans/${stage}/${slug}: links.spec must equal "spec.md"`);
  }

  if (status?.links?.plan !== "plan.todo.md") {
    errors.push(`.plans/${stage}/${slug}: links.plan must equal "plan.todo.md"`);
  }

  if (status?.links?.eval !== "eval.md") {
    errors.push(`.plans/${stage}/${slug}: links.eval must equal "eval.md"`);
  }

  validateTaxonomy(errors, status, stage, slug, knownFeatureSlugs);

  const lanes = status?.lanes;
  if (!lanes || typeof lanes !== "object" || Array.isArray(lanes)) {
    errors.push(`.plans/${stage}/${slug}: lanes must be an object`);
    return errors;
  }

  const laneNames = Object.keys(lanes).sort();
  const expectedLaneNames = Object.keys(LANE_RULES).sort();
  if (laneNames.length !== expectedLaneNames.length || laneNames.some((lane, index) => lane !== expectedLaneNames[index])) {
    errors.push(
      `.plans/${stage}/${slug}: lanes must contain exactly ${expectedLaneNames.join(", ")}`
    );
  }

  for (const [laneName, laneRule] of Object.entries(LANE_RULES)) {
    const lane = lanes[laneName];
    if (!lane || typeof lane !== "object" || Array.isArray(lane)) {
      errors.push(`.plans/${stage}/${slug}: lane ${laneName} must be an object`);
      continue;
    }

    if (typeof lane.owner !== "string" || lane.owner.length === 0) {
      errors.push(`.plans/${stage}/${slug}: lane ${laneName} must define a non-empty owner`);
    } else if (!laneRule.allowedOwners.has(lane.owner)) {
      errors.push(
        `.plans/${stage}/${slug}: lane ${laneName} owner "${lane.owner}" is not allowed`
      );
    }

    if (!VALID_LANE_STATUSES.has(lane.status)) {
      errors.push(
        `.plans/${stage}/${slug}: lane ${laneName} status "${lane.status}" is invalid`
      );
    }

    const dependsOn = Array.isArray(lane.depends_on) ? lane.depends_on : null;
    if (!dependsOn) {
      errors.push(`.plans/${stage}/${slug}: lane ${laneName} depends_on must be an array`);
    } else if (
      dependsOn.length !== laneRule.depends_on.length ||
      dependsOn.some((value, index) => value !== laneRule.depends_on[index])
    ) {
      errors.push(
        `.plans/${stage}/${slug}: lane ${laneName} depends_on must equal [${laneRule.depends_on.join(", ")}]`
      );
    }

    if (lane.handoff !== "handoffs/README.md") {
      errors.push(
        `.plans/${stage}/${slug}: lane ${laneName} handoff must point to "handoffs/README.md" in v1`
      );
    }
  }

  return errors;
}

function commandValidate() {
  if (!existsSync(PLANS_ROOT)) {
    fail(`Missing .plans root at ${PLANS_ROOT}`);
  }

  const errors = [];
  const featureEntries = [];
  const knownFeatureSlugs = new Set();
  const duplicateFeatureSlugs = new Set();
  let validatedCount = 0;

  validateRootSurface(errors);

  for (const stage of STAGES) {
    const stageDir = join(PLANS_ROOT, stage);
    if (!isDirectory(stageDir)) {
      continue;
    }

    for (const entry of readdirSync(stageDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const featureDir = join(stageDir, entry.name);

      if (knownFeatureSlugs.has(entry.name)) {
        duplicateFeatureSlugs.add(entry.name);
      }

      knownFeatureSlugs.add(entry.name);
      featureEntries.push({ stage, featureDir });
    }
  }

  for (const slug of duplicateFeatureSlugs) {
    errors.push(`.plans: feature slug "${slug}" appears in more than one stage`);
  }

  for (const { stage, featureDir } of featureEntries) {
    const featureErrors = validateFeatureDir(featureDir, stage, knownFeatureSlugs);
    if (featureErrors.length > 0) {
      errors.push(...featureErrors);
      continue;
    }

      validatedCount += 1;
  }

  if (errors.length > 0) {
    fail(errors.join("\n"));
  }

  console.log(`Validated ${validatedCount} plan hub(s).`);
}

function main(argv) {
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(`Usage:
  bun scripts/plan-hub.ts scaffold <feature-slug> [--title "Feature Title"] [--stage backlog]
  bun scripts/plan-hub.ts validate`);
    return;
  }

  if (command === "scaffold") {
    commandScaffold(argv);
    return;
  }

  if (command === "validate") {
    commandValidate();
    return;
  }

  fail(`Unknown command "${command}"`);
}

main(process.argv.slice(2));
