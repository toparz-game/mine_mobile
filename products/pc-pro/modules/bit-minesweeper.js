// PC-Pro版専用ビット管理システム
// 既存のAPIを完全に保持しながら、内部でビット演算を使用

class BitMinesweeperSystem {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.totalCells = rows * cols;
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
}