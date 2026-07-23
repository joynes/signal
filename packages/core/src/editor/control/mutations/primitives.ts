import { ControlItem } from "../../../entities/control/ControlItem"
import { ControlEditorMutator, ControlEditorMutatorContext } from "./type"

type MutableControlEditor = {
  addItems: (items: readonly Omit<ControlItem, "id">[]) => ControlItem[]
  removeItems: (ids: readonly number[]) => void
  updateItems: (items: readonly ControlItem[]) => void
}

const asMutableControlEditor = (
  context: ControlEditorMutatorContext,
): MutableControlEditor => context as unknown as MutableControlEditor

export const addControlItem =
  (
    item: Omit<ControlItem, "id">,
  ): ControlEditorMutator<ControlItem | undefined> =>
  (context) =>
    asMutableControlEditor(context).addItems([item])[0]

export const removeControlItem =
  (id: number): ControlEditorMutator<void> =>
  (context) => {
    asMutableControlEditor(context).removeItems([id])
  }

export const updateControlItem =
  (item: ControlItem): ControlEditorMutator<void> =>
  (context) => {
    asMutableControlEditor(context).updateItems([item])
  }
