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
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

Why:

- `strict: true` helps catch mistakes early.
- `NodeNext` matches Node ESM behavior.
- `rootDir: "."` tells TypeScript that both `src` and `test` belong to this project. Newer TypeScript versions ask for this explicitly when `outDir` is set.
- `include` keeps TypeScript focused on source and tests.

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

## 7. Implement The HTTP Client

Create `src/client.ts`.

```ts
import { searchResponseSchema, type SearchResponse } from "./types.js";

const BASE_URL = "https://web5.mukaku.com";
const APP_ID = "83768d9ad4";
const IDENTITY = "23734adac0301bccdcb107c4aa21f96c";

export interface SearchParams {
  query: string;
  page: number;
  limit: number;
}

export async function searchMukaku(params: SearchParams): Promise<SearchResponse> {
  const url = new URL("/prod/api/v1/getVideoList", BASE_URL);
  url.searchParams.set("sb", params.query);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("identity", IDENTITY);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mukaku request failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  const parsed = searchResponseSchema.safeParse(json);

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
- It validates responses at the edge of the system.
- The rest of the CLI can work with typed data.

Note: the `app_id` and `identity` values were observed from the public website. If they change, this file is the first place to update.

## 8. Normalize The Data

Create `src/normalize.ts`.

```ts
import type { MukakuSearchItem, RawMukakuItem } from "./types.js";

const BASE_URL = "https://web5.mukaku.com";

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  const text = blankToUndefined(value);
  if (!text) return undefined;

  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseYear(value: string | undefined): number | undefined {
  const text = blankToUndefined(value);
  if (!text) return undefined;

  const year = Number(text);
  return Number.isInteger(year) ? year : undefined;
}

function parseCsv(value: string | undefined): string[] {
  return blankToUndefined(value)
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function mapType(type: number | undefined): MukakuSearchItem["type"] {
  if (type === 1) return "movie";
  if (type === 2) return "tv";
  return "unknown";
}

export function normalizeSearchResult(item: RawMukakuItem): MukakuSearchItem {
  const doubanId = item.doub_id;

  return {
    title: blankToUndefined(item.title) ?? "未知标题",
    originalTitle: blankToUndefined(item.otitle),
    year: parseYear(item.years),
    type: mapType(item.type),
    doubanId,
    doubanScore: parseNumber(item.doub_score),
    imdbId: blankToUndefined(item.IMDB_number),
    imdbScore: parseNumber(item.IMDB_score),
    quality: blankToUndefined(item.zqxd),
    episodeStatus: blankToUndefined(item.ejs),
    categories: parseCsv(item.class),
    productionArea: blankToUndefined(item.production_area),
    definitions: parseCsv(item.definition),
    seedUpdatedAt: blankToUndefined(item.seed_updated_at),
    image: blankToUndefined(item.image),
    detailUrl: doubanId ? `${BASE_URL}/mv/${doubanId}` : undefined,
  };
}

export function normalizeSearchResults(items: RawMukakuItem[]): MukakuSearchItem[] {
  return items.map(normalizeSearchResult);
}
```

Why this file exists:

- The API says `doub_score`; our CLI says `doubanScore`.
- The API gives numeric fields as strings; our CLI gives numbers.
- The API gives comma-separated strings; our CLI gives arrays.
- The API can return blanks; our CLI uses `undefined`.

This is one of the most important parts of a good CLI. A CLI should provide a useful interface, not just leak upstream API details.

## 9. Render Human Output

Create `src/output.ts`.

```ts
import type { MukakuSearchItem } from "./types.js";

function formatScore(label: string, value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${label} ${value}`;
}

export function printSearchResults(results: MukakuSearchItem[]): void {
  if (results.length === 0) {
    console.log("No results found.");
    return;
  }

  for (const [index, result] of results.entries()) {
    const headingParts = [
      `${index + 1}. ${result.title}`,
      result.year ? `(${result.year})` : undefined,
      result.quality,
      result.episodeStatus,
    ].filter(Boolean);

    console.log(headingParts.join(" "));

    if (result.originalTitle) {
      console.log(`   Original: ${result.originalTitle}`);
    }

    const scores = [
      formatScore("Douban", result.doubanScore),
      formatScore("IMDb", result.imdbScore),
    ].filter(Boolean);

    if (scores.length > 0) {
      console.log(`   Rating: ${scores.join(" / ")}`);
    }

    const meta = [
      result.type,
      result.productionArea,
      result.categories.length > 0 ? result.categories.join(", ") : undefined,
    ].filter(Boolean);

    if (meta.length > 0) {
      console.log(`   Meta: ${meta.join(" | ")}`);
    }

    if (result.detailUrl) {
      console.log(`   URL: ${result.detailUrl}`);
    }

    console.log();
  }
}
```

Why:

- Human output should be scannable.
- It should not dump every field.
- It should include enough detail for a person to choose a result.

## 10. Implement The Search Command

Create `src/commands/search.ts`.

```ts
import { Command } from "commander";
import { searchMukaku } from "../client.js";
import { normalizeSearchResults } from "../normalize.js";
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

        const response = await searchMukaku({ query, page, limit });

        if (options.raw) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const results = normalizeSearchResults(response.data.data).slice(0, limit);

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

## 11. Implement The CLI Entrypoint

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

## 12. Try It In Development

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

## 13. Build The CLI

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
pnpm exec mukaku search "阿凡达"
```

The important idea: `package.json` `bin` maps the command name `mukaku` to the built executable file.

## 14. Add A Normalization Test

Create `test/normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeSearchResult } from "../src/normalize.js";

describe("normalizeSearchResult", () => {
  it("turns a raw Mukaku item into a stable search result", () => {
    const result = normalizeSearchResult({
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

## 15. Common CLI Design Rules To Notice

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

## 16. What The MVP Should Not Do Yet

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

## 17. Final Mental Model

A CLI is just a program with a text interface.

For this MVP:

```text
index.ts
  creates the root CLI and registers commands

commands/search.ts
  understands the user's search command

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
