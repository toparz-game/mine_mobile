// ビット演算による確率計算処理 - CSPソルバーの核心部分
// 制約伝播、局所制約完全性、完全探索をビット演算で高速化

class BitCSPProbabilityCalculator extends BitCSPOperations {
    constructor(game, bitSystem) {
        super(game, bitSystem);
        
        // 確率計算用の追加ビット配列
        this.mineBits = new Uint32Array(this.intsNeeded);
        this.safeBits = new Uint32Array(this.intsNeeded);
        this.unknownCellsBits = new Uint32Array(this.intsNeeded);
        this.borderCellsBits = new Uint32Array(this.intsNeeded);
        this.remainingCellsBits = new Uint32Array(this.intsNeeded);
        
        // 現在処理中のグループ
        this.currentProcessingGroup = null;
        
        // 結果配列（従来形式との互換性）
        this.probabilityResults = [];
        this.globalProbabilityResult = 0;
    }
    
    // メイン確率計算処理（BitCSP版）
    calculateProbabilities() {
        const startTime = performance.now();
        
        console.log('[BIT-CSP] Starting probability calculation with bit operations');
        
        // 統計情報をリセット
        this.resetStatistics();
        
        const rows = this.game.rows;
        const cols = this.game.cols;
        
        // 確率配列を初期化
        this.probabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        
        // 永続確率配列の初期化（初回のみ）
        if (!this.persistentProbabilities || this.persistentProbabilities.length === 0) {
            this.persistentProbabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        }
        
        // 統計情報を計算
        this.getUnknownCellsBits(this.unknownCellsBits);
        const unknownCells = this.bitsToCoordList(this.unknownCellsBits);
        const flaggedCount = this.countFlagsBits();
        const remainingMines = this.game.mineCount - flaggedCount;
        const globalProbability = unknownCells.length > 0 
            ? Math.round((remainingMines / unknownCells.length) * 100)
            : 0;
        
        console.log(`[BIT-CSP] Unknown cells: ${unknownCells.length}, Remaining mines: ${remainingMines}`);
        
        // 開示済みセルの確率を設定
        this.setRevealedCellProbabilities();
        
        // 境界セル（制約のあるセル）を取得
        this.getBorderCellsBits(this.borderCellsBits);
        const borderCells = this.bitsToCoordList(this.borderCellsBits);
        
        console.log(`[BIT-CSP] Border cells: ${borderCells.length}`);
        
        if (borderCells.length === 0) {
            // 境界セルがない場合（ゲーム開始時など）
            this.markAllAsConstraintFree(unknownCells);
            return { probabilities: this.probabilities, globalProbability };
        }
        
        // 制約グループに分割
        const constraintGroups = this.partitionIntoConstraintGroupsBits(borderCells);
        console.log(`[BIT-CSP] Constraint groups: ${constraintGroups.length}`);
        
        // フェーズ1: 制約伝播のみ適用
        let foundActionableCell = this.applyConstraintPropagationPhase(constraintGroups);
        
        if (foundActionableCell) {
            console.log('[BIT-CSP] Actionable cells found in constraint propagation phase');
        } else {
            // フェーズ2: 完全探索
            console.log('[BIT-CSP] Starting exhaustive search phase');
            this.applyExhaustiveSearchPhase(constraintGroups);
        }
        
        // 制約外セルを処理
        this.processConstraintFreeCells(unknownCells);
        
        const endTime = performance.now();
        console.log(`[BIT-CSP] Total calculation time: ${(endTime - startTime).toFixed(2)}ms`);
        this.logPerformanceStats();
        
        return { probabilities: this.probabilities, globalProbability };
    }
    
    // 制約伝播フェーズ（ビット演算版）
    applyConstraintPropagationPhase(constraintGroups) {
        let foundActionableCell = false;
        
        for (let i = 0; i < constraintGroups.length; i++) {
            const group = constraintGroups[i];
            this.currentProcessingGroup = group;
            
            const constraints = this.generateConstraintsFromGroup(group);
            if (constraints.length === 0) continue;
            
            console.log(`[BIT-CSP] Processing group ${i + 1}/${constraintGroups.length} with ${group.length} cells, ${constraints.length} constraints`);
            
            const hasActionable = this.applyConstraintPropagationBits(constraints, group);
            if (hasActionable) {
                foundActionableCell = true;
                this.constraintPropagationOnly++;
            }
        }
        
        return foundActionableCell;
    }
    
