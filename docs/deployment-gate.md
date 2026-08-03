# SpectraSynth deployment gate

## Authority split

Repository merge and public deployment are separate protected decisions.

A merge into `main` must not publish the site by itself.

The Pages workflow is therefore manual-only and requires an exact commit SHA.

## Required sequence

1. Accept and merge a repository candidate through its protected gate.
2. Resolve the exact commit to publish.
3. Verify that the commit has the required automated and hands-on acceptance evidence.
4. Obtain separate deployment authority naming that exact commit.
5. Manually dispatch the `Pages` workflow and enter the exact authorised SHA.
6. Confirm the workflow checks out the same SHA.
7. Require locked installation, contract tests and production build to pass.
8. Deploy the resulting artifact.
9. Verify the public site and record the deployed commit.

## Workflow evidence

The generated artifact contains:

`DEPLOYED_COMMIT.txt`

Its value must equal the exact authorised SHA supplied to the workflow.

## Stop conditions

Do not dispatch deployment when:

- no separate deployment authority has been given;
- the requested SHA is ambiguous or has changed;
- required automated checks have failed;
- required hands-on acceptance is missing;
- the workflow contains a `push` deployment trigger;
- the public target or deployment source is uncertain.

## Current boundary

Issue #148 and its implementation repair the authority mechanism only.

Merging that repair does not itself authorise a Pages dispatch or public publication.
