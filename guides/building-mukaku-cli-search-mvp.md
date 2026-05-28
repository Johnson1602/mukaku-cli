# Building `mukaku-cli`: Search MVP By Hand

This guide walks you from an empty repository to a working CLI command:

```bash
mukaku search "阿凡达"
mukaku search "阿凡达" --json
mukaku search "阿凡达" --raw
```

The goal is not only to make it work. The goal is to understand the moving parts of a CLI: package metadata, executable entrypoints, command parsing, HTTP calls, response validation, normalization, output modes, and tests.

We will use a deliberately small TypeScript structure:

```text
src/
  index.ts       CLI entrypoint and command parsing
  commands/
    search.ts    Search command implementation
  constants.ts   Shared Mukaku constants
  client.ts      Mukaku HTTP calls
  normalize.ts   Raw API data -> stable CLI data
  output.ts      Human-readable output
  types.ts       Shared TypeScript types and Zod schemas
```

This is flatter than a large production CLI, but it still has the important boundaries. The one folder we keep is `commands/`, because commands naturally multiply over time: `search`, `detail`, `resources`, and so on.

## 1. Choose The Stack

For this project, use:

```text
TypeScript      type safety and good JSON ergonomics
pnpm            package manager
commander       command and flag parsing
zod             runtime validation of API responses
vitest          tests
tsdown          build TypeScript into runnable JavaScript
```

Why this stack fits:

- Mukaku is HTTP plus JSON. TypeScript is excellent at this.
- We want to publish/run as an npm-style CLI eventually.
- We do not need Go or Rust yet because there is no native work, daemon, browser control, or heavy performance requirement.
- We want to learn the CLI pieces ourselves, so we avoid heavy frameworks like oclif for now.

Checkpoint:

Run these to confirm your local tools exist:

```bash
node --version
pnpm --version
```

Expected:

- Node should be `20` or newer.
- pnpm should print a version number.

If Node is too old, switch with your Node version manager before continuing.

## 2. Initialize The Package

From the repo root:

```bash
pnpm init
```

This creates `package.json`.

Edit `package.json` into something like this:

```json
{
  "name": "mukaku-cli",
  "version": "0.1.0",
  "description": "A CLI for searching Mukaku movie and TV resources",
  "type": "module",
  "bin": {
    "mukaku": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsdown",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=20"
  },
  "license": "MIT"
}
```

Important fields:

- `type: "module"` means we use modern ESM imports.
- `bin` is what makes this package expose a command named `mukaku`.
- `dev` runs the CLI directly from TypeScript while developing.
- `build` creates `dist/index.js`, which is what `bin` points to.

Checkpoint:

Run:

```bash
node -p "require('./package.json').name"
node -p "require('./package.json').bin.mukaku"
```

Expected:

```text
mukaku-cli
./dist/index.js
```

This confirms that the package name and CLI executable mapping are present.

## 3. Install Dependencies

```bash
pnpm add commander zod
pnpm add -D typescript tsx tsdown vitest @types/node
```

Why each one exists:

- `commander`: turns raw `process.argv` into commands, args, and options.
- `zod`: validates runtime JSON from Mukaku. TypeScript alone cannot validate network responses.
- `tsx`: runs TypeScript files directly during development.
- `tsdown`: builds the CLI into distributable JS.
- `vitest`: tests normalization logic.
- `@types/node`: gives TypeScript Node API types.

Checkpoint:

Run:

```bash
pnpm list commander zod
pnpm list -D typescript tsx tsdown vitest @types/node
```

Expected:

- `commander` and `zod` appear under dependencies.
- `typescript`, `tsx`, `tsdown`, `vitest`, and `@types/node` appear under dev dependencies.

If a package is missing, rerun the matching `pnpm add` command.

## 4. Add TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "rootDir": ".",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

Why:

- `strict: true` helps catch mistakes early.
- `NodeNext` matches Node ESM behavior.
- `rootDir: "."` tells TypeScript that both `src` and `test` belong to this project. Newer TypeScript versions ask for this explicitly when `outDir` is set.
- `types: ["node"]` loads Node globals like `process`.
- `include` keeps TypeScript focused on source and tests.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected at this exact stage:

