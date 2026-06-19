# Piano Roll Feature

## Purpose

Implements the main MIDI note editing surface.

## Responsibilities

- Render note grid, notes, and overlays.
- Support note create/select/move/resize workflows.
- Coordinate quantization and playback preview.

## Representative Components and Hooks

- `PianoRollEditor`: feature entry that composes toolbar, split panes, keyboard shortcuts, dialogs, and scope providers.
- `PianoRoll`, `PianoRollCanvas`, `PianoKeys`, `PianoRuler`: core editing and navigation surfaces.
- Canvas node components: `Notes`, `GhostNotes`, `NoteSelection`, `Lines`, and shader-backed note rendering.
- `usePianoRoll`: central feature state API (selected track, selected note IDs, mouse mode, dialogs, ghost tracks, pane focus).
- Gesture hooks (`useCreateNoteGesture`, `useMoveSelectionGesture`, `useDragNoteEdgeGesture`, `useSelectionGesture`, etc.) define editing interactions.

## Architecture Notes

- Scope composition order is fixed: tick scroll -> event view -> quantizer -> beats.
- Feature uses serializable Jotai state (`serializeState` / `restoreState`) and reset effects tied to track/tool changes.
- Heavy drawing path uses WebGL (`GLCanvas` + transforms) for smooth scrolling, cursor sync, and large note counts.
- Integrates tightly with adjacent panes (track list, event list, control pane) but keeps feature-local editing state encapsulated.

## Libraries and External Factors

- Uses Jotai + `jotai-effect` and extensive React hook composition.
- Rendering depends on `@ryohey/webgl-react` and GPU/driver/browser WebGL behavior.
- Keyboard and pointer gesture behavior is focus-sensitive and can vary with host platform input behavior.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
