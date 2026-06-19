# Arrange Feature

## Purpose

Implements arrangement timeline UI and editing interactions.

## Responsibilities

- Render arrange lanes and timeline content.
- Support region selection and manipulation.
- Coordinate with transport and timeline state.

## Representative Components and Hooks

- `ArrangeEditor`: feature entry component that mounts scope providers, toolbar, canvas view, and edit dialogs.
- `ArrangeView`: main visual timeline surface.
- `ArrangeToolbar`, `ArrangeContextMenu`, `ArrangeTrackContextMenu`: editing controls and contextual operations.
- `useArrangeView`: central Jotai state API for selected track, selection, and dialog states.
- Gesture hooks (`useSelectionGesture`, `useMoveSelectionGesture`, `useCreateSelectionGesture`, `useRulerSelectionGesture`, `useDragScrollGesture`) implement pointer-driven editing.

## Architecture Notes

- The feature composes scoped state providers in a fixed order: tick scroll -> track scroll -> quantizer -> beats.
- Shared editor infrastructure is reused through app-level hooks (`useTickScroll`, `useQuantizer`, `useBeats`) and wrapped by feature-specific scope helpers.
- Selection/dialog state is serializable (`serializeState` / `restoreState`) to support history and state restoration flows.

## Libraries and External Factors

- Uses Jotai (`atom`, `useAtomValue`, `useSetAtom`) and lodash cloning for state snapshots.
- Depends on `@signal-app/core` entities such as `ArrangeSelection`.
- Keyboard behavior is split into local and global shortcut hooks for predictable focus handling.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
