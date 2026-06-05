# Publishing mukaku-cli to npm: scoped global CLI package

This guide walks you from the current local repo to a public npm package your friends can install globally. The goal is to understand the publish path, not only to copy commands.

You will publish the package as `@willxuu/mukaku-cli`, while keeping the installed command as `mukaku`.

## 1. Understand the publishing shape

Before editing files, keep these concepts separate:

- Package name: the npm registry name users install. We will use `@willxuu/mukaku-cli`.
- Binary name: the command installed into PATH. We will keep `mukaku`.
- Published files: the tarball contents uploaded to npm. We will allowlist only runtime files.
- GitHub Release: a visible project milestone on GitHub. It is useful, but it comes after npm publish succeeds.

Why:

- Scoped package names make this clearly yours and avoid claiming a global name that may look official.
- The `bin` field lets friends install a scoped package but run a short command.
- npm versions are immutable, so rehearsal with `npm pack` matters before publishing.
- This repo uses pnpm for development, but the registry-facing publish commands will use npm because npm is the canonical CLI for the npm registry and is common even in pnpm-managed projects.

Checkpoint:

Run:

```bash
sed -n '1,220p' package.json
```

Expected:

- The current package is still named `mukaku-cli`.
- The current binary field points `mukaku` to `dist/index.mjs`.

## 2. Update `package.json` for npm publishing

Replace `package.json` with this complete file:

```json
{
  "name": "@willxuu/mukaku-cli",
  "version": "0.1.1",
  "description": "A CLI for searching Mukaku movie and TV resources",
  "type": "module",
  "bin": {
    "mukaku": "dist/index.mjs"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsdown",
    "prepack": "pnpm build",
    "prepublishOnly": "pnpm typecheck && pnpm test",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "cli",
    "mukaku",
    "movie",
    "tv",
    "torrent"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Johnson1602/mukaku-cli.git"
  },
  "bugs": {
    "url": "https://github.com/Johnson1602/mukaku-cli/issues"
  },
  "homepage": "https://github.com/Johnson1602/mukaku-cli#readme",
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=22"
  },
  "dependencies": {
    "commander": "^14.0.3",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "tsdown": "^0.22.0",
    "tsx": "^4.22.3",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  },
  "packageManager": "pnpm@11.5.1+sha512.93f7b57422ea7068257235b4c16eb60762eb68e1dc23723199cc739043ea9be2c4143274a399d8c6defa2b1176226d9ca1c4b63482d6200c1a8fbaa78c1d1485"
}
```

Why:

- `name` changes the install name to the scoped public package.
- `bin` keeps the command as `mukaku`.
- `files` is an allowlist for the npm tarball. This prevents local notes, plans, tests, and source files from being published accidentally.
- `prepack` builds `dist` before `npm pack` and before `npm publish`.
- `prepublishOnly` runs typecheck and tests before a real publish, but not for every local pack rehearsal.
- `publishConfig.access` encodes that this scoped package is public. The guide still passes `--access public` on the first publish so the first scoped public release is explicit.
- `repository`, `bugs`, `homepage`, and `keywords` make the npm package page understandable.

Checkpoint:

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected:

- TypeScript succeeds.
- Vitest succeeds.
- `dist/index.mjs` is rebuilt and remains executable.

## 3. Update README for friends first, contributors second

Replace `README.md` with this complete file:

````markdown
# mukaku-cli

A small TypeScript CLI for searching Mukaku movie and TV resources, inspecting title-level torrent resources, and getting simple resource recommendations.

The CLI is intentionally stateless: it calls Mukaku live, normalizes the response, and prints either compact terminal output or JSON for agents and scripts.

## Install

```sh
npm install -g @willxuu/mukaku-cli
```

After install, use the `mukaku` command:

```sh
mukaku search "Avatar"
```

## Commands

### Search

Search Mukaku titles:

```sh
mukaku search "Avatar"
```

Options:

- `-l, --limit <number>`: maximum number of results to print, default `10`
- `-p, --page <number>`: result page to request, default `1`
- `--json`: print normalized JSON
- `--raw`: print the raw Mukaku API response

`--raw` cannot be combined with `--json`.

For agent workflows, prefer JSON:

```sh
mukaku search "Avatar" --json
```

### Resources

List normalized torrent resources for a Mukaku detail page. The argument is the Douban subject id used by Mukaku detail pages.