    // 完全探索フェーズ（ビット演算版）
    applyExhaustiveSearchPhase(constraintGroups) {
        let phase2ActionableFound = false;
        
        for (let i = 0; i < constraintGroups.length && !phase2ActionableFound; i++) {
            const group = constraintGroups[i];
            this.currentProcessingGroup = group;
            
            console.log(`[BIT-CSP] Exhaustive search for group ${i + 1}/${constraintGroups.length}`);
            
            const hasActionable = this.solveConstraintGroupBits(group, true);
            if (hasActionable) {
                phase2ActionableFound = true;
                console.log(`[BIT-CSP] Actionable cells found in exhaustive search`);
            }
        }
    }
    
    // ビット演算による制約伝播
    applyConstraintPropagationBits(constraints, groupCells) {
        console.log(`[BIT-CSP] Applying constraint propagation with ${constraints.length} constraints`);
        
        let changed = true;
        let hasActionableCell = false;
        
        // 確定セル管理用ビット配列
        this.clearBits(this.mineBits);
        this.clearBits(this.safeBits);
        
        while (changed) {
            changed = false;
            
            for (const constraint of constraints) {
                // 制約セルをビット配列に変換
                this.coordListToBits(constraint.cells, this.constraintMaskBits);
                
                // 既確定セルを除外（安全確定 | 地雷確定セル）
                this.orBits(this.safeBits, this.mineBits, this.tempBits1);
                this.andBits(this.constraintMaskBits, this.tempBits1, this.tempBits2);
                this.xorBits(this.constraintMaskBits, this.tempBits2, this.remainingCellsBits);
                
                const remainingCount = this.popCountBits(this.remainingCellsBits);
                
                // 既に確定した地雷数をカウント
                this.andBits(this.constraintMaskBits, this.mineBits, this.tempBits3);
                const confirmedMines = this.popCountBits(this.tempBits3);
                
                const neededMines = constraint.expectedMines - confirmedMines;
                
                // 全て地雷確定の場合
                if (remainingCount === neededMines && remainingCount > 0) {
                    this.orBits(this.mineBits, this.remainingCellsBits, this.mineBits);
                    changed = true;
                    hasActionableCell = true;
                    
                    // 確率配列に反映
                    const mineCells = this.bitsToCoordList(this.remainingCellsBits);
                    for (const cell of mineCells) {
                        this.probabilities[cell.row][cell.col] = 100;
                        this.persistentProbabilities[cell.row][cell.col] = 100;
                    }
                    
                    console.log(`[BIT-CSP] Constraint propagation: ${mineCells.length} cells marked as 100% mines`);
                }
                // 全て安全確定の場合
                else if (neededMines === 0 && remainingCount > 0) {
                    this.orBits(this.safeBits, this.remainingCellsBits, this.safeBits);
                    changed = true;
                    hasActionableCell = true;
                    
                    // 確率配列に反映
                    const safeCells = this.bitsToCoordList(this.remainingCellsBits);
                    for (const cell of safeCells) {
                        this.probabilities[cell.row][cell.col] = 0;
                        this.persistentProbabilities[cell.row][cell.col] = 0;
                    }
                    
                    console.log(`[BIT-CSP] Constraint propagation: ${safeCells.length} cells marked as 0% safe`);
                }
            }
        }
        
        return hasActionableCell;
    }
    
