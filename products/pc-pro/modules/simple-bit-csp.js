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
        
        // デバッグログ管理
        this.debugLogEnabled = true; // デバッグログの有効/無効
        
        this.debugLog('Initialized successfully');
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
    
    // デバッグログ管理機能
    
    // デバッグログをクリア
    clearDebugLog() {
        if (this.debugLogEnabled) {
            console.clear();
            console.log('[SIMPLE-BIT-CSP] Debug log cleared');
        }
    }
    
    // デバッグログの有効/無効を切り替え
    toggleDebugLog(enabled = null) {
        if (enabled === null) {
            this.debugLogEnabled = !this.debugLogEnabled;
        } else {
            this.debugLogEnabled = enabled;
        }
        this.debugLog(`Debug logging ${this.debugLogEnabled ? 'enabled' : 'disabled'}`);
    }
    
    // デバッグログ出力（制御機能付き）
    debugLog(message, category = 'INFO') {
        if (this.debugLogEnabled) {
            console.log(`[SIMPLE-BIT-CSP] ${category}: ${message}`);
        }
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
                        // 既に旗が立っている隣接セル数を計算（全隣接セルから）
                        let flaggedNeighbors = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;
                                const newRow = row + dr;
                                const newCol = col + dc;
                                if (newRow >= 0 && newRow < this.rows && 
                                    newCol >= 0 && newCol < this.cols &&
                                    this.game.flagged[newRow][newCol]) {
                                    flaggedNeighbors++;
                                }
                            }
                        }
                        
                        // 旗が立っていないセルのみを制約対象とする
                        const constraintCells = neighborCells.filter(cell => 
                            !this.game.flagged[cell.row][cell.col]
                        );
                        
                        const expectedMines = this.game.board[row][col] - flaggedNeighbors;
                        if (constraintCells.length > 0 && expectedMines >= 0) {
                            constraints.push({
                                cells: constraintCells,
                                expectedMines: expectedMines,
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
    
    // Phase1-5: 制約生成の完全ビット化
    
    // ビット制約構造体の定義
    // BitConstraint = {
    //   cellsBits: Uint32Array,    // 制約対象セルのビット配列
    //   expectedMines: number,      // 期待地雷数
    //   sourceRow: number,          // ソースセルの行
    //   sourceCol: number           // ソースセルの列
    // }
    
    // 完全ビット化版制約生成
    generateConstraintsBit(cellsBits = null) {
        const constraints = [];
        
        // セルビットが指定されていない場合は境界セルを使用
        let targetCellsBits;
        if (!cellsBits) {
            targetCellsBits = new Uint32Array(this.intsNeeded);
            this.getBorderCellsBit(targetCellsBits);
        } else {
            targetCellsBits = cellsBits;
        }
        
        // 数字セルと未開セル、旗セルのビットマップを準備
        const numberBits = this.tempBits1;
        const unknownBits = this.tempBits2;
        const neighborBits = this.tempBits3;
        
        this.getNumberCellsBit(numberBits);
        this.getUnknownCellsBit(unknownBits);
        
        // 旗セルのビットマップも取得
        const flaggedBits = new Uint32Array(this.intsNeeded);
        this.getFlaggedCellsBit(flaggedBits);
        
        // 各数字セルから制約を生成
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.getBit(numberBits, row, col)) {
                    // この数字セルの隣接する対象セルを取得
                    this.getNeighborCellsBit(row, col, targetCellsBits, neighborBits);
                    
                    // 隣接セルが存在する場合のみ処理
                    if (!this.isEmptyBits(neighborBits)) {
                        // 隣接する旗セルの数をカウント（この数字セルの全隣接セルから）
                        let flaggedNeighbors = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;
                                const newRow = row + dr;
                                const newCol = col + dc;
                                if (newRow >= 0 && newRow < this.rows && 
                                    newCol >= 0 && newCol < this.cols &&
                                    this.getBit(flaggedBits, newRow, newCol)) {
                                    flaggedNeighbors++;
                                }
                            }
                        }
                        
                        // 制約対象セル（隣接セルから旗セルを除く）
                        const constraintCellsBits = new Uint32Array(this.intsNeeded);
                        const notFlaggedBits = new Uint32Array(this.intsNeeded);
                        this.notBits(flaggedBits, notFlaggedBits);
                        this.andBits(neighborBits, notFlaggedBits, constraintCellsBits);
                        
                        // 制約対象セルが存在し、期待地雷数が有効な場合のみ制約を追加
                        const expectedMines = this.game.board[row][col] - flaggedNeighbors;
                        if (!this.isEmptyBits(constraintCellsBits) && expectedMines >= 0) {
                            constraints.push({
                                cellsBits: new Uint32Array(constraintCellsBits), // コピーを作成
                                expectedMines: expectedMines,
                                sourceRow: row,
                                sourceCol: col
                            });
                        }
                    }
                }
            }
        }
        
        return constraints;
    }
    
    // ビット制約から従来制約への変換
    bitConstraintsToTraditional(bitConstraints) {
        return bitConstraints.map(bitConstraint => ({
            cells: this.bitsToCoords(bitConstraint.cellsBits),
            expectedMines: bitConstraint.expectedMines,
            sourceCell: { row: bitConstraint.sourceRow, col: bitConstraint.sourceCol }
        }));
    }
    
    // 従来制約からビット制約への変換
    traditionalConstraintsToBit(traditionalConstraints) {
        return traditionalConstraints.map(constraint => {
            const cellsBits = new Uint32Array(this.intsNeeded);
            this.coordsToBits(constraint.cells, cellsBits);
            return {
                cellsBits: cellsBits,
                expectedMines: constraint.expectedMines,
                sourceRow: constraint.sourceCell.row,
                sourceCol: constraint.sourceCell.col
            };
        });
    }
    
    // ビット制約の統計情報を取得
    getBitConstraintsStats(bitConstraints) {
        const stats = {
            constraintCount: bitConstraints.length,
            totalCells: 0,
            totalExpectedMines: 0,
            avgCellsPerConstraint: 0,
            maxCellsPerConstraint: 0,
            minCellsPerConstraint: Infinity
        };
        
        for (const constraint of bitConstraints) {
            const cellCount = this.popCountBits(constraint.cellsBits);
            stats.totalCells += cellCount;
            stats.totalExpectedMines += constraint.expectedMines;
            stats.maxCellsPerConstraint = Math.max(stats.maxCellsPerConstraint, cellCount);
            stats.minCellsPerConstraint = Math.min(stats.minCellsPerConstraint, cellCount);
        }
        
        if (bitConstraints.length > 0) {
            stats.avgCellsPerConstraint = stats.totalCells / bitConstraints.length;
            if (stats.minCellsPerConstraint === Infinity) {
                stats.minCellsPerConstraint = 0;
            }
        } else {
            stats.minCellsPerConstraint = 0;
        }
        
        return stats;
    }
    
    // 制約生成の最終統合インターフェース（全バージョン対応）
    generateConstraintsAdvanced(cells = null, mode = 'hybrid', returnFormat = 'traditional') {
        let constraints;
        
        switch (mode) {
            case 'traditional':
                constraints = this.generateConstraints(cells);
                break;
            case 'hybrid':
                constraints = this.generateConstraintsHybrid(cells);
                break;
            case 'bit':
                const cellsBits = cells ? (() => {
                    const bits = new Uint32Array(this.intsNeeded);
                    this.coordsToBits(cells, bits);
                    return bits;
                })() : null;
                constraints = this.generateConstraintsBit(cellsBits);
                break;
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
        
        // 返却形式の変換
        if (mode === 'bit' && returnFormat === 'traditional') {
            return this.bitConstraintsToTraditional(constraints);
        } else if (mode !== 'bit' && returnFormat === 'bit') {
            return this.traditionalConstraintsToBit(constraints);
        }
        
        return constraints;
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
                                !this.game.flagged[newRow][newCol] &&
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
        
        // cellsがnullまたは未定義の場合は境界セルを取得
        if (!cells) {
            cells = this.getBorderCells();
        }
        
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
                        // 既に旗が立っている隣接セル数を計算（全隣接セルから）
                        let flaggedNeighbors = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;
                                const newRow = row + dr;
                                const newCol = col + dc;
                                if (newRow >= 0 && newRow < this.rows && 
                                    newCol >= 0 && newCol < this.cols &&
                                    this.game.flagged[newRow][newCol]) {
                                    flaggedNeighbors++;
                                }
                            }
                        }
                        
                        // 旗が立っていないセルのみを制約対象とする
                        const constraintCells = neighborCells.filter(cell => 
                            !this.game.flagged[cell.row][cell.col]
                        );
                        
                        const expectedMines = this.game.board[row][col] - flaggedNeighbors;
                        if (constraintCells.length > 0 && expectedMines >= 0) {
                            constraints.push({
                                cells: constraintCells,
                                expectedMines: expectedMines,
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
        this.debugLog(`Applying constraint propagation with ${constraints.length} constraints`);
        
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
                    this.debugLog(`Found ${undeterminedCells.length} mine cells`);
                }
                // 全て安全確定の場合
                else if (neededMines === 0 && undeterminedCells.length > 0) {
                    for (const cell of undeterminedCells) {
                        this.probabilities[cell.row][cell.col] = 0;
                        foundSafeCells.push(cell);
                        changed = true;
                    }
                    this.debugLog(`Found ${undeterminedCells.length} safe cells`);
                }
            }
        }
        
        return foundSafeCells.length > 0 || foundMineCells.length > 0;
    }
    
    // メイン確率計算（シンプル版）
    calculateProbabilities() {
        this.debugLog('Starting simple probability calculation');
        
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
        this.debugLog(`Unknown cells: ${unknownCells.length}`);
        
        if (unknownCells.length === 0) {
            return { probabilities: this.probabilities, globalProbability: 0 };
        }
        
        // 境界セルを取得
        const borderCells = this.getBorderCells();
        this.debugLog(`Border cells: ${borderCells.length}`);
        
        if (borderCells.length === 0) {
            // 境界セルがない場合、全て制約外
            for (const cell of unknownCells) {
                this.probabilities[cell.row][cell.col] = -2;
            }
            return { probabilities: this.probabilities, globalProbability: 50 };
        }
        
        // 制約を生成
        const constraints = this.generateConstraints(borderCells);
        this.debugLog(`Generated ${constraints.length} constraints`);
        
        // 制約伝播を適用
        const foundActionable = this.applySimpleConstraintPropagation(constraints);
        
        if (foundActionable) {
            this.debugLog('Found actionable cells through constraint propagation');
        } else {
            this.debugLog('No actionable cells found');
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
        
        this.debugLog(`Calculation complete. Global probability: ${globalProbability}%`);
        
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