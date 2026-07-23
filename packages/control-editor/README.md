# @signal-app/control-editor

## Purpose

Editor facade for pitchBend/controller automation lanes, split out of `@signal-app/core`'s `editor/*` family into its own package. Mirrors `@signal-app/core`'s `editor/tempo` in shape (a DTO, thin primitives, composed mutators built from those primitives, an Editor facade class), scoped to a single track and a single `ValueEventType` (`pitchBend`, or `controller` with a specific `controllerType`).

## Why a separate package

`editor/control` used to live inside `@signal-app/core` next to `editor/tempo`. Both domains needed a `Control`/`Tempo` prefix on every mutation/query (`removeControlItems`, `addControlItem`, ...) purely to avoid colliding with each other inside one shared export namespace. Moving control-editing into its own package removes that need — names here are just `removeItems`, `addItem`, `moveItems`, and so on.

## Responsibilities

- `ControlItem` DTO (`{id, tick, value}`) so React never has to branch on `ControllerEvent` vs `PitchBendEvent` — a `ControlEditor` is already bound to one `ValueEventType` at construction.
- `createControlEditor(track, type): ControlEditor` — the public constructor. The concrete class implementing it (`TrackControlEditor`) is not exported; callers only ever see the `ControlEditor` interface (`observeItems`/`query`/`mutate`/`createPreviewEvent`).
- `mutations/primitives.ts` (`addItem`/`removeItem`/`updateItem`) — thin, single-item operations, the only functions allowed to unsafely cast the branded mutator context back to the editor.
- `mutations/composed.ts` — everything built from those primitives: `removeItems`, `moveItems`, `removeRedundantItems`, `duplicateItems`, `createOrUpdateItemValue`, `updateItemsInRange(WithEasing)`, `pasteItemsAtPosition`.
- `queries/primitives.ts` / `queries/items.ts` — the read-side counterpart (`getItems`, `getItemById`, `getValueEventType`, `listItems`, `getItemsByIds`, `getItemsClipboardData`, `getItemsInRangeWithPrevious`).
- `ClipboardData`/`ClipboardDataSchema` (zod): carries the source `ValueEventType` alongside the copied items, so `pasteItemsAtPosition` can refuse to paste pitchBend data into a controller lane (or vice versa) — their value ranges aren't compatible.

## Dependencies

- `@signal-app/core` for `Track`, track-level mutation/query primitives (`getAll`, `getEventById`, `createOrUpdate`, `updateEvents`), and shared helpers (`Range`, `isEventInRange`, `closedRange`, `interpolate`).
- `@signal-app/observable` for `Unsubscribe`.
- `midifile-ts` (peer) for `ControllerEvent`/`PitchBendEvent` and MIDI event construction.
- `zod` (peer) for `ClipboardDataSchema`.

## Testing Notes

Importing anything from `@signal-app/core`'s barrel eagerly touches `navigator` (via `SoundFontRepository`'s Electron-vs-web default lookup), so `vitest.config.ts` loads `vitest.setup.ts` to stub a minimal `navigator` before tests run, rather than pulling in a full DOM environment.
