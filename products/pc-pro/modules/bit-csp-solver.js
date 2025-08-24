// ビット管理CSPソルバー - 第2段階：データ構造のビット化
// 既存CSPSolverを継承し、内部データ構造をビット演算で高速化

class BitCSPSolver {
    constructor(game, bitSystem) {
        this.game = game;
        this.bitSystem = bitSystem;
        this.rows = bitSystem.rows;
        this.cols = bitSystem.cols;
        this.totalCells = bitSystem.totalCells;
        this.bitsPerInt = bitSystem.bitsPerInt;
        this.intsNeeded = bitSystem.intsNeeded;
        
        // ビット配列（セット演算用）
        this.candidateBits = new Uint32Array(this.intsNeeded);
        this.constraintBits = new Uint32Array(this.intsNeeded);
        this.tempBits1 = new Uint32Array(this.intsNeeded);
        this.tempBits2 = new Uint32Array(this.intsNeeded);
        this.tempBits3 = new Uint32Array(this.intsNeeded);
        
        // 確率配列（従来形式との互換性維持）
        this.probabilities = [];
        this.persistentProbabilities = [];
        
        // パフォーマンス設定
        this.maxConstraintSize = Infinity; // 完全探索の上限撤廃
        this.maxLocalCompletenessSize = 32;
        this.warningThreshold = 30;
        this.maxValidConfigs = 500000;
        
        // キャッシュシステム
        this.groupCache = new Map();
        this.tempGroupCache = new Map();
        this.previousBoardState = null;
        
        // 統計情報
        this.totalConfigurations = 0;
        this.totalExhaustiveSearches = 0;
        this.cacheHits = 0;
        this.constraintPropagationOnly = 0;
        this.localCompletenessSuccess = 0;
        this.totalCellsProcessed = 0;
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
    
    // ビット配列をコピー
    copyBits(sourceBits, targetBits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            targetBits[i] = sourceBits[i];
        }
    }
    
