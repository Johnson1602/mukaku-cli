# mukaku-cli

A small TypeScript CLI for searching Mukaku movie and TV resources, inspecting title-level torrent resources, and getting simple resource recommendations.

The CLI is intentionally stateless: it calls Mukaku live, normalizes the response, and prints either compact terminal output or JSON for agents and scripts.

## Requirements

- Node.js 22 or newer
- pnpm 11

## Setup

```sh
pnpm install
pnpm build
```

Run from source during development:

```sh
pnpm dev search "Avatar"
```

Run the built CLI:

```sh
node dist/index.mjs search "Avatar"
```

If the package is linked or installed, use the `mukaku` binary:

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

```sh
pnpm typecheck
pnpm test
pnpm build
```
