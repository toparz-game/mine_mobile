// ビット演算による高速セット操作 - BitCSPSolverの拡張
// 制約充足問題の計算を高速化する専用ビット演算

class BitCSPOperations extends BitCSPSolver {
    constructor(game, bitSystem) {
        super(game, bitSystem);
        
        // 制約処理用の追加ビット配列
        this.constraintMaskBits = new Uint32Array(this.intsNeeded);
        this.satisfiedConstraintBits = new Uint32Array(this.intsNeeded);
        this.violatedConstraintBits = new Uint32Array(this.intsNeeded);
        
        // 組み合わせ生成用
        this.combinationBits = new Uint32Array(this.intsNeeded);
        this.nextCombinationBits = new Uint32Array(this.intsNeeded);
        
        // 制約グループ管理
        this.groupConstraints = new Map();
        this.groupResults = new Map();
    }
    
    // セルグループから制約を生成（ビット演算版）
    generateConstraintsFromGroup(cellCoords) {
        const constraints = [];
        this.coordListToBits(cellCoords, this.candidateBits);
        
        // 各開示済みセルについて制約を生成
        for (let i = 0; i < this.intsNeeded; i++) {
            let revealedChunk = this.bitSystem.revealedBits[i];
            let bitIndex = 0;
            
            while (revealedChunk !== 0) {
                if (revealedChunk & 1) {
                    const bitPos = i * this.bitsPerInt + bitIndex;
                    if (bitPos < this.totalCells) {
                        const coord = this.bitPosToCoord(bitPos);
                        const constraint = this.generateConstraintForCell(coord, cellCoords);
                        if (constraint && constraint.cells.length > 0) {
                            constraints.push(constraint);
                        }
                    }
                }
                revealedChunk >>>= 1;
                bitIndex++;
            }
        }
        
        return constraints;
    }
    
