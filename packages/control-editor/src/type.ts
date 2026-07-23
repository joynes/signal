import { Unsubscribe } from "@signal-app/observable"
import { ControllerEvent, PitchBendEvent } from "midifile-ts"
import { ControlEditorMutator } from "./mutations/type"
import { ControlEditorQuery } from "./queries/type"

export interface ControlEditor {
  observeItems: (listener: () => void) => Unsubscribe
  query: <R>(fn: ControlEditorQuery<R>) => R
  mutate: <R = void>(fn: ControlEditorMutator<R>) => R
  createPreviewEvent: (value: number) => ControllerEvent | PitchBendEvent
}
