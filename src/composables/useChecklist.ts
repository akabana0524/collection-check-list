import { ref, computed, watch } from 'vue'
import { checklistData } from '../data'
import type { ChecklistData } from '../data'

export interface CheckItem {
  category: string
  name: string
  icon?: string
  /** 永続化・undo 用の安定キー（category + name から生成） */
  key: string
  done: boolean
}

/** アップロードされたマスタ群の保存先（リセットでは消さない） */
const MASTERS_KEY = 'collection-check-list:masters:v1'
/** 現在選択中のコレクション名 */
const ACTIVE_KEY = 'collection-check-list:active:v1'
/** 進捗の保存先。コレクション名単位で done 状態を保持 */
const PROGRESS_KEY = 'collection-check-list:progress:v1'

/** コレクション名 -> done マップ */
type ProgressStore = Record<string, Record<string, boolean>>
/** コレクション名 -> マスタ（アップロード分） */
type MasterRegistry = Record<string, ChecklistData>

/** アップロードされたマスタ群を読み込む */
function loadRegistry(): MasterRegistry {
  try {
    const raw = localStorage.getItem(MASTERS_KEY)
    return raw ? (JSON.parse(raw) as MasterRegistry) : {}
  } catch {
    return {}
  }
}

/** 利用可能なマスタ一覧（同梱版＋アップロード版。同名はアップロード版優先） */
function availableMasters(registry: MasterRegistry): Map<string, ChecklistData> {
  const map = new Map<string, ChecklistData>()
  map.set(checklistData.collectionName, checklistData)
  for (const name of Object.keys(registry)) map.set(name, registry[name])
  return map
}

/** 進捗ストア（コレクション名ごと）を読み込む */
function loadProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as ProgressStore) : {}
  } catch {
    return {}
  }
}

function makeKey(category: string, name: string): string {
  return `${category}::${name}`
}

/** マスタと done マップから CheckItem 配列を作る */
function buildItems(
  master: ChecklistData,
  done: Record<string, boolean>,
): CheckItem[] {
  return master.data.map((it) => {
    const key = makeKey(it.category, it.name)
    return {
      category: it.category,
      name: it.name,
      icon: it.icon,
      key,
      done: done[key] ?? false,
    }
  })
}

export function useChecklist() {
  // アップロードされたマスタ群
  const registry = ref<MasterRegistry>(loadRegistry())
  // コレクション名ごとの進捗ストア
  const progressStore = loadProgress()

  // 利用可能なコレクション名の一覧
  const collections = computed(() => [
    ...availableMasters(registry.value).keys(),
  ])

  // 起動時のアクティブコレクションを決定（保存値→無ければ同梱版）
  function resolveActive(): ChecklistData {
    const map = availableMasters(registry.value)
    const active = localStorage.getItem(ACTIVE_KEY)
    if (active && map.has(active)) return map.get(active)!
    return checklistData
  }

  const master = ref<ChecklistData>(resolveActive())
  const collectionName = computed(() => master.value.collectionName)

  const items = ref<CheckItem[]>(
    buildItems(master.value, progressStore[master.value.collectionName] ?? {}),
  )

  // undo 用の履歴（直前の状態スナップショットを積む）
  const history = ref<Record<string, boolean>[]>([])
  // redo 用の履歴（undo した状態を積む）
  const future = ref<Record<string, boolean>[]>([])
  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /** 現在の done 状態を key -> done のマップにする */
  function snapshot(): Record<string, boolean> {
    const s: Record<string, boolean> = {}
    for (const it of items.value) s[it.key] = it.done
    return s
  }

  /** スナップショットを現在の項目に適用する */
  function applySnapshot(s: Record<string, boolean>): void {
    for (const it of items.value) it.done = s[it.key] ?? false
  }

  /** チェックを切り替える（履歴に直前状態を保存し、redo 履歴は破棄） */
  function toggle(item: CheckItem): void {
    history.value.push(snapshot())
    future.value = []
    item.done = !item.done
  }

  /** 直前の操作を元に戻す */
  function undo(): void {
    const prev = history.value.pop()
    if (!prev) return
    future.value.push(snapshot())
    applySnapshot(prev)
  }

  /** 元に戻した操作をやり直す */
  function redo(): void {
    const next = future.value.pop()
    if (!next) return
    history.value.push(snapshot())
    applySnapshot(next)
  }

  /** すべてのチェックと履歴を完全にリセットする（マスタは保持） */
  function reset(): void {
    history.value = []
    future.value = []
    for (const it of items.value) it.done = false
  }

  /** 指定マスタに切り替えて項目を作り直す（進捗はコレクション名ごとに復元） */
  function activate(data: ChecklistData): void {
    master.value = data
    items.value = buildItems(data, progressStore[data.collectionName] ?? {})
    history.value = []
    future.value = []
    try {
      localStorage.setItem(ACTIVE_KEY, data.collectionName)
    } catch {
      // 保存できなくてもメモリ上では反映する
    }
  }

  /**
   * アップロードされたマスタデータを取り込む。
   * - マスタ群に追加して localStorage に保存（リセットでは消えない）
   * - 同じコレクション名ならマスタだけ上書きし進捗を維持、別名なら新規
   * - 取り込んだコレクションをアクティブにする
   */
  function importMaster(data: ChecklistData): void {
    registry.value = { ...registry.value, [data.collectionName]: data }
    try {
      localStorage.setItem(MASTERS_KEY, JSON.stringify(registry.value))
    } catch {
      // 保存できなくてもメモリ上では反映する
    }
    activate(data)
  }

  /** コレクションを切り替える */
  function switchCollection(name: string): void {
    const map = availableMasters(registry.value)
    const target = map.get(name)
    if (target) activate(target)
  }

  // 変更を localStorage に保存（コレクション名ごとに done を記録）
  watch(
    [items, collectionName],
    () => {
      try {
        progressStore[collectionName.value] = snapshot()
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressStore))
      } catch {
        // ストレージが使えない環境では保存をスキップ
      }
    },
    { deep: true },
  )

  const remaining = computed(() => items.value.filter((i) => !i.done).length)

  // カテゴリごとにグループ化（目標数・達成状況・テーマカラーつき）
  const groups = computed(() => {
    const categoryMap = new Map(master.value.categories.map((c) => [c.name, c]))
    const map = new Map<string, CheckItem[]>()
    for (const item of items.value) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    // 表示順: categories の定義順を先に、定義に無いカテゴリは出現順で後に
    const ordered: string[] = []
    for (const c of master.value.categories) {
      if (map.has(c.name)) ordered.push(c.name)
    }
    for (const name of map.keys()) {
      if (!ordered.includes(name)) ordered.push(name)
    }
    return ordered.map((category) => {
      const list = map.get(category)!
      const doneCount = list.filter((i) => i.done).length
      const def = categoryMap.get(category)
      const target = def?.target
      // categories に無いカテゴリは仮分類として表示し、ヘッダーは白
      const color = def ? def.color : '#ffffff'
      // 目標数が設定されていれば、チェック数が目標以上で達成
      const achieved = target != null && doneCount >= target
      return { category, items: list, doneCount, target, color, achieved }
    })
  })

  return {
    items,
    groups,
    remaining,
    collectionName,
    collections,
    canUndo,
    canRedo,
    toggle,
    undo,
    redo,
    reset,
    importMaster,
    switchCollection,
  }
}
