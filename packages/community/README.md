# @signal-app/community

## Purpose

Contains the community web application layer (song sharing, profile pages, playback preview, and auth-facing UI).

## Responsibilities

- Compose page flows (`HomePage`, `SongPage`, `UserPage`, `EditProfilePage`) and app bootstrap entrypoint `app()`.
- Orchestrate repositories and player integration in `RootStore`.
- Provide store-driven community state (`AuthStore`, `SongStore`, `CommunitySongStore`, `RootViewStore`).
- Support social/public song workflows (publish/list/play/navigation).

## Representative Classes and APIs

- `RootStore`: wires API repositories, `Player`, and `SoundFontSynth` into a single composition root.
- `EventSource`: converts store song data into player-consumable event streams.
- `playSong`, `playPreviousSong`, `playNextSong`: playback navigation actions.
- `Song` model and event-identification helpers in `song/identify.ts` for MIDI-like event filtering.

## Architecture Notes

- Uses MobX + `mobx-react-lite` observer pattern for UI reactivity.
- Uses feature/store separation: page/components focus on rendering while stores own lifecycle and side effects.
- Depends on `@signal-app/api` and `@signal-app/player` rather than direct Firebase and synth wiring in UI components.

## Libraries and External Factors

- React + Emotion (`@emotion/react`, `@emotion/styled`) for UI composition.
- Routing with `wouter`.
- Firebase services (auth/firestore/functions) through package-level firebase module.
- Runtime behavior depends on browser audio permission and Firebase project configuration.
