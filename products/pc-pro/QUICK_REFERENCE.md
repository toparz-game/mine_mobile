# 🚀 クイックリファレンス - プロジェクト修正用

## 📋 緊急修正用チートシート

### 🎯 **よくある問題TOP3と即座解決法**

#### ❌ **1. 確率が表示されない**
```javascript
// 📍 確認箇所: line 991-1106 (calculateProbabilities)
// 症状: 🎲ボタンを押しても確率が表示されない

// 🔧 即座デバッグ: コンソールで原因特定
console.log('Border cells:', borderCells.length);
console.log('Advanced calc success:', result.success);
console.log('Failure reason:', result.reason);

// ✅ 最も多い原因: 制約データ形式不一致
// 修正箇所: validateConfigurationBit() line 4410
const expectedCount = constraint.count || constraint.expectedMines || 0;
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

## ⏱️ **処理時間問題の原因確認ガイド**

### 🚨 **処理が重い・終わらない時の緊急チェック**

#### Step 1: 基本状況確認（最重要）
```javascript
// コンソールで実行 - 処理状況の即座確認
console.log('Border cells count:', borderCells ? borderCells.length : 'undefined');
console.log('Constraint groups:', constraintGroups ? constraintGroups.length : 'undefined');
console.log('Total configurations to check:', Math.pow(2, borderCells?.length || 0));

// 危険域判定
if (borderCells && borderCells.length > 29) {
    console.error('⚠️ CRITICAL: セル数過多 =', borderCells.length, '(上限29)');
    console.error('予想処理時間: 2^' + borderCells.length + ' = ', Math.pow(2, borderCells.length), '通り');
}
```

#### Step 2: 処理パフォーマンス監視
```javascript
// 実行時間計測コード（処理前に挿入）
const perfStart = performance.now();
let iterationCount = 0;

// 処理中のタイムアウト監視
const timeoutChecker = setInterval(() => {
    const elapsed = performance.now() - perfStart;
    console.log('経過時間:', Math.round(elapsed), 'ms, 反復回数:', iterationCount);
    
    if (elapsed > 5000) {
        console.error('⚠️ TIMEOUT: 5秒経過 - 処理停止推奨');
        clearInterval(timeoutChecker);
    }
}, 1000);
```

### 🎯 **処理時間問題の典型パターンと対策**

#### 🔥 **パターン1: 境界セル過多（最頻出）**
```javascript
// 📍 確認箇所: findBoundaryCellsBit() line 71
// 症状: 30個以上の境界セルで指数的増大

// 🔧 即座修正: セル数制限の強制実装
if (boundaryCells.length > 29) {
    console.warn('セル数制限適用:', boundaryCells.length, '→ 従来版に切り替え');
    return this.fallbackToOriginalSolver();
}

// ✅ 根本対策: 分割処理の実装確認
// 確認箇所: divideConstraintGroupsBit() line 8234
```

#### 🔄 **パターン2: 無限ループ・スタック**
```javascript
// 📍 確認箇所: enumerateValidConfigsBit() line 4985
// 症状: 同じ処理が永続的に繰り返される

// 🔧 デバッグ: ループカウンター追加
let loopCounter = 0;
const MAX_ITERATIONS = 1000000;

while (/* 処理条件 */) {
    if (++loopCounter > MAX_ITERATIONS) {
        console.error('無限ループ検出:', loopCounter);
        break;
    }
    // 既存の処理...
}
```

#### 💾 **パターン3: メモリリーク・蓄積**
```javascript
// 📍 確認箇所: Phase4最適化メソッド全般 line 9782-10550
// 症状: メモリ使用量が継続的に増加

// 🔧 即座チェック: メモリ監視
if (performance.memory) {
    const memMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    console.log('メモリ使用量:', memMB, 'MB');
    
    if (memMB > 100) {
        console.warn('⚠️ メモリ使用量過大 - リセット推奨');
        // キャッシュクリア等の処理
    }
}
```

### ⚡ **緊急時の処理停止・復旧方法**

#### 🛑 即座停止コード
```javascript
// ブラウザ開発者ツールで実行
// Method 1: タイムアウト強制設定
if (window.currentProcessingTimeout) {
    clearTimeout(window.currentProcessingTimeout);
    console.log('処理タイムアウト強制クリア');
}

// Method 2: 処理フラグ強制リセット
if (typeof solver !== 'undefined') {
    solver.forceStop = true;
    console.log('ソルバー強制停止フラグ設定');
}
```

#### 🔄 安全な復旧手順
```javascript
// 1. システム状態リセット
game.processingInProgress = false;
solver.currentOperation = null;

// 2. UI状態の復旧
document.getElementById('calculate-probabilities').disabled = false;
document.getElementById('loading-indicator').style.display = 'none';

// 3. エラー状態クリア
console.clear();
console.log('✅ システム復旧完了');
```

### 📊 **処理時間分析・予測ツール**

#### 処理時間予測計算機
```javascript
// 境界セル数から処理時間を予測
function predictProcessingTime(borderCellCount) {
    const configurations = Math.pow(2, borderCellCount);
    const estimatedMs = configurations / 100000; // 概算値
    
    console.log('🎯 処理予測:');
    console.log('- セル数:', borderCellCount);
    console.log('- 設定数:', configurations.toLocaleString());
    console.log('- 予想時間:', estimatedMs < 1000 ? 
        Math.round(estimatedMs) + 'ms' : 
        Math.round(estimatedMs/1000) + '秒');
        
    if (borderCellCount > 29) {
        console.error('⚠️ 危険: 処理不可能レベル');
    } else if (borderCellCount > 25) {
        console.warn('⚠️ 注意: 数秒要する可能性');
    }
    
    return estimatedMs;
}

// 使用例
predictProcessingTime(borderCells?.length || 0);
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