    // ビット配列のAND演算
    andBits(bits1, bits2, resultBits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            resultBits[i] = bits1[i] & bits2[i];
        }
    }
    
    // ビット配列のOR演算
    orBits(bits1, bits2, resultBits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            resultBits[i] = bits1[i] | bits2[i];
        }
    }
    
    // ビット配列のXOR演算
    xorBits(bits1, bits2, resultBits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            resultBits[i] = bits1[i] ^ bits2[i];
        }
    }
    
    // ビット配列のNOT演算
    notBits(sourceBits, resultBits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            resultBits[i] = ~sourceBits[i];
        }
        // 最後の配列で使用されていないビットをクリア
        const lastIndex = this.intsNeeded - 1;
        const validBits = this.totalCells % this.bitsPerInt;
        if (validBits > 0) {
            const mask = (1 << validBits) - 1;
            resultBits[lastIndex] &= mask;
        }
    }
    
    // ビット配列の1の数をカウント（ポピュレーションカウント）
    popCountBits(bitArray) {
        let count = 0;
        for (let i = 0; i < this.intsNeeded; i++) {
            let n = bitArray[i];
            // Brian Kernighanのアルゴリズム
            while (n) {
                count++;
                n &= n - 1;
            }
        }
        return count;
    }
    
    // ビット配列が空かチェック
    isEmptyBits(bitArray) {
        for (let i = 0; i < this.intsNeeded; i++) {
            if (bitArray[i] !== 0) {
                return false;
            }
        }
        return true;
    }
    
    // ビット配列から座標リストを生成
    bitsToCoordList(bitArray) {
        const coords = [];
        for (let i = 0; i < this.intsNeeded; i++) {
            let n = bitArray[i];
            let bitIndex = 0;
            while (n !== 0) {
                if (n & 1) {
                    const bitPos = i * this.bitsPerInt + bitIndex;
                    if (bitPos < this.totalCells) {
                        const coord = this.bitPosToCoord(bitPos);
                        coords.push(coord);
                    }
                }
                n >>>= 1;
                bitIndex++;
            }
        }
        return coords;
    }
    
    // 座標リストからビット配列を生成
    coordListToBits(coords, bitArray) {
        this.clearBits(bitArray);
        for (const coord of coords) {
            this.setBit(bitArray, coord.row, coord.col, true);
        }
    }
    
    // 未知セルのビット配列を生成（高速化）
    getUnknownCellsBits(resultBits) {
        this.clearBits(resultBits);
        
        // revealed OR flagged の補集合を計算
        this.orBits(this.bitSystem.revealedBits, this.bitSystem.flaggedBits, this.tempBits1);
        this.notBits(this.tempBits1, resultBits);
    }
    
    // 境界セル（開示済みセルに隣接する未知セル）をビット演算で高速検出
    getBorderCellsBits(resultBits) {
        this.clearBits(resultBits);
        this.clearBits(this.tempBits1); // 境界セル候補
        
        // 開示済みセルの周囲8マスを境界セル候補に追加
        for (let i = 0; i < this.intsNeeded; i++) {
            let revealedChunk = this.bitSystem.revealedBits[i];
            let bitIndex = 0;
            
            while (revealedChunk !== 0) {
                if (revealedChunk & 1) {
                    const bitPos = i * this.bitsPerInt + bitIndex;
                    if (bitPos < this.totalCells) {
                        const coord = this.bitPosToCoord(bitPos);
                        this.addNeighborsToBorderCandidates(coord.row, coord.col);
                    }
                }
                revealedChunk >>>= 1;
                bitIndex++;
            }
        }
        
        // 境界セル候補から開示済み・旗付きセルを除外
        this.getUnknownCellsBits(this.tempBits2);
        this.andBits(this.tempBits1, this.tempBits2, resultBits);
    }
    
    // 指定セルの周囲8マスを境界セル候補に追加
    addNeighborsToBorderCandidates(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isValidCell(newRow, newCol)) {
                    this.setBit(this.tempBits1, newRow, newCol, true);
                }
            }
        }
    }
    
    // セルが有効範囲内かチェック
    isValidCell(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
    
    // ビット演算による高速制約チェック
    checkConstraintSatisfactionBits(constraintBits, mineBits, expectedCount) {
        // 制約範囲内の地雷数をカウント
        this.andBits(constraintBits, mineBits, this.tempBits3);
        const actualCount = this.popCountBits(this.tempBits3);
        return actualCount === expectedCount;
    }
    
    // メモリ使用量を計算
    getMemoryUsage() {
        const bitArrays = (this.candidateBits.byteLength + this.constraintBits.byteLength +
                          this.tempBits1.byteLength + this.tempBits2.byteLength + this.tempBits3.byteLength);
        
        // 従来のCSPソルバーとの比較
        const traditionalArrays = this.totalCells * 4 * 5; // 5つのboolean配列相当
        
        return {
            bitSystem: bitArrays,
            traditional: traditionalArrays,
            reduction: Math.round((1 - bitArrays / traditionalArrays) * 100)
        };
    }
    
    // デバッグ用：ビット配列の状態を出力
    debugBits(bitArray, label = 'Bits') {
        const coords = this.bitsToCoordList(bitArray);
        const count = this.popCountBits(bitArray);
        console.log(`[DEBUG] ${label}: ${count} cells set`, coords.slice(0, 10));
    }
    
    // 統計情報をリセット
    resetStatistics() {
        this.totalConfigurations = 0;
        this.totalExhaustiveSearches = 0;
        this.cacheHits = 0;
        this.constraintPropagationOnly = 0;
        this.localCompletenessSuccess = 0;
        this.totalCellsProcessed = 0;
    }
    
    // パフォーマンス統計を出力
    logPerformanceStats() {
        const memUsage = this.getMemoryUsage();
        console.log(`[BIT-CSP] Memory reduction: ${memUsage.reduction}%`);
        console.log(`[BIT-CSP] Configurations: ${this.totalConfigurations}`);
        console.log(`[BIT-CSP] Cache hits: ${this.cacheHits}`);
        console.log(`[BIT-CSP] Cells processed: ${this.totalCellsProcessed}`);
    }
}

// BitCSPSolver用のユーティリティクラス
class BitSetOperations {
    // ビット配列同士の等価性チェック
    static equals(bits1, bits2, intsNeeded) {
        for (let i = 0; i < intsNeeded; i++) {
            if (bits1[i] !== bits2[i]) {
                return false;
            }
        }
        return true;
    }
    
    // ビット配列のハッシュ値計算（キャッシュ用）
    static hash(bitArray, intsNeeded) {
        let hash = 0;
        for (let i = 0; i < intsNeeded; i++) {
            hash = (hash * 31 + bitArray[i]) >>> 0;
        }
        return hash;
    }
    
    // ビット配列の差集合計算 (bits1 - bits2)
    static difference(bits1, bits2, resultBits, intsNeeded) {
        for (let i = 0; i < intsNeeded; i++) {
            resultBits[i] = bits1[i] & (~bits2[i]);
        }
    }
    
    // ビット配列の積集合が空でないかチェック
    static hasIntersection(bits1, bits2, intsNeeded) {
        for (let i = 0; i < intsNeeded; i++) {
            if ((bits1[i] & bits2[i]) !== 0) {
                return true;
            }
        }
        return false;
    }
}