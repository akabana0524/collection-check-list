/** チェック項目1件分 */
export interface ChecklistItemDef {
  /** 所属カテゴリ名（categories に無い場合は仮の分類として表示） */
  category: string
  /** 表示名 */
  name: string
  /**
   * アイコン（任意）。
   * - `mdi-` で始まる文字列: Material Design Icons の名称（例: "mdi-star"）
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

/** icon が画像（MDI 名ではない）かどうかを判定する */
export function isImageIcon(icon: string): boolean {
  return !icon.startsWith('mdi-')
}
