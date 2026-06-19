# @signal-app/core

## Purpose

Contains the central sequencer domain model, command services, MIDI conversion, storage/repository abstractions, and device services.

## State Management Boundary

Core uses MobX internally, but MobX must remain an internal implementation detail.

Policy:

- Do not expose MobX observables, reactions, or decorators as public app APIs.
- Expose stable subscription/snapshot interfaces for app integration.
- Synchronize to React via `useSyncExternalStore` bridges.

This allows the app layer to remain Jotai-based without coupling to MobX internals.

## Responsibilities

- Domain entities for song/track/measure/selection/transform/midi.
- Command services (`createSongCommandService`, `createArrangeCommandService`, `createControlCommandService`, etc.) that execute edit operations against stores.
- Store layer (`SongStore`, `MIDIDeviceStore`, `BluetoothMIDIDeviceStore`) with explicit observable events.
- Data/repository layer including `IndexedDBStorage` and `SoundFontRepository`.

## Representative Classes and APIs

- `Song`: MobX-backed aggregate root with computed properties (`measures`, `timeSignatures`, `endOfSong`) and serialization via `serializr`.
- `SongStore`: current-song holder with `onSongChanged` observable.
- `mobxToObservable`: adapter converting internal MobX fields to subscribe-style observables for external synchronization.
- `IndexedDBStorage<Data, Metadata>`: generic persisted storage with catalog tracking.
- `SoundFontRepository`: default + user soundfont management, including Electron vs web default source switching.

## Architecture Notes

- Layered exports from `index.ts`: `commands`, `entities`, `helpers`, `midi`, `repositories`, `services`, `stores`.
- Command-service pattern keeps mutation logic grouped by editing concern.
- Domain model uses immutable-like replacement patterns in places (`tracks` ref updates) while preserving MobX reactivity.

## Libraries and External Factors

- Internal deps: `lodash`, `serializr`.
- Peer deps: `mobx`, `mobx-persist-store`, `midifile-ts`, `zod`.
- Browser APIs: IndexedDB, Web MIDI types, File System Access handles.
- Electron/web platform behavior differs in some repositories (notably soundfont defaults).
