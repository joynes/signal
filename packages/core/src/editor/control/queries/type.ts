export declare const controlEditorQueryBrand: unique symbol

export interface ControlEditorQueryContext {
  readonly [controlEditorQueryBrand]: true
}

declare module "../TrackControlEditor" {
  interface TrackControlEditor {
    readonly [controlEditorQueryBrand]: true
  }
}

export type ControlEditorQuery<R> = (context: ControlEditorQueryContext) => R
