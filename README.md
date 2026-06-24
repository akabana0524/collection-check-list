# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## GitHub Pages へのデプロイ

`.github/workflows/deploy.yml` により、`main` ブランチへの push で自動ビルド & デプロイされます。

セットアップ手順:

1. GitHub にリポジトリを作成して push する（まだ無い場合は仮の名前で OK）。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定する。
3. `main` に push すると `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

### ベースパスについて

- CI ではリポジトリ名から自動で `BASE_PATH=/<リポジトリ名>/` を設定します（[deploy.yml](.github/workflows/deploy.yml)）。
- ローカルの `vite.config.ts` の既定値は仮の `'/collection-check-list/'` です。実際のリポジトリ名に合わせて変更してください。
- ユーザー/組織ページ（`<name>.github.io` リポジトリ）の場合はベースを `'/'` にします。

## チェック状態の保存・操作

- チェック状態はブラウザの **localStorage** に自動保存され、再読み込み後も復元されます。
- アプリバーの **元に戻す** で直前の操作を取り消せます。
- **リセット** ですべてのチェックと履歴を完全に消去できます（確認ダイアログあり）。
