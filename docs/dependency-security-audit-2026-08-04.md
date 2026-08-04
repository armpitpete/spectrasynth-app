# Dependency security audit — 2026-08-04

## Trigger

The accepted v0.34 Pages deployment run `30885076017` completed successfully, but `npm ci` reported one high-severity vulnerability.

## Exact deployed baseline

`2da1ea07801ce3b0d461ed98910720c66df799a0`

The read-only audit on draft PR #152 identified:

- package: `postcss`;
- locked version: `8.5.15`;
- relationship: transitive development dependency of `vite@8.0.16`;
- direct application dependency: no;
- shipped in the static Pages artifact: no.

## Advisories

### GHSA-r28c-9q8g-f849

High severity. PostCSS versions through `8.5.17` could follow attacker-controlled `sourceMappingURL` paths outside the expected directory and disclose readable `.map` files when processing untrusted CSS.

Patched in `8.5.18`.

### GHSA-fxqj-rqcc-2cmp / CVE-2026-69153

Moderate severity. The earlier repair remained incomplete when PostCSS processed attacker-controlled CSS without a `from` option. Versions through `8.5.22` could still read and disclose arbitrary valid `.map` files.

Patched in `8.5.23`.

## SpectraSynth exposure classification

The accepted public site is a static GitHub Pages bundle. It does not ship Node, Vite, PostCSS or `node_modules`, and it does not accept or process user-supplied CSS. The vulnerable code was therefore not reachable in the deployed browser application.

The package remained relevant to the build environment because Vite uses PostCSS while compiling repository-controlled CSS. The correct response was a bounded lockfile update, not an emergency withdrawal of v0.34.

## Repair

- updated only the transitive lock resolution from `postcss@8.5.15` to `postcss@8.5.25`;
- retained `vite@8.0.16` and the existing application dependency declaration;
- added `npm audit --audit-level=high` after locked installation in both review verification and manual exact-SHA Pages deployment;
- added contract tests proving the audit gate exists before build and the locked PostCSS version is outside the affected range.

## Acceptance requirements

The repair may proceed to protected review only when:

- `npm ci` succeeds;
- `npm audit --audit-level=high` reports zero high or critical findings;
- all contract tests pass;
- the production bundle builds;
- no runtime audio or interface file changes;
- no deployment is performed;
- the exact candidate head is recorded.
