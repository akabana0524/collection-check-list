import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages のプロジェクトページ用ベースパス。
// 実際のリポジトリ名に合わせて変更してください（例: "/my-repo/"）。
// ユーザー/組織ページ（<name>.github.io）の場合は "/" にします。
// 環境変数 BASE_PATH があればそれを優先します（CI で上書き可能）。
const base = process.env.BASE_PATH ?? '/collection-check-list/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    // Treeshaking + auto component import for Vuetify
    vuetify({ autoImport: true }),
    VitePWA({
      // 新しい Service Worker を自動で適用
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Collection Check List',
        short_name: 'CheckList',
        description: 'コレクション用チェックリスト',
        theme_color: '#863bff',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'ja',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // woff2/woff があれば足りるため、巨大な eot/ttf はプリキャッシュしない
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,woff}'],
        // SPA フォールバック
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
