import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const verifyWorkflowUrl = new URL("../.github/workflows/verify.yml", import.meta.url);
const pagesWorkflowUrl = new URL("../.github/workflows/pages.yml", import.meta.url);
const packageLockUrl = new URL("../package-lock.json", import.meta.url);

async function readText(url) {
  return readFile(url, "utf8");
}

test("review and deployment both block high-severity dependency findings", async () => {
  const [verifyWorkflow, pagesWorkflow] = await Promise.all([
    readText(verifyWorkflowUrl),
    readText(pagesWorkflowUrl),
  ]);

  for (const [name, workflow] of Object.entries({ verifyWorkflow, pagesWorkflow })) {
    assert.match(
      workflow,
      /run:\s*npm audit --audit-level=high/,
      `${name} must block high-severity npm audit findings`,
    );

    const installIndex = workflow.indexOf("run: npm ci");
    const auditIndex = workflow.indexOf("run: npm audit --audit-level=high");
    const buildIndex = workflow.indexOf("run: npm run build");

    assert.notEqual(installIndex, -1, `${name} must install from the lockfile`);
    assert.notEqual(auditIndex, -1, `${name} must run the audit gate`);
    assert.notEqual(buildIndex, -1, `${name} must build`);
    assert.ok(installIndex < auditIndex, `${name} must audit after installation`);
    assert.ok(auditIndex < buildIndex, `${name} must audit before build`);
  }
});

test("the lockfile contains a PostCSS release beyond both affected ranges", async () => {
  const packageLock = JSON.parse(await readText(packageLockUrl));
  const postcss = packageLock.packages?.["node_modules/postcss"];

  assert.ok(postcss, "PostCSS must remain visible in the dependency lockfile");
  assert.equal(postcss.dev, true, "PostCSS must remain a development dependency");

  const parts = postcss.version.split(".").map(Number);
  assert.equal(parts.length, 3, "PostCSS must use a stable semantic version");
  assert.ok(
    parts[0] > 8 ||
      (parts[0] === 8 && parts[1] > 5) ||
      (parts[0] === 8 && parts[1] === 5 && parts[2] >= 23),
    `PostCSS ${postcss.version} must be outside the affected <=8.5.22 range`,
  );
});
