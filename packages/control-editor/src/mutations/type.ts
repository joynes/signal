import { ControlEditorQueryContext } from "../queries/type"

export declare const controlEditorMutatorBrand: unique symbol

export interface ControlEditorMutatorContext extends ControlEditorQueryContext {
  readonly [controlEditorMutatorBrand]: true
}

declare module "../TrackControlEditor" {
  interface TrackControlEditor {
    readonly [controlEditorMutatorBrand]: true
  }
}

export type ControlEditorMutator<R = void> = (
  context: ControlEditorMutatorContext,
) => R
