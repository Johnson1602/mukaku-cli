# Releasing a mukaku-cli feature version update

This guide walks through releasing a completed backward-compatible feature from
the local repository to npm.

The current worked example is the new `mukaku featured` command. The installed
npm version is `0.1.1`, so this feature release should become `0.2.0`.

The goal is to understand the release sequence and why each step exists, not
only to copy a list of commands.

## 1. Choose the version with SemVer

Semantic Versioning uses three numbers:

```text
MAJOR.MINOR.PATCH
```

Use them as follows:

- `PATCH`: backward-compatible bug fix, such as `0.1.1` to `0.1.2`.
- `MINOR`: backward-compatible new functionality, such as `0.1.1` to `0.2.0`.
- `MAJOR`: breaking change to the public CLI or JSON contract, such as `0.2.0`
  to `1.0.0`.

The new `featured` command adds functionality without breaking `search` or
`resources`. It is therefore a minor release:

```text
0.1.1 -> 0.2.0
```

Why:

- A new top-level command is more than a bug fix.
- Existing command syntax and output contracts still work.
- Versions below `1.0.0` still use minor releases to communicate meaningful
  backward-compatible features.

Checkpoint:

Run:

```bash
node -p "require('./package.json').version"
curl -sS https://registry.npmjs.org/@willxuu%2Fmukaku-cli/latest
```

Expected:

- The local package version is `0.1.1`.
- The registry response contains `"version":"0.1.1"`.

If `npm view @willxuu/mukaku-cli version` works on your machine, it is a shorter
registry check. The direct registry URL is a useful fallback when npm's local
cache has a permissions problem.

## 2. Finish and verify the feature before changing the version

Keep the package at its old version while the feature is still under
development. First prove that the new behavior is complete.

For the featured command, run:

```bash
pnpm typecheck
pnpm test
pnpm build
node dist/index.mjs featured --help
node dist/index.mjs featured movies --limit 2
node dist/index.mjs featured recent --limit 2 --json
```

Why:

- Typechecking verifies the new shared category types and command integration.
- Tests verify category mapping, normalization, limiting, and raw-option rules.
- The build proves the published `dist/index.mjs` can be generated.
- Smoke tests exercise the same built entry point that npm users will run.

Checkpoint:

Expected:

- TypeScript succeeds.
- All tests pass.
- `dist/index.mjs` builds successfully.
- `featured --help` lists `movies`, `tv`, `recent`, `weekly`, and `monthly`.
- Human and JSON smoke tests return featured items or a clear upstream error.

Do not bump the version while tests are failing. A version number should label a
known release candidate, not work that is still changing.

## 3. Review exactly what will become the feature commit

Run:

```bash
git status --short
git diff --check
git diff --stat
```

For this release, the feature-related files are:

```text
package.json
README.md
src/index.ts
src/api/featured.ts
src/api/featured.test.ts
src/commands/featured.ts
src/commands/featured.test.ts
src/type-utils.ts
guides/releasing-feature-version-update.md
```

`NOTES.md` is unrelated local work. Leave it untracked and do not include it in
the release commits.

Why:

- A release should be explainable from its Git history.
- Explicit staging prevents unrelated local files from entering the release.
- `git diff --check` catches whitespace errors before they become commits.

Checkpoint:

Expected:

- The diff contains the featured command, tests, shared type helper, README
  documentation, package description, and this guide.
- `package.json` still says `0.1.1`.
- `NOTES.md` remains unstaged.

## 4. Commit the completed feature

Stage only the files that belong to the feature:

```bash
git add package.json README.md src/index.ts src/api/featured.ts src/api/featured.test.ts src/commands/featured.ts src/commands/featured.test.ts src/type-utils.ts guides/releasing-feature-version-update.md
git commit -m "feat: add featured command"
```

Why:

- The feature commit answers, "What behavior changed?"
- The later version commit answers, "Which release number was assigned?"
- Keeping those ideas separate makes the history easier to inspect and revert.

Checkpoint:

Run:

```bash
git status --short
git log --oneline -2
```

Expected:

- The latest commit is `feat: add featured command`.
- Only unrelated files such as `NOTES.md` remain untracked.
- There are no modified tracked files.

## 5. Create the version commit and tag

The feature is already committed and verified. Use npm's normal version command
to update the package version and create the corresponding Git commit and tag:

```bash
npm version minor
```

Expected output:

```text
v0.2.0
```

By default, this command:

1. Updates `package.json` from `0.1.1` to `0.2.0`.
2. Creates a Git commit whose default message is `0.2.0`.
3. Creates the Git tag `v0.2.0`.

The default commit message is valid. If you prefer the repository's conventional
commit style, customize it with:

```bash
npm version minor -m "chore: release v%s"
```

`%s` is replaced with `0.2.0`.

Why:

- `npm version` is the standard npm command for keeping the package version,
  release commit, and Git tag together.
- This pattern is common in the OSS repositories inspected locally. Some run it
  manually, while others run the same operation inside GitHub Actions.
- The commit and tag stay local until you push them, so you can publish first
  and only push after npm accepts the release.

Untracked files such as `NOTES.md` do not prevent `npm version minor`. Modified
or staged tracked files do prevent it, because npm expects a clean tracked
working tree.

Checkpoint:

Run:

```bash
node -p "require('./package.json').version"
git log -1 --oneline
git tag --list "v0.2.0"
git status --short
```

Expected:

- The package version is `0.2.0`.
- The latest commit is `0.2.0`, or your custom release message.
- The local tag `v0.2.0` exists.
- Only unrelated untracked files such as `NOTES.md` remain.

## 6. Publish version 0.2.0

Confirm npm authentication:

```bash
npm whoami
```

