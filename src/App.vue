<script setup lang="ts">
import { ref, watch } from 'vue'
import { isImageIcon, parseChecklistData, MASTER_TYPE_DEFINITION } from './data'
import { useChecklist } from './composables/useChecklist'
import type { CheckItem } from './composables/useChecklist'
import { useSpeechInput } from './composables/useSpeechInput'
import { useThemeMode } from './composables/useThemeMode'
import type { ThemeMode } from './composables/useThemeMode'
import { usePersistedRef } from './composables/usePersistedRef'
import { contrastText } from './utils/color'
import { downloadText } from './utils/download'

const {
  groups,
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
} = useChecklist()

// テーマモード（ライト / ダーク / システム依存）
const { mode: themeMode } = useThemeMode()
const themeOptions: { value: ThemeMode; title: string; icon: string }[] = [
  { value: 'light', title: 'ライト', icon: 'mdi-white-balance-sunny' },
  { value: 'dark', title: 'ダーク', icon: 'mdi-weather-night' },
  { value: 'system', title: 'システムに合わせる', icon: 'mdi-theme-light-dark' },
]

// 成功を示す薄明るいグリーン（アクセントカラー）
const ACCENT = '#a5d6a7'

// カテゴリのテーマカラーをヘッダー背景にそのまま使う（文字色のみ可読性で調整）
function headerStyle(color?: string) {
  if (!color) return undefined
  return { backgroundColor: color, color: contrastText(color) }
}

// 進捗バーの色: 未達は白、達成でアクセントカラー
function barColor(group: { achieved: boolean }) {
  return group.achieved ? ACCENT : '#ffffff'
}

// 目標に対する達成率（%）
function progressPct(group: { doneCount: number; target?: number }) {
  if (!group.target) return 0
  return Math.min(100, (group.doneCount / group.target) * 100)
}

// チェック済み項目を表示するか（localStorage で維持）
const showChecked = usePersistedRef('collection-check-list:showChecked:v1', true)

// 並び替え: キー（定義順 / 名前順）と方向（昇順 / 降順）（localStorage で維持）
const sortKey = usePersistedRef<'default' | 'name'>(
  'collection-check-list:sortKey:v1',
  'default',
)
const sortAsc = usePersistedRef('collection-check-list:sortAsc:v1', true)

// 検索キーワード
const search = ref('')

// 音声入力（対応ブラウザのみ）。認識結果を検索欄へ反映
const {
  supported: voiceSupported,
  listening,
  toggle: toggleVoice,
} = useSpeechInput((text) => {
  search.value = text
})

// 表示対象の項目（検索フィルタ・チェック済み表示トグル・並び替えを反映）
// 検索語は空白（半角/全角）区切りで AND 検索
function visibleItems(items: CheckItem[]) {
  const terms = (search.value ?? '')
    .toLowerCase()
    .split(/[\s　]+/)
    .filter(Boolean)
  const filtered = items.filter((i) => {
    if (!showChecked.value && i.done) return false
    const name = i.name.toLowerCase()
    return terms.every((t) => name.includes(t))
  })
  // 名前順のときだけ並べ替え。定義順は元の順（データ定義順）を維持
  if (sortKey.value === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }
  // 降順なら反転（定義順・名前順の両方に適用）
  if (!sortAsc.value) filtered.reverse()
  // チェック済みは常に下へ（安定ソートで上記の並びは維持）
  filtered.sort((a, b) => Number(a.done) - Number(b.done))
  return filtered
}

// アコーディオンの開閉状態（初期はすべて開く）
const openPanels = ref<string[]>(groups.value.map((g) => g.category))

// マスタ切り替え時はすべてのパネルを開き直す
watch(collectionName, () => {
  openPanels.value = groups.value.map((g) => g.category)
})

// リセット確認ダイアログ
const resetDialog = ref(false)

function confirmReset() {
  reset()
  resetDialog.value = false
}

// 通知用スナックバー
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function notify(text: string, color: 'success' | 'error') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

// 型定義をダウンロード
function downloadTypeDefinition() {
  downloadText('checklist-data.d.ts', MASTER_TYPE_DEFINITION, 'text/typescript')
}

// コレクション切り替えダイアログ
const switchDialog = ref(false)

function chooseCollection(name: string) {
  switchCollection(name)
  switchDialog.value = false
}

