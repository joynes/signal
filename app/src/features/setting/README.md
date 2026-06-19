# Setting Feature

## Purpose

Provides application settings and preference management UI.

## Responsibilities

- Render configurable user settings.
- Persist and restore preferences.
- Coordinate settings with runtime services.

## Representative Components and Hooks

- `SettingDialog`: settings modal container.
- `SettingNavigation`: section navigation within settings UI.
- `GeneralSettingsView`: main form surface for common settings.
- `useSettings`: typed accessors and setters for language, note-label visibility, and theme type.

## Architecture Notes

- Uses `atomWithStorage` stores (`SettingStore`, `ThemeStore`) for persistent preferences.
- Uses `focusAtom` to expose field-level atoms without leaking full storage object concerns to components.
- Keeps settings as thin UI state while side effects are handled by consuming app layers.

## Libraries and External Factors

- Persistence relies on browser storage backend used by Jotai storage atoms.
- Localization behavior depends on available language resources.
- Theme behavior depends on app-wide theme provider/token implementation.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