Expected:

```text
willxuu
```

If necessary:

```bash
npm login
```

Publish:

```bash
npm publish --access public
```

The repository already has release checks in `package.json`:

```text
prepublishOnly -> pnpm typecheck && pnpm test
prepack         -> pnpm build
```

Therefore `npm publish` reruns typechecking and tests, rebuilds
`dist/index.mjs`, packs the allowlisted files, and uploads the package.

Expected:

```text
+ @willxuu/mukaku-cli@0.2.0
```

Why this guide does not require another local tarball installation:

- The feature was tested and built before its commit.
- `npm publish` repeats typechecking, tests, and the build.
- The package uses a strict `files` allowlist.
- This release does not change `bin`, `files`, build tooling, or package layout.

The longer `npm pack` and local installation rehearsal remains useful when
packaging behavior changes. It is not necessary for every feature release.

Checkpoint:

```bash
curl -sS https://registry.npmjs.org/@willxuu%2Fmukaku-cli/latest
```

Expected:

- The response contains `"version":"0.2.0"`.

npm versions are immutable. Once `0.2.0` exists, do not try to overwrite it.

## 7. Push the release commit and tag

After npm confirms the publish succeeded, push the local release commit and tag:

```bash
git push origin main --follow-tags
```

Why:

- `--follow-tags` pushes the branch and annotated tags reachable from the pushed
  commits.
- `npm version` creates an annotated version tag.
- Waiting until after publication avoids advertising a remote release tag when
  npm publication failed.

Checkpoint:

```bash
git status --short
git ls-remote --tags origin "refs/tags/v0.2.0"
```

Expected:

- Only unrelated untracked files such as `NOTES.md` remain locally.
- The remote contains `v0.2.0`.

## 8. Verify the published package

Install the exact registry version:

```bash
npm install -g @willxuu/mukaku-cli@0.2.0
```

Then run:

```bash
mukaku --version
mukaku featured --help
mukaku featured recent --limit 2 --json
```

Expected:

- `mukaku --version` prints `0.2.0`.
- The published CLI exposes all five featured categories.
- The featured command produces normalized results or a clear upstream error.

This is a post-release smoke test. It confirms the public registry artifact, but
it does not block pushing the tag when npm publication itself already succeeded.

## 9. Create the GitHub Release

Create a GitHub Release from tag `v0.2.0`.

Suggested title:

```text
@willxuu/mukaku-cli v0.2.0
```

Suggested release notes:

````markdown
## What's new

- Add `mukaku featured` for Mukaku homepage selections and popularity lists
- Add `movies`, `tv`, `recent`, `weekly`, and `monthly` categories
- Support normalized JSON, raw API output, and optional local result limiting

## Install

```sh
npm install -g @willxuu/mukaku-cli
```

## Example

```sh
mukaku featured recent --json
```
````

Checkpoint:

- The release points to `v0.2.0`.
- The release notes describe user-visible behavior rather than implementation
  details.

## Normal future feature release workflow

For another backward-compatible feature after `0.2.0`, the compact workflow is:

```bash
# Verify and commit the completed feature
pnpm typecheck
pnpm test
pnpm build
git add <feature-files>
git commit -m "feat: describe the feature"

# Create the version commit and tag
npm version minor

# Publish; lifecycle scripts rerun tests and build
npm whoami
npm publish --access public

# Push only after npm succeeds
git push origin main --follow-tags

# Verify the registry artifact
npm install -g @willxuu/mukaku-cli@<new-version>
mukaku --version
mukaku <new-command-or-behavior>
```

## Optional packaging rehearsal

Run this extra rehearsal when changing any packaging boundary:

- `package.json` `bin` or `files`
- Build output paths
- Runtime dependencies
- Build tooling
- Generated files included in the npm package

Commands:

```bash
npm pack --dry-run
npm pack
pnpm add -g ./willxuu-mukaku-cli-<new-version>.tgz
mukaku --version
rm ./willxuu-mukaku-cli-<new-version>.tgz
```

`npm pack --dry-run` should list only:

```text
dist/index.mjs
LICENSE
package.json
README.md
```

## Common failure modes

### `npm version` refuses to run

Cause:

- Tracked feature changes are still uncommitted.

Fix:

- Finish verification and create the feature commit first.
- Leave unrelated untracked files such as `NOTES.md` unstaged.

### npm says version `0.2.0` already exists

First verify:

```bash
curl -sS https://registry.npmjs.org/@willxuu%2Fmukaku-cli/0.2.0
```

If the version exists, never try to overwrite it. Fix any remaining problem and
release a new patch version such as `0.2.1`.

### Publish fails after `npm version minor`

The release commit and tag are still local because the push happens later.

- Fix authentication, networking, or package validation errors.
- Retry `npm publish --access public`.
- Push the commit and tag only after npm succeeds.

If the registry actually accepted `0.2.0`, do not repeat the publish. Verify it,
then push the existing release commit and tag.

### The published package has a defect

Do not overwrite or move `v0.2.0`. Make the fix and publish a patch release:

```bash
git commit -m "fix: describe the correction"
npm version patch
npm publish --access public
git push origin main --follow-tags
```

### npm reports root-owned cache files

Do not run npm itself with `sudo`. Repair the ownership of `~/.npm` using the
specific command printed by npm, then rerun authentication or publication.

## References

- Existing first-publish guide:
  `guides/publishing-mukaku-cli-to-npm.md`
- Semantic Versioning: https://semver.org/
- npm version: https://docs.npmjs.com/cli/commands/npm-version/
- npm publish: https://docs.npmjs.com/cli/commands/npm-publish/
- npm lifecycle scripts: https://docs.npmjs.com/cli/using-npm/scripts/
