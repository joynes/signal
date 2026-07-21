export declare const tempoEditorQueryBrand: unique symbol

export interface TempoEditorQueryContext {
  readonly [tempoEditorQueryBrand]: true
}

declare module "../SongTempoEditor" {
  interface SongTempoEditor {
    readonly [tempoEditorQueryBrand]: true
  }
}

export type TempoEditorQuery<R> = (context: TempoEditorQueryContext) => R