- If `src/` has no `.ts` files yet, TypeScript may say it found no inputs. That is okay for now.
- Once `src/types.ts` exists, this command should pass with no output except the script header.

If you see a `rootDir` warning, make sure `"rootDir": "."` is present.

## 5. Add Build Config

Create `tsdown.config.ts`:

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
```

The `banner` is important. It inserts the shebang line:

```bash
#!/usr/bin/env node
```

That tells your shell to run the built file with Node when it is used as an executable.

Checkpoint:

Run:

```bash
pnpm build
```

Expected at this exact stage:

- It may fail because `src/index.ts` does not exist yet. That is okay.
- The important thing is that TypeScript can load `tsdown.config.ts`; you should not see an error about `defineConfig` or missing `tsdown`.

After step 11, `pnpm build` should succeed.

## 6. Define The Public Shape

Create `src/types.ts`.

This file should describe both the raw Mukaku fields we rely on and the clean output our CLI promises.

```ts
import { z } from "zod";

export const rawMukakuItemSchema = z.object({
  id: z.number().optional(),
  type: z.number().optional(),
  title: z.string().optional(),
  otitle: z.string().optional(),
  image: z.string().optional(),
  doub_id: z.number().optional(),
  doub_score: z.string().optional(),
  IMDB_number: z.string().optional(),
  IMDB_score: z.string().optional(),
  years: z.string().optional(),
  class: z.string().optional(),
  production_area: z.string().optional(),
  definition: z.string().optional(),
  zqxd: z.string().optional(),
  ejs: z.string().optional(),
  seed_updated_at: z.string().optional(),
});

export const searchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  code: z.number().optional(),
  data: z.object({
    data: z.array(rawMukakuItemSchema),
  }),
});

export type RawMukakuItem = z.infer<typeof rawMukakuItemSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;

export interface MukakuSearchItem {
  title: string;
  originalTitle?: string;
  year?: number;
  type: "movie" | "tv" | "unknown";
  doubanId?: number;
  doubanUrl?: string;
  doubanScore?: number;
  imdbId?: string;
  imdbScore?: number;
  quality?: string;
  episodeStatus?: string;
  categories: string[];
  productionArea?: string;
  definitions: string[];
  seedUpdatedAt?: string;
  image?: string;
  detailUrl?: string;
}
```

Why this matters:

- `RawMukakuItem` mirrors the upstream API fields.
- `MukakuSearchItem` is our stable CLI contract.
- This separation lets Mukaku be weird without making our users deal with weirdness.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript should pass.

Then intentionally break one thing for learning: change `title: string;` in `MukakuSearchItem` to `title: number;`, save, and run `pnpm typecheck` again. It may still pass right now because no code returns `MukakuSearchItem` yet. Change it back before continuing.

This shows an important idea: type definitions become useful when implementation code starts using them.

## 7. Add Shared Constants

Create `src/constants.ts`.

```ts
export const MUKAKU_BASE_URL = "https://web5.mukaku.com";
```

Why this file exists:

- The base URL is used by both `client.ts` and `normalize.ts`.
- Keeping it in one place prevents accidental drift.
- The `MUKAKU_` prefix makes the constant specific instead of vague.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript should pass.

At this point the file is not imported anywhere yet, so this checkpoint only confirms the new module is syntactically valid.

## 8. Implement The HTTP Client

Create `src/client.ts`.

```ts
import { MUKAKU_BASE_URL } from "./constants.js";
import { searchResponseSchema, type SearchResponse } from "./types.js";

const APP_ID = "83768d9ad4";
const IDENTITY = "23734adac0301bccdcb107c4aa21f96c";

export interface SearchParams {
  query: string;
  page: number;
  limit: number;
}

function buildSearchUrl(params: SearchParams): URL {
  const url = new URL("/prod/api/v1/getVideoList", MUKAKU_BASE_URL);
  url.searchParams.set("sb", params.query);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("identity", IDENTITY);
  return url;
}

export async function fetchRawSearchResponse(params: SearchParams): Promise<unknown> {
  const response = await fetch(buildSearchUrl(params));

  if (!response.ok) {
    throw new Error(`Mukaku request failed: HTTP ${response.status}`);
  }

  return response.json();
}

