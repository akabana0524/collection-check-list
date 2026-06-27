import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/** localStorage に自動保存・復元される ref を作る */
export function usePersistedRef<T>(key: string, initial: T): Ref<T> {
  let start = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw != null) start = JSON.parse(raw) as T
  } catch {
    // 壊れていれば初期値
  }

  const state = ref(start) as Ref<T>

  watch(
    state,
    (v) => {
      try {
        localStorage.setItem(key, JSON.stringify(v))
      } catch {
        // 保存できない環境では無視
      }
    },
    { deep: true },
  )

  return state
}
