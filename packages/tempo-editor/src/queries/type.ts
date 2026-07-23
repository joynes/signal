export declare const tempoEditorQueryBrand: unique symbol

export interface TempoEditorQueryContext {
  readonly [tempoEditorQueryBrand]: true
}

declare module "../TrackTempoEditor" {
  interface TrackTempoEditor {
    readonly [tempoEditorQueryBrand]: true
  }
}

export type TempoEditorQuery<R> = (context: TempoEditorQueryContext) => R
