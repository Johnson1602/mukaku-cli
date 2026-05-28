# Project Notes

- Prefer `interface` for object shapes. Use `type` for unions, aliases, mapped types, and inferred schema types.
- Use explicit return types for exported functions, async client/API functions, and contract-facing mappers or formatters. Let TypeScript infer small local helper return types unless the annotation intentionally ties the helper to a domain type.
- Keep command implementations in `src/commands/`; keep shared client, normalization, output, and type modules flat under `src/`.