    // 単一セルの制約を生成
    generateConstraintForCell(revealedCoord, groupCells) {
        const { row, col } = revealedCoord;
        if (!this.game.revealed[row][col] || this.game.board[row][col] === 0) {
            return null;
        }
        
        const expectedMines = this.game.board[row][col];
        const neighborCells = [];
        
        // 周囲8マスをチェック
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (this.isValidCell(newRow, newCol) && 
                    groupCells.some(cell => cell.row === newRow && cell.col === newCol)) {
                    neighborCells.push({ row: newRow, col: newCol });
                }
            }
        }
        
        if (neighborCells.length === 0) return null;
        
        // 既に旗が立っている隣接セル数を計算
        let flaggedNeighbors = 0;
        for (const neighbor of neighborCells) {
            if (this.game.flagged[neighbor.row][neighbor.col]) {
                flaggedNeighbors++;
            }
        }
        
        // 旗が立っていないセルのみを制約対象とする
        const constraintCells = neighborCells.filter(cell => 
            !this.game.flagged[cell.row][cell.col]
        );
        
        return {
            cells: constraintCells,
            expectedMines: expectedMines - flaggedNeighbors,
            sourceCell: { row, col }
        };
    }
    
    // 制約充足チェック（ビット演算版）
    checkConstraintsSatisfactionBits(constraints, mineCombinationBits) {
        for (const constraint of constraints) {
            // 制約セルをビット配列に変換
            this.coordListToBits(constraint.cells, this.constraintMaskBits);
            
            // 制約範囲内の地雷数をカウント
            this.andBits(this.constraintMaskBits, mineCombinationBits, this.tempBits1);
            const actualMines = this.popCountBits(this.tempBits1);
            
            if (actualMines !== constraint.expectedMines) {
                return false;
            }
        }
        return true;
    }
    
    // 組み合わせ列挙（ビット演算による高速化）
    generateMiningCombinations(unknownCells, mineCount) {
        const validCombinations = [];
        const totalCells = unknownCells.length;
        
        if (mineCount > totalCells || mineCount < 0) {
            return validCombinations;
        }
        
        // 初期組み合わせ（最初のmineCount個のビットを立てる）
        this.clearBits(this.combinationBits);
        for (let i = 0; i < mineCount; i++) {
            const coord = unknownCells[i];
            this.setBit(this.combinationBits, coord.row, coord.col, true);
        }
        
        do {
            // 現在の組み合わせをコピーして保存
            const combination = new Uint32Array(this.intsNeeded);
            this.copyBits(this.combinationBits, combination);
            validCombinations.push(combination);
            
        } while (this.nextCombination(unknownCells, mineCount));
        
        return validCombinations;
    }
    
    // 次の組み合わせを生成（辞書順）
    nextCombination(unknownCells, mineCount) {
        const cellCount = unknownCells.length;
        const setCells = [];
        
        // 現在セットされているセルの位置を取得
        for (let i = 0; i < cellCount; i++) {
            const coord = unknownCells[i];
            if (this.getBit(this.combinationBits, coord.row, coord.col)) {
                setCells.push(i);
            }
        }
        
        // 次の組み合わせを計算
        let i = mineCount - 1;
        while (i >= 0) {
            if (setCells[i] < cellCount - mineCount + i) {
                setCells[i]++;
                
                // 後続の位置を更新
                for (let j = i + 1; j < mineCount; j++) {
                    setCells[j] = setCells[j - 1] + 1;
                }
                
                // ビット配列を更新
                this.clearBits(this.combinationBits);
                for (let j = 0; j < mineCount; j++) {
                    const coord = unknownCells[setCells[j]];
                    this.setBit(this.combinationBits, coord.row, coord.col, true);
                }
                
                return true;
            }
            i--;
        }
        
        return false; // 全ての組み合わせを生成完了
    }
    
    // 確率計算（ビット演算による高速化）
    calculateProbabilitiesBits(constraints, unknownCells, remainingMines) {
        const cellProbabilities = new Map();
        const validConfigurations = [];
        
        // 各セルの確率を初期化
        for (const cell of unknownCells) {
            cellProbabilities.set(`${cell.row},${cell.col}`, 0);
        }
        
        // 全ての有効な地雷配置を列挙
        const combinations = this.generateMiningCombinations(unknownCells, remainingMines);
        
        for (const combination of combinations) {
            if (this.checkConstraintsSatisfactionBits(constraints, combination)) {
                validConfigurations.push(combination);
                
                // 各セルが地雷である回数をカウント
                for (const cell of unknownCells) {
                    if (this.getBit(combination, cell.row, cell.col)) {
                        const key = `${cell.row},${cell.col}`;
                        cellProbabilities.set(key, cellProbabilities.get(key) + 1);
                    }
                }
            }
        }
        
        // 確率に変換（パーセンテージ）
        const totalValidConfigs = validConfigurations.length;
        if (totalValidConfigs > 0) {
            for (const [key, count] of cellProbabilities) {
                const probability = Math.round((count / totalValidConfigs) * 100);
                cellProbabilities.set(key, probability);
            }
        }
        
        return {
            probabilities: cellProbabilities,
            validConfigurations: validConfigurations,
            totalConfigurations: combinations.length
        };
    }
    
    // 制約伝播（ビット演算による高速処理）
    propagateConstraintsBits(constraints, unknownCells) {
        let changed = true;
        const determinedCells = new Map(); // セル -> 地雷かどうか
        
        while (changed) {
            changed = false;
            
            for (const constraint of constraints) {
                const { cells, expectedMines } = constraint;
                
                // 未確定のセルをフィルタ
                const undeterminedCells = cells.filter(cell => 
                    !determinedCells.has(`${cell.row},${cell.col}`)
                );
                
                // 既に確定した地雷数をカウント
                let confirmedMines = 0;
                for (const cell of cells) {
                    const key = `${cell.row},${cell.col}`;
                    if (determinedCells.get(key) === true) {
                        confirmedMines++;
                    }
                }
                
                const remainingMines = expectedMines - confirmedMines;
                const remainingCells = undeterminedCells.length;
                
                // 全て地雷の場合
                if (remainingMines === remainingCells && remainingCells > 0) {
                    for (const cell of undeterminedCells) {
                        determinedCells.set(`${cell.row},${cell.col}`, true);
                        changed = true;
                    }
                }
                // 全て安全の場合  
                else if (remainingMines === 0 && remainingCells > 0) {
                    for (const cell of undeterminedCells) {
                        determinedCells.set(`${cell.row},${cell.col}`, false);
                        changed = true;
                    }
                }
            }
        }
        
        return determinedCells;
    }
    
    // 結果をビット配列に変換
    resultsToBits(determinedCells, mineBits, safeBits) {
        this.clearBits(mineBits);
        this.clearBits(safeBits);
        
        for (const [key, isMine] of determinedCells) {
            const [row, col] = key.split(',').map(Number);
            if (isMine) {
                this.setBit(mineBits, row, col, true);
            } else {
                this.setBit(safeBits, row, col, true);
            }
        }
    }
    
    // グループキャッシュの管理
    cacheGroupResult(groupHash, result) {
        this.groupResults.set(groupHash, {
            result: result,
            timestamp: Date.now()
        });
    }
    
    getCachedGroupResult(groupHash) {
        const cached = this.groupResults.get(groupHash);
        if (cached) {
            this.cacheHits++;
            return cached.result;
        }
        return null;
    }
    
    // グループのハッシュ値を計算
    calculateGroupHash(cellCoords) {
        // セル座標をソートしてハッシュ化
        const sorted = cellCoords
            .map(c => `${c.row},${c.col}`)
            .sort()
            .join('|');
        
        // 盤面状態も含める
        let stateHash = 0;
        for (const coord of cellCoords) {
            stateHash = (stateHash * 31 + 
                        (this.game.revealed[coord.row][coord.col] ? 1 : 0) * 2 +
                        (this.game.flagged[coord.row][coord.col] ? 1 : 0)) >>> 0;
        }
        
        return `${sorted}_${stateHash}`;
    }
    
    // パフォーマンス測定付きメソッド実行
    executeWithTiming(methodName, operation) {
        const startTime = performance.now();
        const result = operation();
        const endTime = performance.now();
        
        console.log(`[BIT-CSP] ${methodName}: ${(endTime - startTime).toFixed(2)}ms`);
        return result;
    }
}