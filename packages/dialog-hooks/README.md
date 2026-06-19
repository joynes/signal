# dialog-hooks

## Purpose

Provides async/await-style dialog primitives for React by wrapping modal UI in provider-driven promise APIs.

## Responsibilities

- Provide hook families for action dialogs, prompts, toasts, and progress overlays.
- Decouple state/control flow from concrete dialog component implementations.
- Normalize message lifecycle (enqueue, resolve, cleanup).

## Representative APIs

- `DialogProvider` + `useDialog().show(options)`
- `PromptProvider` + `usePrompt().show(options)`
- `ToastProvider` + `useToast().info/success/warning/error(message)`
- `ProgressProvider` + `useProgress().show(message)` returning a close handler

## Architecture Notes

- Providers store pending view model objects in local state and render an injected `component` prop.
- Hooks return promises to enable linear control flow at call sites (instead of prop drilling modal open/close state).
- Context contracts are intentionally small (`setDialog`, `setPrompt`, `addMessage`) so UI packages can reuse them.

## Libraries and External Factors

- Peer dependencies: React and ReactDOM only.
- This package is presentation-agnostic; concrete visuals are supplied by consumers (for example, `@signal-app/ui` `ActionDialog` / `PromptDialog`).
