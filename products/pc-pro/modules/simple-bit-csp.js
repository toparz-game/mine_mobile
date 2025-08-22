// 段階的テスト用 - シンプルなビットCSPソルバー
// まずは制約伝播のみをテスト

class SimpleBitCSP {
    constructor(game, bitSystem) {
        this.game = game;
        this.bitSystem = bitSystem;
        this.rows = bitSystem.rows;
        this.cols = bitSystem.cols;
        this.totalCells = bitSystem.totalCells;
        this.bitsPerInt = bitSystem.bitsPerInt;
        this.intsNeeded = bitSystem.intsNeeded;
        
        // 基本的なビット配列のみ
        this.tempBits1 = new Uint32Array(this.intsNeeded);
        this.tempBits2 = new Uint32Array(this.intsNeeded);
        this.tempBits3 = new Uint32Array(this.intsNeeded);
        
        // 確率配列（従来形式との互換性）
        this.probabilities = [];
        this.persistentProbabilities = [];
        
        console.log('[SIMPLE-BIT-CSP] Initialized successfully');
    }
    
    // 座標をビット位置に変換
    coordToBitPos(row, col) {
        return this.bitSystem.coordToBitPos(row, col);
    }
    
    // ビット位置を座標に変換
    bitPosToCoord(bitPos) {
        return this.bitSystem.bitPosToCoord(bitPos);
    }
    
    // ビットを設定
    setBit(bitArray, row, col, value) {
        const bitPos = this.coordToBitPos(row, col);
        const arrayIndex = Math.floor(bitPos / this.bitsPerInt);
        const bitIndex = bitPos % this.bitsPerInt;
        
        if (value) {
            bitArray[arrayIndex] |= (1 << bitIndex);
        } else {
            bitArray[arrayIndex] &= ~(1 << bitIndex);
        }
    }
    
    // ビットを取得
    getBit(bitArray, row, col) {
        const bitPos = this.coordToBitPos(row, col);
        const arrayIndex = Math.floor(bitPos / this.bitsPerInt);
        const bitIndex = bitPos % this.bitsPerInt;
        return (bitArray[arrayIndex] & (1 << bitIndex)) !== 0;
    }
    
    // ビット配列をクリア
    clearBits(bitArray) {
        bitArray.fill(0);
    }
    
    // ビット配列のポピュレーションカウント
    popCountBits(bitArray) {
        let count = 0;
        for (let i = 0; i < this.intsNeeded; i++) {
            let n = bitArray[i];
            while (n) {
                count++;
                n &= n - 1;
            }
        }
        return count;
    }
    