```sh
mukaku resources 1652587
```

Options:

- `--quality <quality>`: filter by exact Mukaku quality group, such as `WEB-4K`
- `--limit <number>`: maximum number of resources to print
- `--recommend [number]`: print recommended torrent resources, default `3`
- `--json`: print normalized JSON
- `--raw`: print the raw Mukaku API response

`--raw` cannot be combined with `--json`, `--quality`, `--limit`, or `--recommend`. `--recommend` cannot be combined with `--limit`.

Recommended resources:

```sh
mukaku resources 1652587 --recommend
mukaku resources 1652587 --recommend 2 --json
```

Quality-filtered resources:

```sh
mukaku resources 1652587 --quality WEB-4K
```

## Output

Human output is compact and meant for terminal reading. JSON output is the stable interface for automation.

Use `--raw` only when debugging Mukaku API behavior or updating the normalizers; it prints the upstream response without CLI normalization.

## Mukaku Client Params

Mukaku API requests include `app_id` and `identity` query parameters. They are public request identifiers used by Mukaku's web client, not private credentials, and are centralized in `src/api/http.ts`.

## Development

Install dependencies:

```sh
pnpm install
```

Run from source:

```sh
pnpm dev search "Avatar"
```

Run the built CLI:

```sh
pnpm build
node dist/index.mjs search "Avatar"
```

Verify changes:

```sh
pnpm typecheck
pnpm test
pnpm build
```
````

Why:

- The npm package page renders this README, so the first command should be the friend-facing install command.
- Development setup still exists, but lower down.
- The README avoids a prominent Node requirement section, while `package.json` still keeps the actual `engines.node` metadata.

Checkpoint:

Run:

```bash
sed -n '1,220p' README.md
```

Expected:

- The first usage section shows `npm install -g @willxuu/mukaku-cli`.
- Development commands are still documented near the end.

## 4. Inspect the publish tarball without uploading

Run:

```bash
npm pack --dry-run
```

Why:

- `npm publish` will pack and upload the package.
- `npm pack --dry-run` lets you inspect the package contents before the irreversible upload.
- Because `prepack` exists, this command should run `pnpm build` before showing the tarball contents.

Expected contents:

```text
dist/index.mjs
LICENSE
package.json
README.md
```

Expected not to appear:

```text
NOTES.md
AGENTS.md
src/
plans/
guides/
tsconfig.json
tsdown.config.ts
pnpm-workspace.yaml
```

If extra files appear, stop and fix the `files` allowlist before continuing.

## 5. Create and install the local tarball

Run:

```bash
npm pack
```

Expected:

- A tarball named like `willxuu-mukaku-cli-0.1.1.tgz` appears in the repo root.

Install that tarball globally with pnpm:

```bash
pnpm add -g ./willxuu-mukaku-cli-0.1.1.tgz
```

Why:

- This proves the exact package tarball can be globally installed before npm users see it.
- Use `pnpm add -g` rather than `pnpm i -g` because `add` is the clearer command for adding a specific package or tarball globally.

Checkpoint:

Run:

```bash
mukaku --version
mukaku search "Avatar" --limit 1
```

Expected:

- `mukaku --version` prints `0.1.1`.
- The search command either prints one result or a clear upstream Mukaku error. A normal CLI parse/runtime failure means the package is not ready.

If pnpm says the global bin directory is not configured, run:

```bash
pnpm setup
```

Then restart your shell and retry the global install.

After the local install test works, remove the generated tarball from the repo root:

```bash
rm willxuu-mukaku-cli-0.1.1.tgz
```

## 6. Commit and push the publish-prep changes

Run:

```bash
git status --short
```

Expected:

- `package.json` and `README.md` are modified.
- `NOTES.md` may still be untracked from earlier local work.

Do not commit `NOTES.md`. Stage only the publish-prep files:

```bash
git add package.json README.md
git commit -m "chore: prepare npm publishing"
git push origin main
```

Why:

- The npm package should correspond to a clean, pushed GitHub commit.
- Publishing from a dirty local state makes it harder to explain exactly what was released.

Checkpoint:

Run:

```bash
git status --short
git log --oneline -3
```

Expected:

- Only unrelated local files such as `NOTES.md` remain untracked.
- The latest commit is `chore: prepare npm publishing`.

## 7. Log in to npm

