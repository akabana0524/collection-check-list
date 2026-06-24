import type { ChecklistData } from './types'

/**
 * アップロードされた JSON が ChecklistData の形式かどうかを検証する。
 * 問題があれば理由を throw する。
 */
export function parseChecklistData(text: string): ChecklistData {
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('JSON として読み込めませんでした')
  }
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('オブジェクト形式ではありません')
  }
  const o = obj as Record<string, unknown>
  if (typeof o.collectionName !== 'string' || !o.collectionName.trim()) {
    throw new Error('collectionName（文字列）が必要です')
  }
  if (!Array.isArray(o.categories)) {
    throw new Error('categories（配列）が必要です')
  }
  if (!Array.isArray(o.data)) {
    throw new Error('data（配列）が必要です')
  }
  for (const c of o.categories) {
    if (typeof c?.name !== 'string') {
      throw new Error('categories の各要素には name（文字列）が必要です')
    }
  }
  for (const d of o.data) {
    if (typeof d?.category !== 'string' || typeof d?.name !== 'string') {
      throw new Error('data の各要素には category と name（文字列）が必要です')
    }
  }
  return obj as ChecklistData
}

/** マスタ JSON を作るための型定義（ダウンロード用） */
export const MASTER_TYPE_DEFINITION = `// チェックリスト マスタデータの型定義
// この形式の JSON を作成してアプリにアップロードできます。

/** チェック項目1件分 */
export interface ChecklistItemDef {
  /** 所属カテゴリ名（categories に無い場合は仮の分類として表示され、ヘッダーは白） */
  category: string
  /** 表示名 */
  name: string
  /**
   * アイコン（任意）。
   * - "mdi-" で始まる文字列: Material Design Icons の名称（例: "mdi-star"）
   * - それ以外の文字列: 画像の URL またはパス（例: "/images/foo.png", "https://..."）
   */
  icon?: string
}

/** カテゴリ1件分（目標数・テーマカラー） */
export interface CategoryDef {
  /** カテゴリ名 */
  name: string
  /** 目標数（任意）。チェック数がこの値以上で「達成」となる */
  target?: number
  /** テーマカラー（任意）。16進カラー（例: "#42a5f5"） */
  color?: string
}

/** チェックリストのマスタデータ全体（categories と data は並列） */
export interface ChecklistData {
  /** コレクション名（アプリのヘッダに表示。進捗の保存単位にもなる） */
  collectionName: string
  categories: CategoryDef[]
  data: ChecklistItemDef[]
}

/* 例:
{
  "collectionName": "マイコレクション",
  "categories": [
    { "name": "カテゴリA", "target": 2, "color": "#a8d8ea" }
  ],
  "data": [
    { "category": "カテゴリA", "name": "項目1", "icon": "mdi-star" },
    { "category": "カテゴリA", "name": "項目2" }
  ]
}
*/
`
