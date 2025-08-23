# 🚀 クイックリファレンス - プロジェクト修正用

## 📋 緊急修正用チートシート

### 🎯 **よくある問題TOP3と即座解決法**

#### ❌ **1. 確率が表示されない**
```javascript
// 📍 確認箇所: line 4587-4685
calculateCellProbabilitiesBit(validConfigs, boundaryCells)

// 🔧 即座デバッグ
const result = solver.solveBoundaryConstraintsBit();
console.log('確率:', result.probabilities);
console.log('境界セル:', result.boundaryCells);
```

#### ❌ **2. 完全探索が終わらない**
```javascript
// 📍 確認箇所: line 4985-5085
enumerateValidConfigsBit(constraintGroups)

// 🔧 即座修正: セル数制限チェック
if (boundaryCells.length > 29) {
    console.warn('セル数超過:', boundaryCells.length);
    return fallbackToOriginal(); // 従来版に切り替え
}
```

#### ❌ **3. Phase4メソッドエラー**
```javascript
// 📍 確認: メソッド存在チェック
console.log(Object.getOwnPropertyNames(solver.__proto__).filter(n => n.includes('Phase4')));

// 🔧 簡易テスト
if (typeof solver.optimizePhase4PerformanceBit === 'function') {
    solver.optimizePhase4PerformanceBit();
}
```

---

## 🗺️ **重要メソッド位置マップ**

### Phase1（基盤）
- `findBoundaryCellsBit()` → **line 71**
- `generateConstraintsBit()` → **line 127** 
- `solveBoundaryConstraintsBit()` → **line 186** ⭐**最重要**

### Phase3（完全探索・確率）
- `generateConfigurationsBit()` → **line 4123**
- `calculateCellProbabilitiesBit()` → **line 4587** ⭐**確率計算**
- `enumerateValidConfigsBit()` → **line 4985** ⭐**完全探索**

### Phase4（高度最適化）
- `optimizePhase4PerformanceBit()` → **line 10419**
- `implementDynamicStrategySelectionBit()` → **line 9782**
- `integrateRealTimeGameplayBit()` → **line 10063**

---

## ⚡ **即座実行テストコード**

### 🧪 基本動作テスト（コピペ用）
```javascript
// システム初期化
const game = {
    rows: 9, cols: 9, mineCount: 10,
    revealed: Array(9).fill().map(() => Array(9).fill(false)),
    flagged: Array(9).fill().map(() => Array(9).fill(false)),
    mines: Array(9).fill().map(() => Array(9).fill(false))
};
const bitSystem = new BitMinesweeperSystem(9, 9);
const solver = new SimpleBitCSP(game, bitSystem);

// Phase1テスト
console.log('Phase1境界セル:', solver.findBoundaryCellsBit());

// Phase3テスト（確率計算）
const result = solver.solveBoundaryConstraintsBit();
console.log('確率結果:', result.probabilities);

// Phase4テスト
if (typeof solver.optimizePhase4PerformanceBit === 'function') {
    console.log('Phase4動作OK');
} else {
    console.error('Phase4メソッドなし');
}
```

### 🏆 最終統合テスト（最重要）
```bash
# ブラウザでこのファイルを開いて「Phase4最終統合テスト実行」をクリック
open /Users/jimba_toparz/work/game/mine_web_sumaho/products/pc-pro/test-phase4-6.html
```

---

## 🔧 **修正時の必須チェック項目**

### ✅ **修正前チェック**
1. `simple-bit-csp.js`をバックアップ
2. 問題箇所の行数確認
3. 影響範囲の把握

### ✅ **修正後チェック**  
1. ブラウザコンソールでエラーなし
2. `test-phase4-6.html`で統合テスト実行
3. 性能劣化なし（実行時間測定）

### ⚠️ **絶対触るな箇所**
- Phase1-3の基盤実装（line 1-7500）
- ビット演算基本メソッド
- クラス名・メソッド名

---

## 🎯 **修正パターン別対応法**

### 🔄 **戻り値形式エラー**
```javascript
// 標準形式に合わせる
return {
    probabilities: new Map(),     // Map形式必須
    solutions: 0,                 // 数値
    executionTime: 0,            // ms
    boundaryCells: [],           // 配列
    performance: {}              // オブジェクト
};
```

### ⏱️ **パフォーマンス問題**
```javascript
// タイムアウト追加
const startTime = performance.now();
if (performance.now() - startTime > 5000) {
    console.warn('タイムアウト');
    return fallbackResult;
}
```

### 💾 **メモリ問題**
```javascript
// メモリ制限チェック
if (performance.memory && 
    performance.memory.usedJSHeapSize > 100 * 1024 * 1024) {
    console.warn('メモリ使用量過大');
    return;
}
```

---

## 📞 **緊急時のフォールバック**

### 🔄 従来版への切り替え
```javascript
// Phase4で問題が発生した場合、従来版を使用
if (phase4Failed) {
    console.warn('Phase4失敗、従来版に切り替え');
    // modules/csp-solver.js の CSPSolver を使用
}
```

### 🛡️ エラー時の安全な戻り値
```javascript
// エラー時は安全なデフォルト値を返す
catch (error) {
    console.error('エラー:', error);
    return {
        probabilities: new Map(),
        solutions: 0,
        executionTime: 0,
        boundaryCells: [],
        error: error.message
    };
}
```

---

## 📱 **最重要ファイル**

1. **`modules/simple-bit-csp.js`** - メインファイル（10,834行）
2. **`test-phase4-6.html`** - 最終テストページ
3. **`AI_DEBUG_GUIDE.md`** - 詳細デバッグガイド
4. **`PHASE4_COMPLETION.md`** - 完成報告書

**🎯 問題が発生したら、まず `test-phase4-6.html` で動作確認してください！**