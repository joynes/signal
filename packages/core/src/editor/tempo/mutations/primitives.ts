import { TempoItem } from "../../../entities/tempo/TempoItem"
import { TempoEditorMutator, TempoEditorMutatorContext } from "./type"

type MutableTempoEditor = {
  addItems: (items: readonly Omit<TempoItem, "id">[]) => TempoItem[]
  removeItems: (ids: readonly number[]) => void
  updateItems: (items: readonly TempoItem[]) => void
}

const asMutableTempoEditor = (
  context: TempoEditorMutatorContext,
): MutableTempoEditor => context as unknown as MutableTempoEditor

export const addItem =
  (item: Omit<TempoItem, "id">): TempoEditorMutator<TempoItem | undefined> =>
  (context) =>
    asMutableTempoEditor(context).addItems([item])[0]

export const removeItem =
  (id: number): TempoEditorMutator<void> =>
  (context) => {
    asMutableTempoEditor(context).removeItems([id])
  }

export const updateItem =
  (item: TempoItem): TempoEditorMutator<void> =>
  (context) => {
    asMutableTempoEditor(context).updateItems([item])
  }
