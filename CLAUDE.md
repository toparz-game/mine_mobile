# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

複数のプラットフォームとユーザー体験に最適化されたマインスイーパーゲームのモノレポです：

- **コアアーキテクチャ**: `/core/minesweeper-core.js` - 全バリアントが継承するベースゲームロジッククラス
- **製品バリアント**: `/products/` には異なる実装が含まれます：
  - `mobile/` - ジェスチャー操作に最適化されたタッチ版
  - `pc/` - 標準デスクトップ版
  - `pc-pro/` - CSPソルバー、統計、リプレイ、テーマ、サウンド機能付き高機能版
- **共有リソース**: `/shared/` 共通アセット、スタイル、ユーティリティ用

## 開発コマンド

ビルドシステムを使用しないバニラJavaScriptプロジェクトのため：

- **テスト**: ブラウザで `index.html` を開き製品セレクターにアクセス
- **個別製品**: 各製品の `index.html` を直接開く
- **package.jsonなし**: 依存関係やビルドツールを使わない純粋なHTML/CSS/JS

## アーキテクチャ詳細

### 継承階層
- `MinesweeperCore` (基底クラス) → `PCMinesweeper` → `PCProMinesweeper`
- `MinesweeperCore` → `MobileMinesweeper`

### 主要コンポーネント

**コアモジュール** (`/core/minesweeper-core.js`):
- ゲーム状態管理（ボード、開示状態、旗、疑問符）
- 一時停止/再開機能付きタイマー
- 地雷配置ロジック
- 勝利/敗北判定
- 基本ゲームメカニクス

**PC Pro機能** (`/products/pc-pro/`):
- CSPソルバー (`modules/csp-solver.js`) - 制約充足を使用した高度確率計算
- Webワーカーサポート (`modules/csp-worker.js`) 重い計算用
- 統計追跡とベストタイム
- 動作記録付きリプレイシステム
- アンドゥ/リドゥ機能
- カスタムテーマとサウンドエフェクト
- ヒントシステム
- チャレンジモード

**モバイル機能** (`/products/mobile/`):
- タッチジェスチャー処理（タップ、長押し、ピンチズーム）
- モバイルゲームプレイを簡単にする旗モード切替
- 異なる画面サイズ対応のレスポンシブデザイン
- 誤操作防止のためのボタンクールダウン

### ファイル構造パターン
各製品は以下の構造に従います：
```
/products/[variant]/
├── index.html    # エントリーポイント
├── game.js       # コアを継承するメインゲームクラス
├── style.css     # バリアント固有スタイル
└── modules/      # オプション追加モジュール
```

## コード規約

- クラスはPascalCase (例: `MinesweeperCore`, `CSPSolver`)
- メソッドと変数はcamelCase
- 明確に分離されたモノレポパターンのファイル構造
- 開発者向けドキュメントには日本語コメントを使用
- 全バリアントはコードの重複ではなくコア機能の拡張

## デプロイ

- GitHub Pages対応（静的ファイルのみ）
- ルートのランディングページが製品セレクターとして機能
- 各バリアントは `/products/[variant]/` パスでアクセス可能