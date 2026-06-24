import rawData from './checklist-data.json'
import type { ChecklistData } from './types'

/** マスタデータ（JSON を型付きで読み込んだもの） */
export const checklistData: ChecklistData = rawData

export type { ChecklistData, CategoryDef, ChecklistItemDef } from './types'
export { isImageIcon } from './types'
export { parseChecklistData, MASTER_TYPE_DEFINITION } from './schema'
