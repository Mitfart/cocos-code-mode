# Domain map

Start with `CONTEXT.md`.

Important invariants:
- Cocos Creator version target: 3.8.7+.
- Extension package metadata is in `package.json`.
- Generated zip is `cocos-code-mode.zip`.
- MCP integration should use `@utcp/code-mode-mcp` and `UTCP_CONFIG_FILE`.
- Tool handlers should return compact structured data; avoid dumping full editor state to agents.
