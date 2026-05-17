import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts", "plan-hub.mjs");
const TEMPLATE_ROOT = join(REPO_ROOT, ".plans", "_templates", "feature");

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "network-plan-hub-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  for (const planDir of [
    ".plans",
    ".plans/ideas",
    ".plans/backlog",
    ".plans/active",
    ".plans/archive",
    ".plans/reviews",
    ".plans/audits",
    ".plans/_automation",
  ]) {
    mkdirSync(join(root, planDir), { recursive: true });
    writeFileSync(join(root, planDir, "README.md"), "# Test Surface\n");
  }
  mkdirSync(join(root, ".plans", "_templates"), { recursive: true });
  cpSync(SCRIPT_PATH, join(root, "scripts", "plan-hub.mjs"));
  cpSync(TEMPLATE_ROOT, join(root, ".plans", "_templates", "feature"), { recursive: true });
  return root;
}

function withFixture(work) {
  const root = createFixture();
  try {
    return work(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runPlanHub(root, args) {
  return spawnSync(process.execPath, ["scripts/plan-hub.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function readStatus(root, stage, slug) {
  return JSON.parse(readFileSync(join(root, ".plans", stage, slug, "status.json"), "utf8"));
}

function writeStatus(root, stage, slug, status) {
  writeFileSync(join(root, ".plans", stage, slug, "status.json"), `${JSON.stringify(status, null, 2)}\n`);
}

test("scaffold creates a complete backlog hub and validate passes", () =>
  withFixture((root) => {
    const result = runPlanHub(root, [
      "scaffold",
      "example-feature",
      "--title",
      "Example Feature",
      "--stage",
      "backlog",
    ]);

    assert.equal(result.status, 0, result.stderr);
    for (const relativePath of [
      "brief.md",
      "spec.md",
      "plan.todo.md",
      "eval.md",
      "status.json",
      "handoffs/README.md",
      "reports/README.md",
      "artifacts/README.md",
    ]) {
      assert.doesNotThrow(() => readFileSync(join(root, ".plans", "backlog", "example-feature", relativePath), "utf8"));
    }

    const status = readStatus(root, "backlog", "example-feature");
    assert.equal(status.feature.title, "Example Feature");
    assert.equal(status.feature.stage, "backlog");

    const validate = runPlanHub(root, ["validate"]);
    assert.equal(validate.status, 0, validate.stderr);
    assert.match(validate.stdout, /Validated 1 plan hub/);
  }));

test("validate fails when handoffs README is missing", () =>
  withFixture((root) => {
    assert.equal(runPlanHub(root, ["scaffold", "missing-handoff"]).status, 0);
    unlinkSync(join(root, ".plans", "backlog", "missing-handoff", "handoffs", "README.md"));

    const validate = runPlanHub(root, ["validate"]);
    assert.notEqual(validate.status, 0);
    assert.match(validate.stderr, /missing required file handoffs\/README\.md/);
  }));

test("validate fails when reports or artifacts README is missing", () =>
  withFixture((root) => {
    assert.equal(runPlanHub(root, ["scaffold", "missing-supporting-readmes"]).status, 0);
    unlinkSync(join(root, ".plans", "backlog", "missing-supporting-readmes", "reports", "README.md"));
    unlinkSync(join(root, ".plans", "backlog", "missing-supporting-readmes", "artifacts", "README.md"));

    const validate = runPlanHub(root, ["validate"]);
    assert.notEqual(validate.status, 0);
    assert.match(validate.stderr, /missing required file reports\/README\.md/);
    assert.match(validate.stderr, /missing required file artifacts\/README\.md/);
  }));

test("validate fails when the root plan surface is incomplete", () =>
  withFixture((root) => {
    assert.equal(runPlanHub(root, ["scaffold", "root-surface"]).status, 0);
    unlinkSync(join(root, ".plans", "_templates", "feature", "brief.md"));

    const validate = runPlanHub(root, ["validate"]);
    assert.notEqual(validate.status, 0);
    assert.match(validate.stderr, /missing required template file _templates\/feature\/brief\.md/);
  }));

test("validate fails when lane keys drift from the repo contract", () =>
  withFixture((root) => {
    assert.equal(runPlanHub(root, ["scaffold", "lane-drift"]).status, 0);
    const status = readStatus(root, "backlog", "lane-drift");
    delete status.lanes.platform;
    status.lanes.contracts = {
      owner: "codex",
      status: "todo",
      depends_on: [],
      handoff: "handoffs/README.md",
    };
    writeStatus(root, "backlog", "lane-drift", status);

    const validate = runPlanHub(root, ["validate"]);
    assert.notEqual(validate.status, 0);
    assert.match(validate.stderr, /lanes must contain exactly content, platform, qa_pass_1, qa_pass_2, ui/);
  }));

test("validate fails when a lane status is outside the allowed set", () =>
  withFixture((root) => {
    assert.equal(runPlanHub(root, ["scaffold", "bad-status"]).status, 0);
    const status = readStatus(root, "backlog", "bad-status");
    status.lanes.platform.status = "waiting";
    writeStatus(root, "backlog", "bad-status", status);

    const validate = runPlanHub(root, ["validate"]);
    assert.notEqual(validate.status, 0);
    assert.match(validate.stderr, /lane platform status "waiting" is invalid/);
  }));

test("validate fails when taxonomy is missing or references a missing hub", () =>
  withFixture((root) => {
    assert.equal(runPlanHub(root, ["scaffold", "taxonomy-drift"]).status, 0);
    const status = readStatus(root, "backlog", "taxonomy-drift");
    delete status.taxonomy;
    writeStatus(root, "backlog", "taxonomy-drift", status);

    const missingTaxonomy = runPlanHub(root, ["validate"]);
    assert.notEqual(missingTaxonomy.status, 0);
    assert.match(missingTaxonomy.stderr, /taxonomy is required/);

    status.taxonomy = {
      initiative: "public-experience",
      tracks: ["platform"],
      work_types: ["research"],
      surfaces: [".plans"],
      depends_on_features: ["missing-hub"],
    };
    writeStatus(root, "backlog", "taxonomy-drift", status);

    const missingDependency = runPlanHub(root, ["validate"]);
    assert.notEqual(missingDependency.status, 0);
    assert.match(missingDependency.stderr, /depends_on_features references missing hub "missing-hub"/);
  }));
