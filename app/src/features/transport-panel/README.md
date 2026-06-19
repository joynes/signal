# Transport Panel Feature

## Purpose

Provides playback transport controls and status UI.

## Responsibilities

- Handle play/stop/seek actions.
- Display transport timing and status.
- Coordinate transport commands with core playback.

## Representative Components and Hooks

- `TransportPanel`: top-level transport UI.
- `PlayButton`, `CircleButton`, `TempoForm`: primary interaction controls.
- `useTransportPanel`: orchestration hook for play/stop/rewind/forward/record/metronome/loop and status flags.
- `useTempoForm`: tempo input handling and validation.

## Architecture Notes

- Combines command actions (`useStop`, `useRewindOneBar`, `useFastForwardOneBar`, `useToggleRecording`) with reactive playback state from `usePlayer`.
- Uses `useSyncExternalStore` for metronome/recording status from stores.
- Computes MBT display using `Measure.getMBTString(measures, position, timebase)` for musical-time feedback.

## Libraries and External Factors

- Depends on MIDI input availability (`useCanRecord`) for recording enablement.
- Playback and transport status are sensitive to runtime audio/MIDI device state.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
