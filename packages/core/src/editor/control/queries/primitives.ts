import { ControlItem } from "../../../entities/control/ControlItem"
import { ControlEditorQuery, ControlEditorQueryContext } from "./type"

type QueryControlEditor = {
  getItems: () => readonly ControlItem[]
  getById: (id: number) => ControlItem | undefined
}

const asQueryControlEditor = (
  context: ControlEditorQueryContext,
): QueryControlEditor => context as unknown as QueryControlEditor

export const getControlItems: ControlEditorQuery<readonly ControlItem[]> = (
  context,
) => asQueryControlEditor(context).getItems()

export const getControlItemById =
  (id: number): ControlEditorQuery<ControlItem | undefined> =>
  (context) =>
    asQueryControlEditor(context).getById(id)
