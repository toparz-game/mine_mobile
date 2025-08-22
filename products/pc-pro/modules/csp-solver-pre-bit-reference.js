// ========================================
// ビット管理化前のCSPソルバー実装 (参照用)
// コミット: a5e2a5e pc-pro完成
// ========================================
// 
// この実装は完成度が高く、早期終了ロジックが正しく動作していました。
// ビット版での問題が発生した際の参照用として保存しています。
//
// 重要な早期終了ロジック:
// 1. solveIndependentSubset() で確定マス発見時に即座にreturn true
// 2. 上位ループで確定マス発見時にbreak処理
// 3. markRemainingCellsAsInterrupted()で残りセルを中断マーク
//
// 参照用コマンド:
//   git show a5e2a5e:products/pc-pro/modules/csp-solver.js
// ========================================

// ビット化前の完全なコードは以下のコマンドで確認可能:
// git show a5e2a5e:products/pc-pro/modules/csp-solver.js

// 重要な早期終了ロジック部分のみ抜粋:

/*
// solveIndependentSubset の早期終了ロジック (行636-664)
for (let config = 0; config < totalConfigs; config++) {
    const mines = [];
    for (let i = 0; i < subsetCells.length; i++) {
        if ((config >> i) & 1) {
            mines.push(i);
        }
    }
    
    if (this.isValidConfigurationForSubset(mines, subset.constraints)) {
        validConfigurations.push(config);
    }
}

// 確率計算とアクションable判定 (行665-698)  
let hasActionable = false;
for (let i = 0; i < subsetCells.length; i++) {
    let mineCount = 0;
    for (const config of validConfigurations) {
        if ((config >> i) & 1) {
            mineCount++;
        }
    }
    
    const probability = validConfigurations.length > 0 
        ? Math.round((mineCount / validConfigurations.length) * 100) 
        : 50;
    
    const row = subsetCells[i].row;
    const col = subsetCells[i].col;
    this.probabilities[row][col] = probability;
    
    // 0%または100%の場合、永続確率を保存
    if (probability === 0 || probability === 100) {
        this.persistentProbabilities[row][col] = probability;
        hasActionable = true;
    }
}

return hasActionable;

// 呼び出し側での早期終了 (行1129-1138)
const hasActionableFromSubset = this.solveIndependentSubset(subset, group);
if (hasActionableFromSubset) {
    console.log('[LOCAL COMPLETENESS] Found actionable cells in independent subset');
    this.markRemainingCellsAsInterrupted(group);
    this.localCompletenessSuccess = 1;
    return true; // 確定マスが見つかったので早期終了
}
*/

console.log('参照用ファイル: ビット管理化前のCSPソルバー実装');
console.log('完全なコードは: git show a5e2a5e:products/pc-pro/modules/csp-solver.js');