    // 制約グループの完全探索（ビット演算版）
    solveConstraintGroupBits(groupCells, skipConstraintPropagation = false) {
        // 上限撤廃により、完全探索は常に実行される
        
        const constraints = this.generateConstraintsFromGroup(groupCells);
        if (constraints.length === 0) return false;
        
        console.log(`[BIT-CSP] Exhaustive search: ${groupCells.length} cells, ${constraints.length} constraints`);
        
        // 制約伝播で事前処理（スキップされていない場合）
        let hasActionable = false;
        if (!skipConstraintPropagation) {
            hasActionable = this.applyConstraintPropagationBits(constraints, groupCells);
            if (hasActionable) {
                console.log('[BIT-CSP] Constraint propagation found actionable cells');
                return true;
            }
        }
        
        // 残り地雷数を計算
        const flaggedInGroup = this.countFlaggedInGroup(groupCells);
        const totalGroupMines = this.calculateTotalGroupMines(constraints);
        const remainingMines = totalGroupMines - flaggedInGroup;
        
        // 未確定セルを抽出
        const undeterminedCells = groupCells.filter(cell => 
            this.probabilities[cell.row][cell.col] === -1 && 
            !this.game.flagged[cell.row][cell.col]
        );
        
        console.log(`[BIT-CSP] Undetermined cells: ${undeterminedCells.length}, Remaining mines: ${remainingMines}`);
        
        if (undeterminedCells.length === 0) return false;
        
        // 全パターンを生成して制約チェック
        const validConfigurations = this.generateAllValidConfigurationsBits(undeterminedCells, remainingMines, constraints);
        
        console.log(`[BIT-CSP] Valid configurations: ${validConfigurations.length}`);
        
        if (validConfigurations.length === 0) {
            console.log('[BIT-CSP] No valid configurations found');
            return false;
        }
        
        // 確率を計算
        const probabilities = this.calculateProbabilitiesFromConfigurationsBits(undeterminedCells, validConfigurations);
        
        // 結果を確率配列に反映
        hasActionable = this.applyProbabilityResults(probabilities, undeterminedCells);
        
        this.totalExhaustiveSearches++;
        
        return hasActionable;
    }
    
    // 局所制約完全性（ビット演算版）
    solveLocalCompletenessBits(groupCells) {
        if (groupCells.length > this.maxLocalCompletenessSize) {
            console.log(`[BIT-CSP] Group too large for local completeness: ${groupCells.length} > ${this.maxLocalCompletenessSize}`);
            // 制約外としてマーク
            for (const cell of groupCells) {
                if (this.probabilities[cell.row][cell.col] === -1) {
                    this.probabilities[cell.row][cell.col] = -2;
                }
            }
            return false;
        }
        
        console.log(`[BIT-CSP] Local completeness search: ${groupCells.length} cells`);
        
        const constraints = this.generateConstraintsFromGroup(groupCells);
        if (constraints.length === 0) return false;
        
        // 小グループなので複数の地雷数で探索
        const maxPossibleMines = Math.min(groupCells.length, this.game.mineCount);
        let allValidConfigurations = [];
        
        for (let mineCount = 0; mineCount <= maxPossibleMines; mineCount++) {
            const configurations = this.generateAllValidConfigurationsBits(groupCells, mineCount, constraints);
            allValidConfigurations.push(...configurations);
            
            if (allValidConfigurations.length > this.maxValidConfigs) {
                console.log(`[BIT-CSP] Too many configurations: ${allValidConfigurations.length}`);
                break;
            }
        }
        
        if (allValidConfigurations.length === 0) return false;
        
        // 確率計算
        const probabilities = this.calculateProbabilitiesFromConfigurationsBits(groupCells, allValidConfigurations);
        
        // 結果を反映
        const hasActionable = this.applyProbabilityResults(probabilities, groupCells);
        
        this.localCompletenessSuccess++;
        
        return hasActionable;
    }
    
    // 全有効配置を生成（ビット演算版）
    generateAllValidConfigurationsBits(cells, mineCount, constraints) {
        const validConfigurations = [];
        
        if (mineCount > cells.length || mineCount < 0) {
            return validConfigurations;
        }
        
        // 組み合わせ生成の初期化
        this.initCombinationBits(cells, mineCount);
        
        do {
            // 制約チェック（ビット演算）
            if (this.checkAllConstraintsBits(constraints, this.combinationBits)) {
                const config = new Uint32Array(this.intsNeeded);
                this.copyBits(this.combinationBits, config);
                validConfigurations.push(config);
                
                if (validConfigurations.length > this.maxValidConfigs) {
                    console.log(`[BIT-CSP] Configuration limit reached: ${this.maxValidConfigs}`);
                    break;
                }
            }
            
        } while (this.nextCombinationBits(cells, mineCount));
        
        this.totalConfigurations += this.calculateTotalCombinations(cells.length, mineCount);
        
        return validConfigurations;
    }
    
