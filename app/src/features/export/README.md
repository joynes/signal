# Export Feature

## Purpose

Handles export workflows for song data and rendered outputs.

## Responsibilities

- Configure export options.
- Run export actions and show progress.
- Surface completion and failure states.

## Representative Components and Hooks

- `useExport`: public feature hook exposing export state, progress, and cancellation.
- `useExportSong` (inside `useExport.tsx`): orchestrates render + encode pipeline.
- `ExportProgressDialog`: progress UI during long-running export.
- `encodeWAV` / `encodeMp3`: final encoding helpers.

## Architecture Notes

- Pipeline: collect song events -> `renderAudio` (`@signal-app/player`) -> encode to WAV/MP3 -> `downloadBlob`.
- Uses cancellation atom and frame-progress callback to support cooperative abort during offline rendering.
- Uses dialog UX for short-song guardrails and progress feedback.

## Libraries and External Factors

- Depends on Web Audio offline rendering and selected loaded SoundFont.
- Export speed and reliability depend on CPU performance and browser audio capabilities.
- MP3/WAV output behavior depends on encoder implementation and browser memory availability.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
