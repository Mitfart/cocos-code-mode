---
name: cocos-code-style
description: Cocos Creator TypeScript project structure, component style, naming, lifecycle, serialized refs, UI/gameplay/infrastructure rules.
---

Use these rules when writing or changing Cocos Creator TypeScript code.

Project structure:
- `Infrastructure/`: composition root and shared services: game controller, builder, audio, events, score wiring.
- `UI/`: screens, buttons, labels, transactions; no gameplay rules except calling public gameplay methods.
- Feature folders are allowed/preferred for gameplay (`Chicken/`, `Environment/`, `Events/`, etc.); use `Gameplay/` only when no clearer feature name exists.
- Prefer serialized references between layers. Avoid global lookups unless using existing engine helpers.
- `Infrastructure` coordinates; `UI` displays/input only; feature components own gameplay state/behavior.
- UI must call public gameplay/controller methods, not mutate level/player internals directly.

Cocos code style:
- Use normal Cocos TS components: `_decorator`, `@ccclass`, `@property`, `extends Component`.
- Prefer serialized `@property(...)` references over runtime node searches.
- Never use `find()`/scene-wide string-path lookup. Use serialized references; `getComponent` is OK on a known local node/reference.
- Required serialized refs must be assigned in editor; on missing refs use `console.error('[ComponentName] Missing fieldName')` and return/disable safely. Do not silently create fallback nodes.
- Do not wrap gameplay code in broad try/catch or swallow errors; use validation and clear console errors. Try/catch belongs at editor/tool automation boundaries.
- Keep components small; expose minimal public methods, keep internal state private.
- No one-implementation interfaces/factories/config. One component/helper until duplication proves need.
- Use typed properties/methods; avoid speculative interfaces/classes.
- Serialized Node/Component refs default to `null`; arrays default to `[]`; primitives get explicit defaults.
- Keep inspector-visible `@property` fields grouped at top; use simple `@property(Type)` unless object form is needed for `type`, `visible`, `tooltip`, etc.
- Wire UI through Cocos events/buttons; keep callbacks simple.
- Bind listeners in `onEnable` and unbind in `onDisable` when components toggle; if binding once in `onLoad`, avoid duplicate binds.
- For node events, export event-name constants, emit/listen on the owning node, and unsubscribe in `onDisable`/`onDestroy` when needed.
- Use Cocos lifecycle methods (`onLoad`, `start`, `onEnable`, `onDisable`) only when needed; make lifecycle methods `protected` unless intentionally public.
- Stop tweens/schedules/listeners in `onDisable`/`onDestroy` when component can be disabled/destroyed; avoid orphan callbacks after scene changes.
- Class name should match filename; use one `@ccclass` component per file.
- Export constants/enums only when shared; avoid side effects at module top.
- Use `UI_` prefix for UI components, `Game*` for infrastructure/controller/event/audio, and direct domain names for gameplay components.
