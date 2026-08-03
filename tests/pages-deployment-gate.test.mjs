import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowUrl = new URL("../.github/workflows/pages.yml", import.meta.url);

async function readWorkflow() {
  return readFile(workflowUrl, "utf8");
}

test("Pages deployment cannot run from an ordinary push", async () => {
  const workflow = await readWorkflow();

  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s*commit_sha:\s*$/m);
  assert.match(workflow, /required:\s*true/);
});

test("Pages deployment checks out and verifies one exact commit SHA", async () => {
  const workflow = await readWorkflow();

  assert.match(workflow, /ref:\s*\$\{\{ inputs\.commit_sha \}\}/);
  assert.match(workflow, /EXPECTED_SHA:\s*\$\{\{ inputs\.commit_sha \}\}/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /actual_sha.*EXPECTED_SHA/s);
});

test("Pages deployment verifies the candidate before artifact upload", async () => {
  const workflow = await readWorkflow();

  const installIndex = workflow.indexOf("run: npm ci");
  const testIndex = workflow.indexOf("run: npm test");
  const buildIndex = workflow.indexOf("run: npm run build");
  const recordIndex = workflow.indexOf("DEPLOYED_COMMIT.txt");
  const uploadIndex = workflow.indexOf("actions/upload-pages-artifact@v3");
  const deployIndex = workflow.indexOf("actions/deploy-pages@v4");

  for (const [name, index] of Object.entries({
    installIndex,
    testIndex,
    buildIndex,
    recordIndex,
    uploadIndex,
    deployIndex,
  })) {
    assert.notEqual(index, -1, `${name} must be present`);
  }

  assert.ok(installIndex < testIndex);
  assert.ok(testIndex < buildIndex);
  assert.ok(buildIndex < recordIndex);
  assert.ok(recordIndex < uploadIndex);
  assert.ok(uploadIndex < deployIndex);
});
