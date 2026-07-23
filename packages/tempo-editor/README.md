# @signal-app/tempo-editor

## Purpose

Editor facade for tempo automation, split out of `@signal-app/core`'s `editor/*` family into its own package (mirroring `@signal-app/control-editor`, which moved out the same way).

## Why a separate package

`editor/tempo` used to live inside `@signal-app/core` next to `editor/control`. Both domains needed a prefix on some mutation/query names purely to avoid colliding inside one shared export namespace (`addClipboardTempoEvents`, `tempoEventsToClipboardData`). Moving tempo-editing into its own package removes that need — the clipboard functions are now `pasteItemsAtPosition`/`getItemsClipboardData`, matching `@signal-app/control-editor`'s naming for the same operations.

## What stayed in `@signal-app/core`

Unlike `@signal-app/control-editor`, the `TempoItem` DTO itself (`entities/tempo/TempoItem.ts`, `entities/tempo/transform.ts`) and the Track-level query that reads it (`entities/track/queries/tempo.ts`, `getTempoItems`/`getTempoItemById`) stayed in core. Core's own `Track` needs `TempoItem` to answer "what are this track's tempo events" via its public `TrackEventsQuery` surface (`Track Query/Mutation Design Policy` in `packages/core/README.md`), so moving `TempoItem` out would have created a circular dependency (core depending on this package, while this package depends on core). This package imports `TempoItem`, `getTempoItems`, `getTempoItemById`, `setTempoEventToTempoItem`, `tempoItemToSetTempoEvent`, and `moveTempoItem` from `@signal-app/core`'s public API rather than owning them.

## Responsibilities

- `TempoEditor` / `SongTempoEditor`: the facade over a `Song` (tempo lives on the conductor track, which can change out from under a `Song`, hence `observeItems` juggling both track- and conductor-track-level subscriptions), exposing `getItems`/`getById`/`addItems`/`removeItems`/`updateItems`/`observeItems`/`query`/`mutate`.
- `mutations/primitives.ts` (`addItem`/`removeItem`/`updateItem`) — thin, single-item operations, the only functions allowed to unsafely cast the branded mutator context back to the editor.
- `mutations/composed.ts` — everything built from those primitives: `removeItems`, `duplicateItems`, `pasteItemsAtPosition`, `moveItems`, `removeRedundantItems`, `createOrUpdateItem`, `updateItemsInRange`, `setBpm`.
- `queries/primitives.ts` / `queries/items.ts` — the read-side counterpart (`getItems`, `getItemById`, `listItems`, `getItemsByIds`, `getEventIdsInRange`, `getItemsClipboardData`).
- `ClipboardData`/`ClipboardDataSchema` (zod): the tempo-specific clipboard payload, split out of `entities/clipboard/clipboardTypes.ts`.

## Dependencies

- `@signal-app/core` for `Song`, `Track`, `TempoItem` and its transforms, and shared helpers (`Range`, `closedRange`, `interpolate`).
- `@signal-app/observable` for `Unsubscribe`.
- `midifile-ts` (peer) for `SetTempoEvent`.
- `zod` (peer) for `ClipboardDataSchema`.

## Testing Notes

Same as `@signal-app/control-editor`: `vitest.config.ts` loads `vitest.setup.ts` to stub a minimal `navigator`, since importing anything from `@signal-app/core`'s barrel eagerly touches it (via `SoundFontRepository`'s Electron-vs-web default lookup).
