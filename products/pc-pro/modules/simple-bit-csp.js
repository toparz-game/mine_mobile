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
    
    // 隣接セル取得のビット化メソッド
    getNeighborCellsBit(row, col, targetBitArray, resultBitArray) {
        // resultBitArrayをクリア
        this.clearBits(resultBitArray);
        
        // 指定されたセルの8方向の隣接セルをチェック
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue; // 自分自身はスキップ
                
                const newRow = row + dr;
                const newCol = col + dc;
                
                // 盤面範囲内かチェック
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols) {
                    
                    // targetBitArrayに含まれているかチェック
                    if (this.getBit(targetBitArray, newRow, newCol)) {
                        this.setBit(resultBitArray, newRow, newCol, true);
                    }
                }
            }
        }
    }
    
    // 指定セルの隣接セル数をカウント（ビット化版）
    countNeighborsBit(row, col, targetBitArray) {
        let count = 0;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols &&
                    this.getBit(targetBitArray, newRow, newCol)) {
                    count++;
                }
            }
        }
        
        return count;
    }
    
    // ビット配列の基本演算メソッド
    
    // AND演算: result = bits1 & bits2
    andBits(bits1, bits2, result) {
        for (let i = 0; i < this.intsNeeded; i++) {
            result[i] = bits1[i] & bits2[i];
        }
    }
    
    // OR演算: result = bits1 | bits2
    orBits(bits1, bits2, result) {
        for (let i = 0; i < this.intsNeeded; i++) {
            result[i] = bits1[i] | bits2[i];
        }
    }
    
    // XOR演算: result = bits1 ^ bits2
    xorBits(bits1, bits2, result) {
        for (let i = 0; i < this.intsNeeded; i++) {
            result[i] = bits1[i] ^ bits2[i];
        }
    }
    
    // NOT演算: result = ~bits（有効な範囲のみ）
    notBits(bits, result) {
        for (let i = 0; i < this.intsNeeded; i++) {
            result[i] = ~bits[i];
        }
        // 最後のintで使用していない上位ビットをクリア
        const lastIntBits = this.totalCells % this.bitsPerInt;
        if (lastIntBits > 0 && this.intsNeeded > 0) {
            const mask = (1 << lastIntBits) - 1;
            result[this.intsNeeded - 1] &= mask;
        }
    }
    
    // ビット配列のコピー
    copyBits(source, dest) {
        for (let i = 0; i < this.intsNeeded; i++) {
            dest[i] = source[i];
        }
    }
    
    // ビット配列の比較（同じ内容かチェック）
    equalsBits(bits1, bits2) {
        for (let i = 0; i < this.intsNeeded; i++) {
            if (bits1[i] !== bits2[i]) {
                return false;
            }
        }
        return true;
    }
    
    // ビット配列が空かチェック
    isEmptyBits(bits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            if (bits[i] !== 0) {
                return false;
            }
        }
        return true;
    }
    
    // デバッグ用ビット表示メソッド
    
    // ビット配列を視覚的に表示（デバッグ用）
    debugPrintBits(bits, title = "ビット配列") {
        console.log(`=== ${title} ===`);
        
        let output = "";
        for (let row = 0; row < this.rows; row++) {
            let rowStr = "";
            for (let col = 0; col < this.cols; col++) {
                rowStr += this.getBit(bits, row, col) ? "1" : "0";
                if (col < this.cols - 1) rowStr += " ";
            }
            output += `${row.toString().padStart(2)}: ${rowStr}\n`;
        }
        console.log(output);
    }
    
    // ビット配列の統計情報を表示
    debugBitStats(bits, title = "統計情報") {
        const count = this.popCountBits(bits);
        const isEmpty = this.isEmptyBits(bits);
        const totalCells = this.rows * this.cols;
        const percentage = totalCells > 0 ? ((count / totalCells) * 100).toFixed(1) : "0.0";
        
        console.log(`=== ${title} ===`);
        console.log(`設定済みビット数: ${count}`);
        console.log(`総セル数: ${totalCells}`);
        console.log(`使用率: ${percentage}%`);
        console.log(`空配列: ${isEmpty ? "はい" : "いいえ"}`);
    }
    
    // 2つのビット配列の差分を表示
    debugCompareBits(bits1, bits2, title1 = "配列1", title2 = "配列2") {
        console.log(`=== ${title1} vs ${title2} の比較 ===`);
        
        let differences = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const bit1 = this.getBit(bits1, row, col);
                const bit2 = this.getBit(bits2, row, col);
                
                if (bit1 !== bit2) {
                    differences.push(`(${row},${col}): ${title1}=${bit1 ? 1 : 0}, ${title2}=${bit2 ? 1 : 0}`);
                }
            }
        }
        
        if (differences.length === 0) {
            console.log("完全一致");
        } else {
            console.log(`相違点 ${differences.length}個:`);
            differences.forEach(diff => console.log(`  ${diff}`));
        }
        
        return differences.length === 0;
    }
    
    // 座標リストからビット配列への変換（デバッグ用）
    coordsToBits(coords, bits) {
        this.clearBits(bits);
        for (const coord of coords) {
            this.setBit(bits, coord.row, coord.col, true);
        }
    }
    
    // ビット配列から座標リストへの変換（デバッグ用）
    bitsToCoords(bits) {
        const coords = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.getBit(bits, row, col)) {
                    coords.push({ row, col });
                }
            }
        }
        return coords;
    }
    
    // Phase1-2: 境界セル検出の部分ビット化
    
    // 未開セルのビットマップを生成
    getUnknownCellsBit(resultBits) {
        this.clearBits(resultBits);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // 未開かつ旗が立っていないセル
                if (!this.game.revealed[row][col] && !this.game.flagged[row][col]) {
                    this.setBit(resultBits, row, col, true);
                }
            }
        }
    }
    
    // 開示済みセルのビットマップを生成
    getRevealedCellsBit(resultBits) {
        this.clearBits(resultBits);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.revealed[row][col]) {
                    this.setBit(resultBits, row, col, true);
                }
            }
        }
    }
    
    // 数字セル（地雷数が1以上の開示済みセル）のビットマップを生成
    getNumberCellsBit(resultBits) {
        this.clearBits(resultBits);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    this.setBit(resultBits, row, col, true);
                }
            }
        }
    }
    
    // 旗が立っているセルのビットマップを生成
    getFlaggedCellsBit(resultBits) {
        this.clearBits(resultBits);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.flagged[row][col]) {
                    this.setBit(resultBits, row, col, true);
                }
            }
        }
    }
    
    // ハイブリッド版境界セル検出（処理はビット、出力は従来形式）
    getBorderCellsHybrid() {
        // 必要なビット配列を準備
        const unknownBits = new Uint32Array(this.intsNeeded);
        const numberBits = new Uint32Array(this.intsNeeded);
        const borderBits = new Uint32Array(this.intsNeeded);
        const tempBits = new Uint32Array(this.intsNeeded);
        
        // 基本的なセル分類をビット化
        this.getUnknownCellsBit(unknownBits);
        this.getNumberCellsBit(numberBits);
        this.clearBits(borderBits);
        
        // 各数字セルの隣接する未開セルを境界セルに追加
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.getBit(numberBits, row, col)) {
                    // この数字セルの隣接セルを取得
                    this.getNeighborCellsBit(row, col, unknownBits, tempBits);
                    // 境界セルに追加（OR演算）
                    this.orBits(borderBits, tempBits, borderBits);
                }
            }
        }
        
        // ビット配列から従来形式の座標配列に変換
        return this.bitsToCoords(borderBits);
    }
    
    // 完全ビット化版境界セル検出（入出力すべてビット形式）
    getBorderCellsBit(resultBits) {
        // 必要なビット配列を準備（再利用可能な一時配列を使用）
        const unknownBits = this.tempBits1;
        const numberBits = this.tempBits2;
        const tempBits = this.tempBits3;
        
        // 基本的なセル分類をビット化
        this.getUnknownCellsBit(unknownBits);
        this.getNumberCellsBit(numberBits);
        this.clearBits(resultBits);
        
        // 各数字セルの隣接する未開セルを境界セルに追加
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.getBit(numberBits, row, col)) {
                    // この数字セルの隣接セルを取得
                    this.getNeighborCellsBit(row, col, unknownBits, tempBits);
                    // 境界セルに追加（OR演算）
                    this.orBits(resultBits, tempBits, resultBits);
                }
            }
        }
    }
    
    // ビット結果から従来形式への変換ヘルパー
    getBorderCellsFromBits() {
        const borderBits = new Uint32Array(this.intsNeeded);
        this.getBorderCellsBit(borderBits);
        return this.bitsToCoords(borderBits);
    }
    
    // 境界セル検出の統合インターフェース（フラグで切り替え可能）
    getBorderCellsUnified(useBitVersion = true, returnAsCoords = true) {
        if (useBitVersion) {
            if (returnAsCoords) {
                return this.getBorderCellsFromBits();
            } else {
                const borderBits = new Uint32Array(this.intsNeeded);
                this.getBorderCellsBit(borderBits);
                return borderBits;
            }
        } else {
            return this.getBorderCells();
        }
    }
    
    // Phase1-4: 制約生成の部分ビット化
    
    // ハイブリッド版制約生成（処理はビット、出力は従来形式）
    generateConstraintsHybrid(cells = null) {
        const constraints = [];
        
        // セルリストが指定されていない場合は境界セルを使用
        if (!cells) {
            cells = this.getBorderCellsHybrid();
        }
        
        // 効率化のため、セルをビット配列に変換
        const targetCellsBits = new Uint32Array(this.intsNeeded);
        this.coordsToBits(cells, targetCellsBits);
        
        // 数字セルと未開セルのビットマップを準備
        const numberBits = this.tempBits1;
        const unknownBits = this.tempBits2;
        const neighborBits = this.tempBits3;
        
        this.getNumberCellsBit(numberBits);
        this.getUnknownCellsBit(unknownBits);
        
        // 各数字セルから制約を生成
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.getBit(numberBits, row, col)) {
                    // この数字セルの隣接する対象セルを取得
                    this.getNeighborCellsBit(row, col, targetCellsBits, neighborBits);
                    
                    // ビット配列から座標リストに変換
                    const neighborCells = this.bitsToCoords(neighborBits);
                    
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
    
    // 数字セル周辺の未開セル取得（ビット化版）
    getNumberCellNeighborsHybrid(row, col) {
        const unknownBits = this.tempBits1;
        const neighborBits = this.tempBits2;
        
        this.getUnknownCellsBit(unknownBits);
        this.getNeighborCellsBit(row, col, unknownBits, neighborBits);
        
        return this.bitsToCoords(neighborBits);
    }
    
    // 制約生成の統合インターフェース
    generateConstraintsUnified(cells = null, useBitVersion = true) {
        if (useBitVersion) {
            return this.generateConstraintsHybrid(cells);
        } else {
            return this.generateConstraints(cells);
        }
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