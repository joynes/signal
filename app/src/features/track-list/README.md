# Track List Feature

## Purpose

Implements track list UI and track-level controls.

## Responsibilities

- Render track metadata and controls.
- Support track management interactions.
- Coordinate per-track states such as mute and solo.

## Representative Components and Hooks

- `TrackList`: main list container.
- `TrackListItem`, `TrackName`, `InstrumentName`: row-level track UI.
- `TrackDialog`, `TrackListContextMenu`, `TrackListMenuButton`: editing and command surfaces.
- `useTrackList`: feature API exposing visibility, track IDs, reorder, and add-track actions.
- `useMIDIActivity`: realtime MIDI activity indicator integration.

## Architecture Notes

- Track list operates on non-conductor tracks and delegates mutations to command services (`commands.song.moveTrack`, `addNewTrack`).
- Integrates with history snapshots before mutating commands (e.g., add track).
- Feature open state is local atom while data source is shared song store.

## Libraries and External Factors

- Uses Jotai for panel visibility state.
- Runtime behavior depends on command/history wiring from shared app hooks.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
