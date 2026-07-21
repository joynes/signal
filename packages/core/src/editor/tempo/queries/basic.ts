import { TempoItem } from "../../../entities/tempo/TempoItem"
import { TempoEditorQuery, TempoEditorQueryContext } from "./type"

type QueryTempoEditor = {
  getItems: () => readonly TempoItem[]
  getById: (id: number) => TempoItem | undefined
}

const asQueryTempoEditor = (
  context: TempoEditorQueryContext,
): QueryTempoEditor => context as QueryTempoEditor

export const getItems: TempoEditorQuery<readonly TempoItem[]> = (context) =>
  asQueryTempoEditor(context).getItems()

export const getById =
  (id: number): TempoEditorQuery<TempoItem | undefined> =>
  (context) =>
    asQueryTempoEditor(context).getById(id)
