# Tempo Editor Feature

## Purpose

Provides tempo graph editing in the app.

## Responsibilities

- Render tempo points and tempo curves.
- Support tempo insert/delete/move interactions.
- Keep tempo edits synchronized with timeline context.

## Representative Components and Hooks

- `TempoEditor`: feature entry composing toolbar + graph.
- `TempoGraph`, `TempoGraphCanvas`, `TempoItems`, `TempoGraphSelection`: graph rendering/editing surfaces.
- `TempoGraphToolbar` and `TempoGraphToolSelector`: tool and mode controls.
- `useTempoEditor`: central feature state API for mouse mode and selection.
- Gesture hooks (`usePencilGesture`, `useCreateSelectionGesture`, `useDragSelectionGesture`) implement point editing interactions.

## Architecture Notes

- Scope composition mirrors timeline features: tick scroll -> quantizer -> beats.
- Uses feature entities (`TempoSelection`, `TempoCoordTransform`) and helper transforms for graph coordinate/event conversion.
- Keyboard shortcut handling is split into local and global hooks for predictable editor focus behavior.

## Libraries and External Factors

- Uses Jotai for feature-local state and shared app timeline hooks for synchronized scrolling.
- Rendering and interaction responsiveness depend on canvas size and event density.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