Run:

```bash
npm login
npm whoami
```

Expected:

```text
willxuu
```

Why:

- `npm publish` publishes to the npm registry, and npm registry authentication comes from your npm account configuration.
- If your npm account uses two-factor authentication, npm may ask for a one-time password during login or publish.

## 8. Publish to npm with npm

Run one final check:

```bash
git status --short
npm pack --dry-run
```

Expected:

- The git state is clean except unrelated untracked local files.
- The dry-run tarball still contains only runtime package files.

Publish:

```bash
npm publish --access public
```

Why:

- `npm publish` is the direct npm registry command, and using it here avoids mixing registry behavior with pnpm workspace behavior while you are learning.
- `--access public` is required for the first publish of a scoped public package if npm cannot infer public access. Keeping it in the command makes the intent obvious.
- We are not using `--provenance` for this first manual publish. Provenance is most useful when publishing from GitHub Actions with OIDC/trusted publishing.

Expected:

- npm publishes `@willxuu/mukaku-cli@0.1.1`.
- You cannot publish `0.1.1` again, so stop and inspect any failure before retrying.

## 9. Test the real registry install

Remove the local tarball install first:

```bash
pnpm remove -g @willxuu/mukaku-cli
```

Install the real published package the way friends will:

```bash
npm install -g @willxuu/mukaku-cli
```

Checkpoint:

Run:

```bash
mukaku --version
mukaku search "Avatar" --limit 1
```

Expected:

- `mukaku --version` prints `0.1.1`.
- The CLI runs from the npm-installed package.

## 10. Tag the published commit

Only do this after `npm publish --access public` succeeds.

Run:

```bash
git tag v0.1.1
git push origin v0.1.1
```

Why:

- The tag should mark a version that definitely exists on npm.
- Tagging after publish avoids a GitHub tag that claims a release exists when the npm publish actually failed.

Checkpoint:

Run:

```bash
git tag --list "v0.1.1"
```

Expected:

```text
v0.1.1
```

## 11. Create the GitHub Release

Open the GitHub repo Releases page and create a release from tag `v0.1.1`.

Use this release title:

```text
@willxuu/mukaku-cli v0.1.1
```

Use these release notes:

````markdown
Initial npm release.

## Install

```sh
npm install -g @willxuu/mukaku-cli
```

## Features

- Search Mukaku movie and TV titles
- List normalized torrent resources by Douban subject id
- Print compact terminal output or JSON
- Recommend torrent resources with `--recommend`
````

Why:

- GitHub Releases are separate from npm publish.
- The release makes the GitHub sidebar useful and gives friends a stable “what changed” page.

Checkpoint:

Expected:

- GitHub sidebar no longer says “No releases published.”
- The release points at tag `v0.1.1`.

## Normal future release workflow

For a patch fix after this release:

```bash
pnpm typecheck
pnpm test
pnpm build
npm version patch
git push origin main
npm pack --dry-run
npm pack
pnpm add -g ./willxuu-mukaku-cli-0.1.2.tgz
mukaku --version
npm publish --access public
git push origin v0.1.2
```

Concept:

- `npm version patch` updates `package.json`, creates a version commit, and creates a git tag.
- For the first release in this guide, we tag manually after publish because you are learning the flow and want the tag to exist only after npm publish succeeds.
- Once you are comfortable, using `npm version patch` before publish is normal, as long as you are ready to delete or avoid pushing the tag if publish fails.

## Common failure modes

Package name already exists:

- If `@willxuu/mukaku-cli` somehow gets taken before you publish, choose another scoped name and update `package.json` plus README.

Tarball includes too many files:

- Fix the `files` allowlist and rerun `npm pack --dry-run`.

`mukaku` command not found after global install:

- For local pnpm global testing, run `pnpm setup`, restart the shell, and reinstall the tarball.
- For friend-facing npm installs, ask them to check their npm global bin directory is on PATH.

Publish asks for one-time password:

- Enter the current 2FA code from your npm account authenticator.

Publish says the version already exists:

- Do not retry the same version. Bump to the next patch version, verify, then publish again.

## References

- npm `package.json` fields: https://docs.npmjs.com/files/package-json/
- npm lifecycle scripts: https://docs.npmjs.com/cli/using-npm/scripts/
- npm publish: https://docs.npmjs.com/cli/publish/
