import { ControlItem } from "../entities/ControlItem"
import { ControlEditorMutator, ControlEditorMutatorContext } from "./type"

type MutableControlEditor = {
  addItems: (items: readonly Omit<ControlItem, "id">[]) => ControlItem[]
  removeItems: (ids: readonly number[]) => void
  updateItems: (items: readonly ControlItem[]) => void
}

const asMutableControlEditor = (
  context: ControlEditorMutatorContext,
): MutableControlEditor => context as unknown as MutableControlEditor

export const addItem =
  (
    item: Omit<ControlItem, "id">,
  ): ControlEditorMutator<ControlItem | undefined> =>
  (context) =>
    asMutableControlEditor(context).addItems([item])[0]

export const removeItem =
  (id: number): ControlEditorMutator<void> =>
  (context) => {
    asMutableControlEditor(context).removeItems([id])
  }

export const updateItem =
  (item: ControlItem): ControlEditorMutator<void> =>
  (context) => {
    asMutableControlEditor(context).updateItems([item])
  }