    // 初期組み合わせビットを設定
    initCombinationBits(cells, mineCount) {
        this.clearBits(this.combinationBits);
        for (let i = 0; i < Math.min(mineCount, cells.length); i++) {
            const coord = cells[i];
            this.setBit(this.combinationBits, coord.row, coord.col, true);
        }
    }
    
    // 全制約をチェック（ビット演算版）
    checkAllConstraintsBits(constraints, mineCombinationBits) {
        for (const constraint of constraints) {
            this.coordListToBits(constraint.cells, this.constraintMaskBits);
            this.andBits(this.constraintMaskBits, mineCombinationBits, this.tempBits1);
            
            const actualMines = this.popCountBits(this.tempBits1);
            if (actualMines !== constraint.expectedMines) {
                return false;
            }
        }
        return true;
    }
    
    // 配置から確率を計算（ビット演算版）
    calculateProbabilitiesFromConfigurationsBits(cells, validConfigurations) {
        const cellProbabilities = new Map();
        
        // 初期化
        for (const cell of cells) {
            cellProbabilities.set(`${cell.row},${cell.col}`, 0);
        }
        
        // 各配置で地雷カウント
        for (const config of validConfigurations) {
            for (const cell of cells) {
                if (this.getBit(config, cell.row, cell.col)) {
                    const key = `${cell.row},${cell.col}`;
                    cellProbabilities.set(key, cellProbabilities.get(key) + 1);
                }
            }
        }
        
        // パーセンテージに変換
        const totalConfigs = validConfigurations.length;
        if (totalConfigs > 0) {
            for (const [key, count] of cellProbabilities) {
                const probability = Math.round((count / totalConfigs) * 100);
                cellProbabilities.set(key, probability);
            }
        }
        
        return cellProbabilities;
    }
    
    // 確率結果を適用
    applyProbabilityResults(probabilities, cells) {
        let hasActionable = false;
        
        for (const cell of cells) {
            const key = `${cell.row},${cell.col}`;
            const probability = probabilities.get(key);
            
            if (probability !== undefined) {
                this.probabilities[cell.row][cell.col] = probability;
                
                // 0%または100%の場合は永続化
                if (probability === 0 || probability === 100) {
                    this.persistentProbabilities[cell.row][cell.col] = probability;
                    hasActionable = true;
                }
            }
        }
        
        return hasActionable;
    }
    
    // ヘルパーメソッド
    setRevealedCellProbabilities() {
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (this.game.revealed[row][col]) {
                    this.probabilities[row][col] = 0;
                    this.persistentProbabilities[row][col] = -1;
                } else if (this.game.flagged[row][col]) {
                    this.probabilities[row][col] = 100;
                    this.persistentProbabilities[row][col] = -1;
                } else if (this.persistentProbabilities[row][col] === 0 || 
                          this.persistentProbabilities[row][col] === 100) {
                    this.probabilities[row][col] = this.persistentProbabilities[row][col];
                }
            }
        }
    }
    
    countFlagsBits() {
        return this.popCountBits(this.bitSystem.flaggedBits);
    }
    
    countFlaggedInGroup(groupCells) {
        let count = 0;
        for (const cell of groupCells) {
            if (this.game.flagged[cell.row][cell.col]) count++;
        }
        return count;
    }
    
    calculateTotalGroupMines(constraints) {
        // 制約から推定される地雷総数（簡略化）
        let totalMines = 0;
        for (const constraint of constraints) {
            totalMines += constraint.expectedMines;
        }
        return Math.min(totalMines, this.game.mineCount);
    }
    
    calculateTotalCombinations(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return Math.round(result);
    }
    
    markAllAsConstraintFree(unknownCells) {
        for (const cell of unknownCells) {
            if (this.probabilities[cell.row][cell.col] === -1) {
                this.probabilities[cell.row][cell.col] = -2;
            }
        }
    }
    
    processConstraintFreeCells(unknownCells) {
        // 制約外セル（-2）の処理は従来通り
        for (const cell of unknownCells) {
            if (this.probabilities[cell.row][cell.col] === -1) {
                this.probabilities[cell.row][cell.col] = -2;
            }
        }
    }
    
    partitionIntoConstraintGroupsBits(borderCells) {
        // 簡略化されたグループ分割（実際はより複雑）
        return [borderCells]; // 全体を1つのグループとして処理
    }
}