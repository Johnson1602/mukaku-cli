# Project Notes

- Prefer `interface` for object shapes. Use `type` for unions, aliases, mapped types, and inferred schema types.
- When an interface field references another local interface, prefer defining the parent interface first and the referenced child interfaces directly below it.
- For functions, define local helpers before the parent or public workflow functions that call them.
- Only export functions, types, and constants that are consumed outside the module or are intentional public contracts.
- Use explicit return types for exported functions, async client/API functions, and contract-facing mappers or formatters. Let TypeScript infer small local helper return types unless the annotation intentionally ties the helper to a domain type.
- Keep command implementations in `src/commands/`.
- Keep Mukaku endpoint clients in `src/api/`, with one endpoint or closely related endpoint family per file.
- Keep shared normalization, output, and type modules flat under `src/` unless they grow enough to need their own folder.