    // 未知セルの取得（従来版）
    getUnknownCells() {
        const unknownCells = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.game.revealed[row][col] && !this.game.flagged[row][col]) {
                    unknownCells.push({ row, col });
                }
            }
        }
        return unknownCells;
    }
    
    // 境界セルの取得（従来版）
    getBorderCells() {
        const borderCells = [];
        const visited = new Set();
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    // この開示済みセルの周囲をチェック
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const newRow = row + dr;
                            const newCol = col + dc;
                            const key = `${newRow},${newCol}`;
                            
                            if (newRow >= 0 && newRow < this.rows && 
                                newCol >= 0 && newCol < this.cols &&
                                !this.game.revealed[newRow][newCol] &&
                                !visited.has(key)) {
                                
                                borderCells.push({ row: newRow, col: newCol });
                                visited.add(key);
                            }
                        }
                    }
                }
            }
        }
        
        return borderCells;
    }
    
    // 制約生成（シンプル版）
    generateConstraints(cells) {
        const constraints = [];
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    const neighborCells = [];
                    
                    // 周囲8マスをチェック
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const newRow = row + dr;
                            const newCol = col + dc;
                            
                            if (newRow >= 0 && newRow < this.rows && 
                                newCol >= 0 && newCol < this.cols &&
                                cells.some(cell => cell.row === newRow && cell.col === newCol)) {
                                neighborCells.push({ row: newRow, col: newCol });
                            }
                        }
                    }
                    
                    if (neighborCells.length > 0) {
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
                        
                        if (constraintCells.length > 0) {
                            constraints.push({
                                cells: constraintCells,
                                expectedMines: this.game.board[row][col] - flaggedNeighbors,
                                sourceCell: { row, col }
                            });
                        }
                    }
                }
            }
        }
        
        return constraints;
    }
    
    // シンプルな制約伝播
    applySimpleConstraintPropagation(constraints) {
        console.log(`[SIMPLE-BIT-CSP] Applying constraint propagation with ${constraints.length} constraints`);
        
        let changed = true;
        let foundSafeCells = [];
        let foundMineCells = [];
        
        while (changed) {
            changed = false;
            
            for (const constraint of constraints) {
                const { cells, expectedMines } = constraint;
                
                // 未確定のセルをフィルタ
                const undeterminedCells = cells.filter(cell => 
                    this.probabilities[cell.row] === undefined || 
                    this.probabilities[cell.row][cell.col] === undefined ||
                    this.probabilities[cell.row][cell.col] === -1
                );
                
                // 既に確定した地雷数をカウント
                let confirmedMines = 0;
                for (const cell of cells) {
                    if (this.probabilities[cell.row] && this.probabilities[cell.row][cell.col] === 100) {
                        confirmedMines++;
                    }
                }
                
                const neededMines = expectedMines - confirmedMines;
                
                // 全て地雷確定の場合
                if (undeterminedCells.length === neededMines && neededMines > 0) {
                    for (const cell of undeterminedCells) {
                        this.probabilities[cell.row][cell.col] = 100;
                        foundMineCells.push(cell);
                        changed = true;
                    }
                    console.log(`[SIMPLE-BIT-CSP] Found ${undeterminedCells.length} mine cells`);
                }
                // 全て安全確定の場合
                else if (neededMines === 0 && undeterminedCells.length > 0) {
                    for (const cell of undeterminedCells) {
                        this.probabilities[cell.row][cell.col] = 0;
                        foundSafeCells.push(cell);
                        changed = true;
                    }
                    console.log(`[SIMPLE-BIT-CSP] Found ${undeterminedCells.length} safe cells`);
                }
            }
        }
        
        return foundSafeCells.length > 0 || foundMineCells.length > 0;
    }
    
    // メイン確率計算（シンプル版）
    calculateProbabilities() {
        console.log('[SIMPLE-BIT-CSP] Starting simple probability calculation');
        
        const rows = this.game.rows;
        const cols = this.game.cols;
        
        // 確率配列を初期化
        this.probabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        this.persistentProbabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        
        // 開示済みセルの確率を設定
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (this.game.revealed[row][col]) {
                    this.probabilities[row][col] = 0;
                } else if (this.game.flagged[row][col]) {
                    this.probabilities[row][col] = 100;
                }
            }
        }
        
        // 未知セルを取得
        const unknownCells = this.getUnknownCells();
        console.log(`[SIMPLE-BIT-CSP] Unknown cells: ${unknownCells.length}`);
        
        if (unknownCells.length === 0) {
            return { probabilities: this.probabilities, globalProbability: 0 };
        }
        
        // 境界セルを取得
        const borderCells = this.getBorderCells();
        console.log(`[SIMPLE-BIT-CSP] Border cells: ${borderCells.length}`);
        
        if (borderCells.length === 0) {
            // 境界セルがない場合、全て制約外
            for (const cell of unknownCells) {
                this.probabilities[cell.row][cell.col] = -2;
            }
            return { probabilities: this.probabilities, globalProbability: 50 };
        }
        
        // 制約を生成
        const constraints = this.generateConstraints(borderCells);
        console.log(`[SIMPLE-BIT-CSP] Generated ${constraints.length} constraints`);
        
        // 制約伝播を適用
        const foundActionable = this.applySimpleConstraintPropagation(constraints);
        
        if (foundActionable) {
            console.log('[SIMPLE-BIT-CSP] Found actionable cells through constraint propagation');
        } else {
            console.log('[SIMPLE-BIT-CSP] No actionable cells found');
        }
        
        // 残りのセルを制約外としてマーク
        for (const cell of unknownCells) {
            if (this.probabilities[cell.row][cell.col] === -1) {
                this.probabilities[cell.row][cell.col] = -2;
            }
        }
        
        // グローバル確率を計算
        const flaggedCount = this.countFlags();
        const remainingMines = this.game.mineCount - flaggedCount;
        const constraintFreeCount = unknownCells.filter(cell => 
            this.probabilities[cell.row][cell.col] === -2
        ).length;
        
        const globalProbability = constraintFreeCount > 0 
            ? Math.round((remainingMines / constraintFreeCount) * 100)
            : 0;
        
        console.log(`[SIMPLE-BIT-CSP] Calculation complete. Global probability: ${globalProbability}%`);
        
        return { probabilities: this.probabilities, globalProbability };
    }
    
    // 旗の数をカウント
    countFlags() {
        let count = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.flagged[row][col]) count++;
            }
        }
        return count;
    }
    
    // メモリ使用量（ダミー）
    getMemoryUsage() {
        return { reduction: 50 };
    }
}

// グローバル利用可能にする
window.SimpleBitCSP = SimpleBitCSP;