---
name: codemode-cocos
description: Safe Cocos Creator editor changes through CodeMode MCP: inspect, mutate minimally, reload, read console.
---

Use this when changing Cocos Creator scenes, prefabs, assets, or Cocos `.ts` scripts.

Core rules:
- Inspect before mutate: tools, tree, inspector/schema, exact property paths/types.
- Never hardcode editor server port. Use active CocosEditor provider metadata/config.
- Use CodeMode MCP for editor-owned data: `.scene`, `.prefab`, `.mat`, `.material`, `.asset`, `.anim`, `.controller`, `.spriteatlas`, `.meta`.
- Direct content edits are OK for source/config/docs: `.ts`, `.js`, `.json`, docs, scripts.
- Do not edit generated/imported dirs: `Library/`, `Temp/`, `Logs/`, `Build/`, `build/`, `obj/`; reading logs is OK.
- For Cocos TS code style/project structure, use `cocos-code-style`.

Editor mutation:
- Batch related editor changes in one MCP execution when safe.
- Execution code must be synchronous: no `async`, `await`, `.then`, `Promise`, or parallel calls.
- Do not keep editor object references between tool calls; inspect again or chain inside one execution.
- Keep mutations minimal: change only requested nodes/properties/assets, preserve serialized refs, set data through object-reference properties.
- Do not rename, reparent, reorder, or create scene objects unless required.
- For transforms, inspect first and be explicit about local vs world (`position` vs `worldPosition`).

Deletion/moves:
- Never delete scene/prefab objects directly. Move obsolete objects under `legacy`/`deleted`; use existing `lagcy` only if project already has that typo.
- Ask before deleting source/config/assets files; when deletion is requested, prefer moving to `legacy/` or `deleted/`.
- Move Cocos-owned assets through MCP/editor, not raw filesystem; `.ts` under Cocos `assets/` counts as Cocos-owned for moves.
- `.meta` may move with its asset but must not be deleted manually.

Images:
- Never read, generate, write, edit, move, rename, or inspect image assets/screenshots/previews (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.psd`, `.svg`, atlases).
- You may assign existing image/sprite assets by known path/reference through MCP; do not inspect the image itself.

Validation:
- Before work/reload, clear Cocos console if a tool exists.
- After a pack of changes: update/reload editor if needed, read Cocos console logs, verify focused properties/tree/state, then fix errors or report clean.
- Summarize large tool output; do not dump full scene trees.

Workflow:
1. Discover tools with `list_tools`, `search_tools`, `tools_info`.
2. Inspect exact nodes/assets/components/properties.
3. Plan minimal changes.
4. Apply via CodeMode MCP.
5. Reload/update, read console, verify focused state.

On failure: stop, fetch logs/context, report blocker.
