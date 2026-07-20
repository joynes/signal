# @signal-app/core

## Purpose

Contains the central sequencer domain model, command services, MIDI conversion, storage/repository abstractions, and device services.

## State Management Boundary

Core uses explicit observable primitives internally via `@signal-app/observable`.

Policy:

- Do not expose implementation-specific state containers as public app APIs.
- Expose stable subscription/snapshot interfaces for app integration.
- Synchronize to React via `useSyncExternalStore` bridges.

This allows the app layer to remain Jotai-based without coupling to core internals.

## Responsibilities

- Domain entities for song/track/measure/selection/transform/midi.
- Command services (`createSongCommandService`, `createArrangeCommandService`, `createControlCommandService`, etc.) that execute edit operations against stores.
- Store layer (`SongStore`, `MIDIDeviceStore`, `BluetoothMIDIDeviceStore`) with explicit observable events.
- Data/repository layer including `IndexedDBStorage` and `SoundFontRepository`.

## Representative Classes and APIs

- `Song`: aggregate root exposing observable state (`tracks`, `name`, `timebase`, `measures`, `endOfSong`) and POJO serialization/deserialization.
- `SongStore`: current-song holder with `onSongChanged` observable.
- `ObservableValue` / `Emitter`: minimal observable primitives used by entities and stores.
- `IndexedDBStorage<Data, Metadata>`: generic persisted storage with catalog tracking.
- `SoundFontRepository`: default + user soundfont management, including Electron vs web default source switching.

## Architecture Notes

- Layered exports from `index.ts`: `commands`, `entities`, `helpers`, `midi`, `repositories`, `services`, `stores`.
- Command-service pattern keeps mutation logic grouped by editing concern.
- Domain model uses immutable-like replacement patterns in places (`tracks` ref updates) while preserving stable observable notifications.

## Track Query/Mutation Design Policy

Track event operations are intentionally separated into narrowly scoped query/mutation modules so the internal data shape stays hidden.

Policy:

- Keep `TrackEventsContext` opaque outside track internals. Callers should only use exported query/mutator functions.
- Restrict primitive write access to mutation basics (`mutations/basic.ts`) and compose higher-level behavior in `mutations/composed.ts` and `mutations/higherOrder.ts`.
- Keep primitive reads in `queries/basic.ts`; place multi-step selection/composition logic in `queries/composed.ts`.
- Keep the type surface explicit and minimal through dedicated type modules (`mutations/type.ts`, `queries/type.ts`).
- Prefer adding tests by function ownership (per mutation/query module and per case), so responsibilities remain verifiable during refactors.

This boundary allows internal structures to evolve with lower regression risk while preserving a stable and focused API surface.

## Libraries and External Factors

- Internal deps: `lodash`.
- Peer deps: `midifile-ts`, `zod`.
- Browser APIs: IndexedDB, Web MIDI types, File System Access handles.
- Electron/web platform behavior differs in some repositories (notably soundfont defaults).
