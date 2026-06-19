# Cloud File Feature

## Purpose

Handles cloud file workflows such as loading and saving songs.

## Responsibilities

- Open and save files via cloud integrations.
- Surface operation status and error states.
- Coordinate with auth and API layers.

## Representative Components and Hooks

- `useCloudFile`: orchestration hook for open/save/save-as/rename/import/export/publish/delete flows.
- `CloudFileDialog`, `CloudFileList`, `CloudFileRow`: modal file browser UI.
- `useCreateSong` / `useUpdateSong` integrations for repository persistence.

## Architecture Notes

- Uses `dialog-hooks` (`useDialog`, `usePrompt`, `useProgress`, `useToast`) to implement transactional UX with explicit confirmation and progress steps.
- Maintains sorting and filtering UI state with Jotai derived atoms (`selectedColumn`, `dateType`, `sortAscending`, `sortedFiles`).
- Coordinates with app-level actions (`useOpenSong`, `useSaveSong`, `useOpenFile`) and root view state (`openCloudFileDialog`, publish dialog toggles).

## Libraries and External Factors

- Depends on `@signal-app/api` cloud repositories and Firebase auth state indirectly via service layer.
- Behavior differs by environment for file export/import (`File System Access API` availability).
- Network latency and cloud permissions affect operation timing and error cases.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