// マスタデータのアップロード
const fileInput = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 同じファイルを連続で選べるようにクリア
  if (!file) return
  try {
    const text = await file.text()
    const data = parseChecklistData(text)
    importMaster(data)
    notify(`「${data.collectionName}」を取り込みました`, 'success')
  } catch (err) {
    notify(
      `取り込みに失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      'error',
    )
  }
}
</script>

<template>
  <v-app>
    <v-app-bar color="surface" :title="collectionName">
      <template #append>
        <v-btn
          icon="mdi-undo"
          :disabled="!canUndo"
          variant="text"
          aria-label="元に戻す"
          @click="undo"
        />
        <v-btn
          icon="mdi-redo"
          :disabled="!canRedo"
          variant="text"
          aria-label="やり直す"
          @click="redo"
        />
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              aria-label="メニュー"
              v-bind="props"
            />
          </template>
          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-restore"
              title="進捗をリセット"
              @click="resetDialog = true"
            />
            <v-list-item
              prepend-icon="mdi-upload"
              title="コレクションをアップロード"
              @click="triggerUpload"
            />
            <v-list-item
              prepend-icon="mdi-swap-horizontal"
              title="コレクションを切り替え"
              @click="switchDialog = true"
            />
            <v-list-item
              prepend-icon="mdi-download"
              title="型定義をダウンロード"
              @click="downloadTypeDefinition"
            />
            <v-divider class="my-1" />
            <v-list-subheader>テーマ</v-list-subheader>
            <v-list-item
              v-for="opt in themeOptions"
              :key="opt.value"
              :prepend-icon="opt.icon"
              :title="opt.title"
              :active="themeMode === opt.value"
              :append-icon="themeMode === opt.value ? 'mdi-check' : undefined"
              @click="themeMode = opt.value"
            />
          </v-list>
        </v-menu>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="d-none"
          @change="onFileSelected"
        />
      </template>
    </v-app-bar>

    <v-main>
      <v-container class="py-8" style="max-width: 640px">
        <div class="d-flex align-center ga-3 search-sticky">
          <v-text-field
            v-model="search"
            label="項目を検索"
            prepend-inner-icon="mdi-magnify"
            :append-inner-icon="
              voiceSupported
                ? listening
                  ? 'mdi-microphone'
                  : 'mdi-microphone-outline'
                : undefined
            "
            variant="outlined"
            density="compact"
            clearable
            hide-details
            @click:append-inner="toggleVoice"
          />
          <v-menu :close-on-content-click="false">
            <template #activator="{ props }">
              <v-btn
                :icon="sortAsc ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
                variant="text"
                aria-label="並び替え"
                class="flex-shrink-0"
                v-bind="props"
              />
            </template>
            <v-list density="compact">
              <v-list-subheader>並び順</v-list-subheader>
              <v-list-item
                title="定義順"
                prepend-icon="mdi-format-list-numbered"
                :active="sortKey === 'default'"
                :append-icon="sortKey === 'default' ? 'mdi-check' : undefined"
                @click="sortKey = 'default'"
              />
              <v-list-item
                title="名前順"
                prepend-icon="mdi-sort-alphabetical-variant"
                :active="sortKey === 'name'"
                :append-icon="sortKey === 'name' ? 'mdi-check' : undefined"
                @click="sortKey = 'name'"
              />
              <v-divider class="my-1" />
              <v-list-subheader>方向</v-list-subheader>
              <v-list-item
                title="昇順"
                prepend-icon="mdi-sort-ascending"
                :active="sortAsc"
                :append-icon="sortAsc ? 'mdi-check' : undefined"
                @click="sortAsc = true"
              />
              <v-list-item
                title="降順"
                prepend-icon="mdi-sort-descending"
                :active="!sortAsc"
                :append-icon="!sortAsc ? 'mdi-check' : undefined"
                @click="sortAsc = false"
              />
            </v-list>
          </v-menu>
          <div class="d-flex align-center flex-shrink-0">
            <v-icon
              :icon="showChecked ? 'mdi-eye' : 'mdi-eye-off'"
              class="me-1"
            />
            <v-icon icon="mdi-checkbox-marked-outline" class="me-1" />
            <v-switch
              v-model="showChecked"
              color="primary"
              density="compact"
              hide-details
              inset
              aria-label="チェック済みを表示"
            />
          </div>
        </div>

        <v-expansion-panels v-model="openPanels" multiple variant="accordion">
          <v-expansion-panel
            v-for="group in groups"
            :key="group.category"
            :value="group.category"
          >
            <v-expansion-panel-title :style="headerStyle(group.color)">
              <div class="w-100">
                <div class="d-flex align-center">
                  <span>{{ group.category }}</span>
                  <v-chip
                    v-if="group.achieved"
                    size="small"
                    variant="flat"
                    class="ms-2 font-weight-bold"
                    :style="{
                      backgroundColor: ACCENT,
                      color: '#000000',
                      border: '1px solid rgba(0, 0, 0, 0.55)',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                    }"
                  >
                    <v-icon start icon="mdi-check" size="small" />達成
                  </v-chip>
                  <v-spacer />
                  <span class="text-caption me-2">
                    {{ group.doneCount }}
                    <template v-if="group.target != null">/ 目標 {{ group.target }}</template>
                    <template v-else>/ {{ group.items.length }}</template>
                  </span>
                </div>
                <v-progress-linear
                  v-if="group.target != null"
                  :model-value="progressPct(group)"
                  :color="barColor(group)"
                  bg-color="#ffffff"
                  bg-opacity="0.3"
                  height="8"
                  rounded
                  class="mt-2"
                  :style="{
                    border: '1px solid rgba(0, 0, 0, 0.35)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                  }"
                />
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text class="px-0">
              <v-list lines="one">
                <TransitionGroup name="list" tag="div" class="list-group">
                <v-list-item
                  v-for="item in visibleItems(group.items)"
                  :key="item.key"
                  :class="{ 'done-item': item.done }"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="item.done"
                      @update:model-value="toggle(item)"
                    />
                    <template v-if="item.icon">
                      <v-avatar
                        v-if="isImageIcon(item.icon)"
                        :image="item.icon"
                        size="24"
                        rounded="0"
                        class="ms-1 me-3"
                      />
                      <v-icon v-else :icon="item.icon" class="ms-1 me-3" />
                    </template>
                  </template>
                  <v-list-item-title
                    :class="{ 'text-decoration-line-through': item.done }"
                  >
                    {{ item.name }}
                  </v-list-item-title>
                </v-list-item>
                </TransitionGroup>
                <v-list-item
                  v-if="visibleItems(group.items).length === 0"
                  class="text-caption text-medium-emphasis"
                >
                  表示できる項目はありません
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
    </v-main>

    <v-dialog v-model="resetDialog" max-width="400">
      <v-card>
        <v-card-title>チェックをリセット</v-card-title>
        <v-card-text>
          すべてのチェック状態と元に戻す履歴を消去します。この操作は取り消せません。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resetDialog = false">キャンセル</v-btn>
          <v-btn color="error" variant="flat" @click="confirmReset">リセットする</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="switchDialog" max-width="400">
      <v-card title="コレクションを切り替え">
        <v-list>
          <v-list-item
            v-for="name in collections"
            :key="name"
            :title="name"
            :active="name === collectionName"
            :append-icon="name === collectionName ? 'mdi-check' : undefined"
            @click="chooseCollection(name)"
          />
        </v-list>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="switchDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* 検索フォームをアプリバー直下にスティッキー固定 */
.search-sticky {
  position: sticky;
  top: 64px; /* v-app-bar の高さ */
  z-index: 5;
  background: rgb(var(--v-theme-background));
  padding-top: 8px;
  padding-bottom: 8px;
}

/* カテゴリヘッダーを検索フォームの下にスティッキー固定 */
:deep(.v-expansion-panel-title) {
  position: sticky;
  top: 120px; /* アプリバー + 検索フォームの高さ */
  z-index: 3;
}

/* チェック済み項目は少し薄暗くして刺激を減らす */
.done-item {
  opacity: 0.55;
}

/* チェックによる並べ替えのアニメーション */
.list-group {
  position: relative;
}
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
}
/* 退場要素を浮かせて、残りの要素の移動を滑らかにする */
.list-leave-active {
  position: absolute;
  width: 100%;
}

/* スティッキーがクリップされないように親の overflow を解除 */
:deep(.v-expansion-panels),
:deep(.v-expansion-panel),
:deep(.v-expansion-panel__shadow) {
  overflow: visible;
}
</style>
