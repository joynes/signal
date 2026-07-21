import { Unsubscribe } from "@signal-app/observable"
import { TempoEditorMutator } from "./mutations/type"
import { TempoEditorQuery } from "./queries/type"

export interface TempoEditor {
  observeTempoItems: (listener: () => void) => Unsubscribe
  query: <R>(fn: TempoEditorQuery<R>) => R
  mutate: <R = void>(fn: TempoEditorMutator<R>) => R
}
