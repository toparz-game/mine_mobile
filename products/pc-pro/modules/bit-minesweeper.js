// PC-Pro版専用ビット管理システム
// 既存のAPIを完全に保持しながら、内部でビット演算を使用

class BitMinesweeperSystem {
    constructor(gameOrRows, cols) {
        // gameオブジェクトまたは行数を受け取る
        if (typeof gameOrRows === 'object' && gameOrRows.rows !== undefined) {
            this.rows = gameOrRows.rows;
            this.cols = gameOrRows.cols;
        } else {
            this.rows = gameOrRows;
            this.cols = cols;
        }
        this.totalCells = this.rows * this.cols;
        this.bitsPerInt = 32;
        this.intsNeeded = Math.ceil(this.totalCells / this.bitsPerInt);
        
        // ビット配列（各状態用）
        this.revealedBits = new Uint32Array(this.intsNeeded);
        this.flaggedBits = new Uint32Array(this.intsNeeded);
        this.questionedBits = new Uint32Array(this.intsNeeded);
        this.mineBits = new Uint32Array(this.intsNeeded);
        
        // 数字値は別配列（-1=地雷、0-8=周囲の地雷数）
        this.numberValues = new Int8Array(this.totalCells);
        
        // 互換性のための仮想2次元配列プロパティ
        this.setupCompatibilityLayer();
    }
    
    // 座標をビット位置に変換
    coordToBitPos(row, col) {
        return row * this.cols + col;
    }
    
    // ビット位置を座標に変換
    bitPosToCoord(bitPos) {
        return {
            row: Math.floor(bitPos / this.cols),
            col: bitPos % this.cols
        };
    }
    
    // ビットを取得
    getBit(bitArray, row, col) {
        const bitPos = this.coordToBitPos(row, col);
        const arrayIndex = Math.floor(bitPos / this.bitsPerInt);
        const bitIndex = bitPos % this.bitsPerInt;
        return (bitArray[arrayIndex] & (1 << bitIndex)) !== 0;
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
    
    // 互換性レイヤーの設定（既存コードが動くように）
    setupCompatibilityLayer() {
        // 既存の2次元配列アクセスをビット操作に変換するプロキシ
        this.board = this.createBoardProxy();
        this.revealed = this.create2DProxy('revealed');
        this.flagged = this.create2DProxy('flagged');
        this.questioned = this.create2DProxy('questioned');
    }
    
    // ボード値用の特別なプロキシ（数字値対応）
    createBoardProxy() {
        const self = this;
        return new Proxy(Array(this.rows).fill(null).map(() => Array(this.cols).fill(0)), {
            get(target, row) {
                if (typeof row === 'string' && !isNaN(row)) {
                    const rowNum = parseInt(row);
                    return new Proxy(target[rowNum], {
                        get(colTarget, col) {
                            if (typeof col === 'string' && !isNaN(col)) {
                                const colNum = parseInt(col);
                                const bitPos = self.coordToBitPos(rowNum, colNum);
                                return self.numberValues[bitPos];
                            }
                            return colTarget[col];
                        },
                        set(colTarget, col, value) {
                            if (typeof col === 'string' && !isNaN(col)) {
                                const colNum = parseInt(col);
                                const bitPos = self.coordToBitPos(rowNum, colNum);
                                self.numberValues[bitPos] = value;
                                
                                // 地雷の場合はビットも設定
                                if (value === -1) {
                                    self.setBit(self.mineBits, rowNum, colNum, true);
                                } else {
                                    self.setBit(self.mineBits, rowNum, colNum, false);
                                }
                                return true;
                            }
                            colTarget[col] = value;
                            return true;
                        }
                    });
                }
                return target[row];
            }
        });
    }
    
    // 汎用2次元配列プロキシ（boolean値対応）
    create2DProxy(type) {
        const self = this;
        const bitArrayMap = {
            'revealed': this.revealedBits,
            'flagged': this.flaggedBits,
            'questioned': this.questionedBits
        };
        const bitArray = bitArrayMap[type];
        
        return new Proxy(Array(this.rows).fill(null).map(() => Array(this.cols).fill(false)), {
            get(target, row) {
                if (typeof row === 'string' && !isNaN(row)) {
                    const rowNum = parseInt(row);
                    return new Proxy(target[rowNum], {
                        get(colTarget, col) {
                            if (typeof col === 'string' && !isNaN(col)) {
                                const colNum = parseInt(col);
                                return self.getBit(bitArray, rowNum, colNum);
                            }
                            return colTarget[col];
                        },
                        set(colTarget, col, value) {
                            if (typeof col === 'string' && !isNaN(col)) {
                                const colNum = parseInt(col);
                                self.setBit(bitArray, rowNum, colNum, !!value);
                                return true;
                            }
                            colTarget[col] = value;
                            return true;
                        }
                    });
                }
                return target[row];
            }
        });
    }
    
    // 盤面をクリア
    clear() {
        this.revealedBits.fill(0);
        this.flaggedBits.fill(0);
        this.questionedBits.fill(0);
        this.mineBits.fill(0);
        this.numberValues.fill(0);
    }
    
    // メモリ使用量を計算
    getMemoryUsage() {
        const bitArrays = this.revealedBits.byteLength + this.flaggedBits.byteLength + 
                         this.questionedBits.byteLength + this.mineBits.byteLength;
        const numberArray = this.numberValues.byteLength;
        const traditional = this.totalCells * 4 * 4; // 4つのboolean配列 + 1つのnumber配列
        
        return {
            bitSystem: bitArrays + numberArray,
            traditional: traditional,
            reduction: Math.round((1 - (bitArrays + numberArray) / traditional) * 100)
        };
    }
    
    // デバッグ用：状態を文字列化
    debugState() {
        console.log(`Memory usage: ${this.getMemoryUsage().reduction}% reduction`);
        console.log(`Total cells: ${this.totalCells}, Ints needed: ${this.intsNeeded}`);
    }

    // ===== Phase3用ビット操作メソッド =====

    // 座標をビットインデックスに変換（SimpleBitCSP互換）
    coordToBit(row, col) {
        return row * this.cols + col;
    }

    // 複数の座標をビット配列に設定
    coordsToBits(coords, targetBits) {
        targetBits.fill(0);
        for (const coord of coords) {
            const bitIndex = this.coordToBit(coord.row, coord.col);
            const arrayIndex = Math.floor(bitIndex / 32);
            const bitPos = bitIndex % 32;
            targetBits[arrayIndex] |= (1 << bitPos);
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
    }

    // ビット配列の1の数をカウント（popcount）
    popCountBits(bits) {
        let count = 0;
        for (let i = 0; i < this.intsNeeded; i++) {
            let n = bits[i];
            // Brian Kernighanのアルゴリズム
            while (n) {
                count++;
                n &= n - 1;
            }
        }
        return count;
    }

    // ビット配列のコピー
    copyBits(sourceBits, targetBits) {
        for (let i = 0; i < this.intsNeeded; i++) {
            targetBits[i] = sourceBits[i];
        }
    }

    // ビット配列のクリア
    clearBits(bits) {
        bits.fill(0);
    }

    // ビット配列の比較（等価判定）
    equalBits(bits1, bits2) {
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
}