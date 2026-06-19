# SoundFont Feature

## Purpose

Handles SoundFont asset selection and management workflows.

## Responsibilities

- Select and manage SoundFont resources.
- Display loading and availability status.
- Coordinate instrument source updates.

## Representative Components and Hooks

- `SoundFontSettingView`: main settings screen for selecting/managing SoundFonts.
- `SoundFontList`: displays available local/remote/file-based fonts.
- `SoundFontScanPathList`: Electron-oriented path scanning UI.
- `useSoundFont`: orchestration hook for initialize/load/add/remove/scan operations.

## Architecture Notes

- Uses `soundFontRepository` (`@signal-app/core`) for persistence and metadata, while actual synth loading uses `SoundFont` from `@signal-app/player`.
- Supports three input types: `local` (binary data), `remote` (URL fetch), and `file` (Electron file path).
- Persists selected soundfont ID and scan paths via storage-backed atoms.

## Libraries and External Factors

- Runtime differs between web and Electron:
  - Web: remote/local loading only.
  - Electron: file scanning via `window.electronAPI.searchSoundFonts` and file reads via `window.electronAPI.readFile`.
- Loading success depends on SoundFont format validity and available memory.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
