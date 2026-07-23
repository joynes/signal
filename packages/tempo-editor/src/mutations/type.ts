import { TempoEditorQueryContext } from "../queries/type"

export declare const tempoEditorMutatorBrand: unique symbol

export interface TempoEditorMutatorContext extends TempoEditorQueryContext {
  readonly [tempoEditorMutatorBrand]: true
}

declare module "../TrackTempoEditor" {
  interface TrackTempoEditor {
    readonly [tempoEditorMutatorBrand]: true
  }
}

export type TempoEditorMutator<R = void> = (
  context: TempoEditorMutatorContext,
) => R
