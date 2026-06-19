# Agent instructions

Default style: use caveman mode. Be brief, direct, technical.

## Project

Cocos Creator 3.8.7 editor extension that starts a UTCP HTTP server inside the editor and exposes CocosEditor tools for Code Mode MCP.

## Commands

- Install: `npm i`
- Build: `npm run build`
- Package extension zip: `npm run package`

## Safe edit rules

- Source/config/docs are safe to edit directly: `.ts`, `.js`, `.json`, docs, scripts.
- Do not edit Cocos editor-owned project data directly: `.scene`, `.prefab`, `.mat`, `.material`, `.asset`, `.anim`, `.controller`, `.spriteatlas`, `.meta`. Use CodeMode MCP / CocosEditor tools.
- Never hardcode the editor server port. Read the active CocosEditor provider from `~/.utcp_config.json` or CodeMode MCP metadata.
- Discover before mutate: inspect tree/properties/definitions, then set exact property paths.

## Agent skills

- Use `codemode-cocos` for scene, prefab, hierarchy, inspector, preview, asset, or editor-owned data work.
- Use `diagnose` for failing builds, runtime bugs, or editor integration failures.
- Use `tdd` only when adding non-trivial logic; keep checks small.
- Use `ponytail`: shortest working diff, no speculative abstractions.

More: `CONTEXT.md`, `docs/agents/*.md`.