export async function searchMukaku(params: SearchParams): Promise<SearchResponse> {
  const rawResponse = await fetchRawSearchResponse(params);
  const parsed = searchResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new Error(`Mukaku response shape changed: ${parsed.error.message}`);
  }

  if (!parsed.data.success) {
    throw new Error(parsed.data.message ?? "Mukaku search failed");
  }

  return parsed.data;
}
```

Why this file exists:

- It hides URL construction.
- It keeps API credentials/identifiers in one place.
- It can return the untouched upstream response for `--raw`.
- It validates responses at the edge of the system.
- The rest of the CLI can work with typed data.

Note: the `app_id` and `identity` values were observed from the public website. If they change, this file is the first place to update.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript should pass.

Optional direct API sanity check:

```bash
curl -sS 'https://web5.mukaku.com/prod/api/v1/getVideoList?sb=%E9%98%BF%E5%87%A1%E8%BE%BE&page=1&limit=3&app_id=83768d9ad4&identity=23734adac0301bccdcb107c4aa21f96c' | jq '.success, (.data.data | length), .data.data[0].title'
```

Expected shape:

```text
true
3
"阿凡达"
```

This confirms the upstream endpoint is reachable before our CLI calls it.

## 9. Normalize The Data

Create `src/normalize.ts`.

```ts
import { MUKAKU_BASE_URL } from "./constants.js";
import type { MukakuSearchItem, RawMukakuItem } from "./types.js";

function cleanOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePositiveNumber(value: string | undefined): number | undefined {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseYear(value: string | undefined): number | undefined {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const year = Number(text);
  return Number.isInteger(year) ? year : undefined;
}

function parseCsv(value: string | undefined): string[] {
  return cleanOptionalString(value)
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function mapType(type: number | undefined): MukakuSearchItem["type"] {
  if (type === 1) return "movie";
  if (type === 2) return "tv";
  return "unknown";
}

export function normalizeSearchItem(item: RawMukakuItem): MukakuSearchItem {
  const doubanId = item.doub_id;

  return {
    title: cleanOptionalString(item.title) ?? "未知标题",
    originalTitle: cleanOptionalString(item.otitle),
    year: parseYear(item.years),
    type: mapType(item.type),
    doubanId,
    doubanUrl: doubanId ? `https://movie.douban.com/subject/${doubanId}/` : undefined,
    doubanScore: parsePositiveNumber(item.doub_score),
    imdbId: cleanOptionalString(item.IMDB_number),
    imdbScore: parsePositiveNumber(item.IMDB_score),
    quality: cleanOptionalString(item.zqxd),
    episodeStatus: cleanOptionalString(item.ejs),
    categories: parseCsv(item.class),
    productionArea: cleanOptionalString(item.production_area),
    definitions: parseCsv(item.definition),
    seedUpdatedAt: cleanOptionalString(item.seed_updated_at),
    image: cleanOptionalString(item.image),
    detailUrl: doubanId ? `${MUKAKU_BASE_URL}/mv/${doubanId}` : undefined,
  };
}

export function normalizeSearchItems(items: RawMukakuItem[]): MukakuSearchItem[] {
  return items.map(normalizeSearchItem);
}
```

Why this file exists:

- The API says `doub_score`; our CLI says `doubanScore`.
- The API gives numeric fields as strings; our CLI gives numbers.
- Mukaku often uses `"0"` for missing scores, so `parsePositiveNumber` treats zero as absent.
- The API gives comma-separated strings; our CLI gives arrays.
- The API can return blanks; our CLI uses `undefined`.

This is one of the most important parts of a good CLI. A CLI should provide a useful interface, not just leak upstream API details.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript should pass.

Quick manual check:

Create a temporary scratch file only if you want to inspect the function before tests exist:

```bash
pnpm exec tsx -e "import { normalizeSearchItem } from './src/normalize.ts'; console.log(normalizeSearchItem({ title: '阿凡达', type: 1, doub_id: 1652587, doub_score: '8.8', years: '2009', class: '动作,科幻' }))"
```

Expected:

- `type` becomes `movie`.
- `doubanScore` becomes `8.8` as a number.
- `categories` becomes `["动作", "科幻"]`.
- `doubanUrl` becomes `https://movie.douban.com/subject/1652587/`.
- `detailUrl` becomes `https://web5.mukaku.com/mv/1652587`.

## 10. Render Human Output

Create `src/output.ts`.

```ts
import type { MukakuSearchItem } from "./types.js";

function formatScore(label: string, value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${label} ${value}`;
}

export function formatSearchResults(results: MukakuSearchItem[]): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map((result, index) => {
      const lines: string[] = [];

      const headingParts = [
        `${index + 1}. ${result.title}`,
        result.year ? `(${result.year})` : undefined,
        result.quality,
        result.episodeStatus,
      ].filter(Boolean);

      lines.push(headingParts.join(" "));

      if (result.originalTitle) {
        lines.push(`   Original: ${result.originalTitle}`);
      }

      const scores = [
        formatScore("豆瓣", result.doubanScore),
        formatScore("IMDb", result.imdbScore),
      ].filter(Boolean);

      if (scores.length > 0) {
        lines.push(`   Rating: ${scores.join(" / ")}`);
      }

      const meta = [
        result.type,
        result.productionArea,
        result.categories.length > 0 ? result.categories.join(", ") : undefined,
      ].filter(Boolean);

      if (meta.length > 0) {
        lines.push(`   Meta: ${meta.join(" | ")}`);
      }

      if (result.detailUrl) {
        lines.push(`   资源 URL: ${result.detailUrl}`);
      }

      if (result.doubanUrl) {
        lines.push(`   豆瓣 URL: ${result.doubanUrl}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function printSearchResults(results: MukakuSearchItem[]): void {
  console.log(formatSearchResults(results));
}
```

Why:

- Human output should be scannable.
- It should not dump every field.
- It should include enough detail for a person to choose a result.
- `formatSearchResults` is pure and easy to test; `printSearchResults` is the only function that writes to the terminal.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript should pass.

Quick manual check:

```bash
pnpm exec tsx -e "import { printSearchResults } from './src/output.ts'; printSearchResults([{ title: '阿凡达', originalTitle: 'Avatar', year: 2009, type: 'movie', doubanScore: 8.8, imdbScore: 7.9, quality: '4K蓝光', categories: ['动作', '科幻'], productionArea: '美国', definitions: [], detailUrl: 'https://web5.mukaku.com/mv/1652587', doubanUrl: 'https://movie.douban.com/subject/1652587/' }])"
```

Expected:

```text
1. 阿凡达 (2009) 4K蓝光
   Original: Avatar
   Rating: 豆瓣 8.8 / IMDb 7.9
   Meta: movie | 美国 | 动作, 科幻
   资源 URL: https://web5.mukaku.com/mv/1652587
   豆瓣 URL: https://movie.douban.com/subject/1652587/
```

## 11. Implement The Search Command

Create `src/commands/search.ts`.

```ts
import { Command } from "commander";
import { fetchRawSearchResponse, searchMukaku } from "../client.js";
import { normalizeSearchItems } from "../normalize.js";
import { printSearchResults } from "../output.js";

interface SearchOptions {
  limit: string;
  page: string;
  json?: boolean;
  raw?: boolean;
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search")
    .description("Search movies and TV shows")
    .argument("<query>", "search keyword, for example 阿凡达")
    .option("-l, --limit <number>", "maximum number of results to print", "10")
    .option("-p, --page <number>", "result page to request", "1")
    .option("--json", "print normalized JSON")
    .option("--raw", "print raw Mukaku API response")
    .action(async (query: string, options: SearchOptions) => {
      try {
        const limit = Number(options.limit);
        const page = Number(options.page);

        if (!Number.isInteger(limit) || limit <= 0) {
          throw new Error("--limit must be a positive integer");
        }

        if (!Number.isInteger(page) || page <= 0) {
          throw new Error("--page must be a positive integer");
        }

        if (options.raw) {
          const rawResponse = await fetchRawSearchResponse({ query, page, limit });
          console.log(JSON.stringify(rawResponse, null, 2));
          return;
        }

        const response = await searchMukaku({ query, page, limit });
        const results = normalizeSearchItems(response.data.data).slice(0, limit);

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        printSearchResults(results);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
```

Because this file is inside `src/commands/`, its imports go up one directory with `../client.js`, `../normalize.js`, and `../output.js`.

Why this file exists:

- `commands/search.ts` owns the user-facing `search` behavior.
- It parses command options like `--limit`, `--json`, and `--raw`.
- It coordinates the lower-level modules: client, normalization, and output.
- Later, `commands/detail.ts` can sit beside it without making `index.ts` huge.

Checkpoint:

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript should pass.

If TypeScript complains about imports, check that `search.ts` uses:

```ts
import { searchMukaku } from "../client.js";
import { normalizeSearchItems } from "../normalize.js";
import { printSearchResults } from "../output.js";
```

The `.js` extension is correct in TypeScript when using `moduleResolution: "NodeNext"` because the emitted JavaScript will import `.js` files.

## 12. Implement The CLI Entrypoint

Create `src/index.ts`.

```ts
#!/usr/bin/env node

import { Command } from "commander";
import { registerSearchCommand } from "./commands/search.js";

const program = new Command();

program
  .name("mukaku")
  .description("Search Mukaku movie and TV resources")
  .version("0.1.0");

registerSearchCommand(program);

program.parseAsync();
```

Concepts here:

- `index.ts` is the executable entrypoint.
- It creates the root `program`.
- It registers commands.
- It does not contain the full implementation of every command.

That last point is the reason for the `commands/` folder. `index.ts` should stay boring as the CLI grows.

If you later add:

```text
src/commands/detail.ts
src/commands/resources.ts
```

then `index.ts` becomes:

```ts
registerSearchCommand(program);
registerDetailCommand(program);
registerResourcesCommand(program);
```

The root file remains easy to read.

Concepts in `commands/search.ts`:

- `.command("search")` defines a subcommand.
- `.argument("<query>")` defines required positional input.
- `.option("--json")` defines a flag.
- `.action(...)` is the function that runs when the command is invoked.

Checkpoint:

Run:

```bash
pnpm dev --help
```

Expected:

- You should see help text with the CLI name `mukaku`.
- The `search` command should appear in the command list.

Then run:

```bash
pnpm dev search --help
```

Expected:

- You should see `--limit`, `--page`, `--json`, and `--raw`.

## 13. Try It In Development

Run:

```bash
pnpm dev search "阿凡达"
```

Expected shape:

```text
1. 阿凡达 (2009) 4K蓝光
   Original: Avatar
   Rating: Douban 8.8 / IMDb 7.9
   Meta: movie | 美国 | 动作, 科幻, 冒险
   URL: https://web5.mukaku.com/mv/1652587
```

Try JSON:

```bash
pnpm dev search "阿凡达" --json
```

Try raw:

```bash
pnpm dev search "阿凡达" --raw
```

What these modes are for:

- default output is for humans.
- `--json` is for LLMs, scripts, and structured consumers.
- `--raw` is for debugging upstream API behavior.

Checkpoint:

Run:

```bash
pnpm dev search "阿凡达" --limit 3
```

Expected:

- You should see three human-readable results.
- The first result should usually be `阿凡达 (2009)`.

Run:

```bash
pnpm dev search "阿凡达" --limit 1 --json
```

Expected:

- Output should be valid JSON.
- It should contain `"title": "阿凡达"`.
- It should contain normalized fields like `originalTitle`, `doubanScore`, and `detailUrl`, and `doubanUrl`.

Run:

```bash
pnpm dev search "阿凡达" --limit 1 --raw
```

Expected:

- Output should include raw API fields like `doub_score`, `IMDB_score`, and `zqxd`.

Run:

```bash
pnpm dev search "阿凡达" --limit nope
```

Expected:

- The command should print `Error: --limit must be a positive integer`.
- The command should exit as a failure.

## 14. Build The CLI

```bash
pnpm build
```

Then run the built file:

```bash
node dist/index.js search "阿凡达"
```

To test the package command locally:

```bash
pnpm link --global
mukaku search "阿凡达"
```

If you do not want to link globally, you can also use:

```bash
node dist/index.js search "阿凡达"
```

The important idea: `package.json` `bin` maps the command name `mukaku` to the built executable file.

Checkpoint:

Run:

```bash
pnpm build
head -n 1 dist/index.js
node dist/index.js search "阿凡达" --limit 1
```

Expected:

- The first line of `dist/index.js` should be `#!/usr/bin/env node`.
- The built CLI should print one result.

Then run:

```bash
pnpm link --global
mukaku search "阿凡达" --limit 1
```

Expected:

- The command name `mukaku` should work from your shell.

## 15. Add A Normalization Test

Create `test/normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeSearchItem } from "../src/normalize.js";

describe("normalizeSearchItem", () => {
  it("turns a raw Mukaku item into a stable search result", () => {
    const result = normalizeSearchItem({
      type: 1,
      title: "阿凡达",
      otitle: "Avatar",
      doub_id: 1652587,
      doub_score: "8.8",
      IMDB_number: "tt0499549",
      IMDB_score: "7.9",
      years: "2009",
      class: "动作,科幻,冒险",
      production_area: "美国",
      definition: "1080P蓝光,WEB-4K,4K蓝光",
      zqxd: "4K蓝光",
      ejs: "",
      seed_updated_at: "2026-03-26 19:12:22",
    });

    expect(result).toEqual({
      title: "阿凡达",
      originalTitle: "Avatar",
      year: 2009,
      type: "movie",
      doubanId: 1652587,
      doubanUrl: "https://movie.douban.com/subject/1652587/",
      doubanScore: 8.8,
      imdbId: "tt0499549",
      imdbScore: 7.9,
      quality: "4K蓝光",
      episodeStatus: undefined,
      categories: ["动作", "科幻", "冒险"],
      productionArea: "美国",
      definitions: ["1080P蓝光", "WEB-4K", "4K蓝光"],
      seedUpdatedAt: "2026-03-26 19:12:22",
      image: undefined,
      detailUrl: "https://web5.mukaku.com/mv/1652587",
    });
  });
});
```

Run:

```bash
pnpm test
```

Why test normalization first:

- It is deterministic.
- It is where most subtle bugs happen.
- It protects the stable CLI contract from upstream naming quirks.

Checkpoint:

Run:

```bash
pnpm test
```

Expected:

- The normalization test should pass.

Then intentionally break the implementation for learning: in `normalize.ts`, temporarily change `type: mapType(item.type)` to `type: "unknown"`, then run `pnpm test`.

Expected:

- The test should fail because it expected `"movie"`.

Change the code back after seeing the failure. This proves the test is protecting real behavior.

## 16. Common CLI Design Rules To Notice

### Commands express user intent

```bash
mukaku search "阿凡达"
```

This is better than:

```bash
mukaku --search "阿凡达"
```

because `search` is an action. Later, `detail` and `resources` can become sibling actions.

### Options modify behavior

```bash
--json
--raw
--limit 5
--page 1
```

Options should not usually be the main action. They adjust how the action runs.

### Human output and machine output are different products

Human output should be readable. JSON output should be predictable. Do not compromise one to serve the other.

### Exit codes matter

When the command fails, set:

```ts
process.exitCode = 1;
```

This tells scripts and agents that the command failed.

### The CLI owns its contract

Mukaku can call a field `doub_score`; our CLI can call it `doubanScore`.

That translation is not decorative. It is what makes the CLI useful.

## 17. What The MVP Should Not Do Yet

For the first version, avoid:

- auth
- caching
- config files
- plugins
- resource downloading
- browser automation
- too many commands
- too many folders

The MVP should prove this loop:

```text
parse command -> call Mukaku API -> validate -> normalize -> print
```

Once that loop feels solid, add:

```bash
mukaku detail 1652587 --json
mukaku resources 1652587 --quality "4K蓝光" --json
```

## 18. Final Mental Model

A CLI is just a program with a text interface.

For this MVP:

```text
index.ts
  creates the root CLI and registers commands

commands/search.ts
  understands the user's search command

constants.ts
  stores shared Mukaku constants

client.ts
  understands Mukaku's HTTP API

types.ts
  describes both raw and clean data

normalize.ts
  turns raw Mukaku data into our stable data

output.ts
  decides how to show the data
```

That is the whole architecture. Small, but real.
