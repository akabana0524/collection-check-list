import { ref, watch, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'collection-check-list:theme:v1'

function loadMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // 読み込めなければ既定値
  }
  return 'system'
}

/**
 * テーマモード（ライト / ダーク / システム依存）を管理する。
 * システム選択時は OS の配色設定に追従する。
 */
export function useThemeMode() {
  const theme = useTheme()
  const mode = ref<ThemeMode>(loadMode())
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  function resolved(): 'light' | 'dark' {
    if (mode.value === 'system') return media.matches ? 'dark' : 'light'
    return mode.value
  }

  function apply() {
    theme.change(resolved())
  }

  function onMediaChange() {
    if (mode.value === 'system') apply()
  }
  media.addEventListener('change', onMediaChange)
  onUnmounted(() => media.removeEventListener('change', onMediaChange))

  watch(
    mode,
    (m) => {
      try {
        localStorage.setItem(STORAGE_KEY, m)
      } catch {
        // 保存できなくても適用は行う
      }
      apply()
    },
    { immediate: true },
  )

  return { mode }
}
