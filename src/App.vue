<script setup lang="ts">
import { ref, watch } from 'vue'
import { isImageIcon, parseChecklistData, MASTER_TYPE_DEFINITION } from './data'
import { useChecklist } from './composables/useChecklist'
import type { CheckItem } from './composables/useChecklist'
import { useSpeechInput } from './composables/useSpeechInput'
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

// チェック済み項目を表示するか
const showChecked = ref(true)

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

// 表示対象の項目（検索フィルタ・チェック済み表示トグルを反映）
// 検索語は空白（半角/全角）区切りで AND 検索
function visibleItems(items: CheckItem[]) {
  const terms = (search.value ?? '')
    .toLowerCase()
    .split(/[\s　]+/)
    .filter(Boolean)
  return items.filter((i) => {
    if (!showChecked.value && i.done) return false
    const name = i.name.toLowerCase()
    return terms.every((t) => name.includes(t))
  })
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
    <v-app-bar color="primary" :title="collectionName">
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
                <v-list-item
                  v-for="item in visibleItems(group.items)"
                  :key="item.key"
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
                    :class="{ 'text-decoration-line-through text-disabled': item.done }"
                  >
                    {{ item.name }}
                  </v-list-item-title>
                </v-list-item>
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

/* スティッキーがクリップされないように親の overflow を解除 */
:deep(.v-expansion-panels),
:deep(.v-expansion-panel),
:deep(.v-expansion-panel__shadow) {
  overflow: visible;
}
</style>
