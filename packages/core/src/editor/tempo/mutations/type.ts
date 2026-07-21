import { TempoEditorQueryContext } from "../queries/type"

export declare const songTempoEditorMutatorBrand: unique symbol

export interface TempoEditorMutatorContext extends TempoEditorQueryContext {
  readonly [songTempoEditorMutatorBrand]: true
}

declare module "../SongTempoEditor" {
  interface SongTempoEditor {
    readonly [songTempoEditorMutatorBrand]: true
  }
}

export type TempoEditorMutator<R = void> = (
  context: TempoEditorMutatorContext,
) => R
