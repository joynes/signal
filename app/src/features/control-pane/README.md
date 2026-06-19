# Control Pane Feature

## Purpose

Provides parameter and automation editing interfaces.

## Responsibilities

- Render control lanes and automation data.
- Support parameter point editing interactions.
- Coordinate with selected track and event context.

## Representative Components and Hooks

- `ControlPane`: root container selecting velocity mode or value-event graph mode.
- `PianoVelocityControl` and `ValueEventGraph`: two primary rendering/editing surfaces.
- `LineGraphCanvas`, `VelocityControlCanvas`, `ControlSelectionContextMenu`: detailed editing UIs.
- `useControlPane`: central state API for `controlMode`, selection, selected event IDs, and pencil/curve modes.
- Gesture hooks (`usePencilGesture`, `useCurveGesture`, `useVelocityPaintGesture`, `useCreateSelectionGesture`, `useDragSelectionGesture`) implement editing behavior.

## Architecture Notes

- Uses `atomWithStorage` + `focusAtom` to persist mode configuration (`ControlStore`) across sessions.
- Feature state exposes serialize/restore methods for history snapshots.
- Integrates with piano-roll active pane selection and keyboard shortcut layers (feature-local + global).

## Libraries and External Factors

- Uses Jotai + `jotai-optics` for nested persisted state.
- Graph/canvas stack includes WebGL/canvas rendering components and custom shaders for performance.
- Depends on current track/event context from adjacent features, so behavior is selection-dependent.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
