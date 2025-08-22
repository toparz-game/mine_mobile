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
        
        // キャッシュシステム
        this.groupCache = new Map();              // 局所制約完全性キャッシュ
        this.constraintPropCache = new Map();     // 制約伝播専用キャッシュ
        this.previousBoardState = null;
        
        // ビット演算用の一時バッファ
        this.tempRevealedBits = new Uint32Array(this.intsNeeded);
        this.tempFlaggedBits = new Uint32Array(this.intsNeeded);
        
        // ゲーム状態ビットマスクキャッシュ
        this.cachedRevealedMask = 0n;
        this.cachedFlaggedMask = 0n;
        this.cachedUnknownMask = 0n;
        this.gameStateValid = false;
        
    }
    
    // 座標をビット位置に変換
    coordToBitPos(row, col) {
        return this.bitSystem.coordToBitPos(row, col);
    }
    
    // ゲーム状態をビットマスクで更新
    updateGameStateMasks() {
        this.cachedRevealedMask = 0n;
        this.cachedFlaggedMask = 0n;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const bitIndex = this.coordToBitIndex(row, col);
                const bitMask = 1n << BigInt(bitIndex);
                
                if (this.game.revealed[row][col]) {
                    this.cachedRevealedMask |= bitMask;
                }
                if (this.game.flagged[row][col]) {
                    this.cachedFlaggedMask |= bitMask;
                }
            }
        }
        
        // 未知セルマスク = 全体 - (開示済み | フラグ付き)
        const totalMask = (1n << BigInt(this.rows * this.cols)) - 1n;
        this.cachedUnknownMask = totalMask & ~(this.cachedRevealedMask | this.cachedFlaggedMask);
        this.gameStateValid = true;
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
    
    // 未知セルの取得（ビット版）
    getUnknownCellsMask() {
        if (!this.gameStateValid) {
            this.updateGameStateMasks();
        }
        return this.cachedUnknownMask;
    }
    
    // 未知セルの数を取得（O(1)）
    getUnknownCellsCount() {
        return this.popcount(this.getUnknownCellsMask());
    }
    
    // 互換性のため従来版も残す
    getUnknownCells() {
        const unknownMask = this.getUnknownCellsMask();
        const unknownCells = [];
        
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((unknownMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                unknownCells.push(coord);
            }
        }
        
        return unknownCells;
    }
    
    // 境界セルの取得（従来版）
    // 座標をビットインデックスに変換
    coordToBitIndex(row, col) {
        return row * this.cols + col;
    }
    
    // ビットインデックスを座標に変換
    bitIndexToCoord(bitIndex) {
        const row = Math.floor(bitIndex / this.cols);
        const col = bitIndex % this.cols;
        return { row, col };
    }
    
    // ビット化された境界セル取得（最適化版）
    getBorderCellsBit() {
        if (!this.gameStateValid) {
            this.updateGameStateMasks();
        }
        
        let borderMask = 0n;
        
        // 数字セル（開示済みで数字あり）を特定
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    // 8方向の隣接セルをビットシフトで効率的にチェック
                    const centerBit = this.coordToBitIndex(row, col);
                    
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const newRow = row + dr;
                            const newCol = col + dc;
                            
                            if (newRow >= 0 && newRow < this.rows && 
                                newCol >= 0 && newCol < this.cols) {
                                
                                const bitIndex = this.coordToBitIndex(newRow, newCol);
                                const bitMask = 1n << BigInt(bitIndex);
                                
                                // 未開示セルかつ未フラグセルなら境界セル
                                if ((this.cachedUnknownMask & bitMask) !== 0n) {
                                    borderMask |= bitMask;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return borderMask;
    }
    
    // ビット版境界セル取得（メイン）
    getBorderCells() {
        return this.getBorderCellsBit();
    }
    
    // ビット化された制約生成（最適化版）
    generateConstraintsBit(borderMask) {
        if (!this.gameStateValid) {
            this.updateGameStateMasks();
        }
        
        const constraints = [];
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    let neighborMask = 0n;
                    let flaggedNeighbors = 0;
                    
                    // 周囲8マスをビット演算で効率的にチェック
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const newRow = row + dr;
                            const newCol = col + dc;
                            
                            if (newRow >= 0 && newRow < this.rows && 
                                newCol >= 0 && newCol < this.cols) {
                                
                                const bitIndex = this.coordToBitIndex(newRow, newCol);
                                const bitMask = 1n << BigInt(bitIndex);
                                
                                // ビットマスクで状態を高速チェック
                                if ((borderMask & bitMask) !== 0n) {
                                    // 境界セルで未フラグなら制約に追加
                                    if ((this.cachedFlaggedMask & bitMask) === 0n) {
                                        neighborMask |= bitMask;
                                    } else {
                                        flaggedNeighbors++;
                                    }
                                } else if ((this.cachedFlaggedMask & bitMask) !== 0n) {
                                    // 境界外でもフラグが立っている場合は数える
                                    flaggedNeighbors++;
                                }
                            }
                        }
                    }
                    
                    if (neighborMask !== 0n) {
                        const expectedMines = this.game.board[row][col] - flaggedNeighbors;
                        if (expectedMines >= 0) {
                            constraints.push({
                                cellsMask: neighborMask,
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
    
    // ビット版制約生成（メイン）
    generateConstraints(borderMask) {
        return this.generateConstraintsBit(borderMask);
    }
    
    // ビット版フィンガープリント生成
    getBitConstraintPropFingerprint(borderMask, bitConstraints) {
        let hash = borderMask.toString();
        
        for (const constraint of bitConstraints) {
            hash += `|${constraint.cellsMask.toString()}-${constraint.expectedMines}`;
        }
        
        return hash;
    }
    
    // ビット版キャッシュ保存
    cacheBitConstraintPropResult(fingerprint, borderMask, foundActionable) {
        let safeMask = 0n;
        let mineMask = 0n;
        
        // 0%と100%のセルをビットマスクで収集
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((borderMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                const prob = this.probabilities[coord.row][coord.col];
                if (prob === 0) {
                    safeMask |= bitMask;
                } else if (prob === 100) {
                    mineMask |= bitMask;
                }
            }
        }
        
        this.constraintPropCache.set(fingerprint, {
            safeMask: safeMask,
            mineMask: mineMask,
            foundActionable: foundActionable
        });
    }
    
    // ビット版キャッシュ復元
    restoreBitConstraintPropResult(cached) {
        // safeMaskとmineMaskから確率を復元
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            
            if ((cached.safeMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                this.probabilities[coord.row][coord.col] = 0;
                this.persistentProbabilities[coord.row][coord.col] = 0;
            } else if ((cached.mineMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                this.probabilities[coord.row][coord.col] = 100;
                this.persistentProbabilities[coord.row][coord.col] = 100;
            }
        }
    }
    
    
    // 完全ビット化制約伝播
    applyConstraintPropagationBit(borderMask, bitConstraints) {
        let safeMask = 0n;
        let mineMask = 0n;
        let changed = true;
        
        while (changed) {
            changed = false;
            
            for (const constraint of bitConstraints) {
                // 制約対象セルから既に確定したセルを除外
                const activeCellsMask = constraint.cellsMask & ~(safeMask | mineMask);
                const activeCellCount = this.popcount(activeCellsMask);
                
                // 既にフラグされた地雷数をカウント
                let alreadyFoundMines = this.popcount(constraint.cellsMask & mineMask);
                const neededMines = constraint.expectedMines - alreadyFoundMines;
                
                if (neededMines < 0) {
                    // 制約矛盾
                    return 'contradiction';
                }
                
                // 全て地雷確定
                if (activeCellCount === neededMines && neededMines > 0) {
                    mineMask |= activeCellsMask;
                    changed = true;
                }
                // 全て安全確定
                else if (neededMines === 0 && activeCellCount > 0) {
                    safeMask |= activeCellsMask;
                    changed = true;
                }
            }
        }
        
        // 結果を確率配列に設定
        let foundActionable = false;
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            
            if ((safeMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                this.probabilities[coord.row][coord.col] = 0;
                this.persistentProbabilities[coord.row][coord.col] = 0;
                foundActionable = true;
            } else if ((mineMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                this.probabilities[coord.row][coord.col] = 100;
                this.persistentProbabilities[coord.row][coord.col] = 100;
                foundActionable = true;
            }
        }
        
        return foundActionable;
    }
    
    // キャッシュ対応制約伝播（ビット化版使用）
    applyConstraintPropagationWithCache(constraints) {
        // ビット版データを準備
        const borderMask = this.getBorderCellsBit();
        const bitConstraints = this.generateConstraintsBit(borderMask);
        
        // フィンガープリント生成（ビット版）
        const fingerprint = this.getBitConstraintPropFingerprint(borderMask, bitConstraints);
        
        // キャッシュチェック
        if (this.constraintPropCache.has(fingerprint)) {
            const cached = this.constraintPropCache.get(fingerprint);
            
            // キャッシュから結果を復元（ビット版）
            this.restoreBitConstraintPropResult(cached);
            
            return cached.foundActionable;
        }
        
        // ビット版制約伝播を実行
        const result = this.applyConstraintPropagationBit(borderMask, bitConstraints);
        
        if (result === 'contradiction') {
            return result;
        }
        
        const foundActionable = result;
        
        // 結果をキャッシュに保存（ビット版）
        this.cacheBitConstraintPropResult(fingerprint, borderMask, foundActionable);
        
        return foundActionable;
    }
    
    
    // メイン確率計算（シンプル版）
    calculateProbabilities() {
        // ログをクリア
        console.clear();
        
        const startTime = performance.now();
        let processingMethod = '';
        let foundActionable = false;
        
        const rows = this.game.rows;
        const cols = this.game.cols;
        
        // 盤面の変更を検出してキャッシュを無効化
        const changes = this.detectBoardChanges();
        this.invalidateCache(changes);
        
        // 確率配列を初期化
        this.probabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        
        // 永続確率配列の初期化（初回のみ）
        if (!this.persistentProbabilities || this.persistentProbabilities.length === 0) {
            this.persistentProbabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        }
        
        // 開示済みセルの確率を設定
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (this.game.revealed[row][col]) {
                    this.probabilities[row][col] = 0;
                    this.persistentProbabilities[row][col] = -1; // 開示済みセルの永続確率をクリア
                } else if (this.game.flagged[row][col]) {
                    this.probabilities[row][col] = 100;
                    this.persistentProbabilities[row][col] = -1; // 旗付きセルの永続確率をクリア
                } else if (this.persistentProbabilities[row][col] === 0 || this.persistentProbabilities[row][col] === 100) {
                    // 永続的に保存された0%または100%の確率を復元
                    this.probabilities[row][col] = this.persistentProbabilities[row][col];
                }
            }
        }
        
        // ゲーム状態を無効化して再計算を促す
        this.gameStateValid = false;
        
        // 未知セル数を高速取得
        const unknownCellsCount = this.getUnknownCellsCount();
        
        if (unknownCellsCount === 0) {
            return { probabilities: this.probabilities, globalProbability: 0 };
        }
        
        // 境界セルを取得（ビットマスク）
        const borderMask = this.getBorderCells();
        
        if (borderMask === 0n) {
            // 境界セルがない場合、全て制約外
            const unknownCells = this.getUnknownCells();
            for (const cell of unknownCells) {
                this.probabilities[cell.row][cell.col] = -2;
            }
            return { probabilities: this.probabilities, globalProbability: 50 };
        }
        
        // 制約を生成（ビット版）
        const constraints = this.generateConstraints(borderMask);
        console.log(`制約数:${constraints.length}`);
        
        // 既に盤面上に確定マス（0%/100%）があるかチェック
        const hasExistingActionableCell = this.checkForExistingActionableCells();
        
        if (hasExistingActionableCell) {
            // 確定マスが既に存在する場合は制約伝播をスキップ（ログなし）
            // グローバル確率のみ計算して終了
            const flaggedCount = this.countFlags();
            const remainingMines = this.game.mineCount - flaggedCount;
            // 制約外セル数をビット演算で計算
            let constraintFreeCount = 0;
            for (let row = 0; row < this.game.rows; row++) {
                for (let col = 0; col < this.game.cols; col++) {
                    if (this.probabilities[row][col] === -2) {
                        constraintFreeCount++;
                    }
                }
            }
            
            const globalProbability = constraintFreeCount > 0 
                ? Math.round((remainingMines / constraintFreeCount) * 100)
                : 0;
                
            return { probabilities: this.probabilities, globalProbability };
        } else {
            // 制約伝播を適用（キャッシュ対応版）
            foundActionable = this.applyConstraintPropagationWithCache(constraints);
            
            if (foundActionable) {
                processingMethod = '制約伝播';
            } else {
                // 制約伝播で確定マスが見つからない場合、局所制約完全性を試行
                const borderCellCount = this.popcount(borderMask);
                console.log(`境界セル数:${borderCellCount} (制限:64)`);
                
                if (borderCellCount <= 64) {
                    const localFoundActionable = this.tryLocalConstraintCompletenessWithGroups(borderMask, constraints);
                    console.log(`制約完全性結果:${localFoundActionable}`);
                    
                    if (localFoundActionable) {
                        foundActionable = true;
                        processingMethod = '局所制約完全性';
                    } else {
                        processingMethod = '確率計算のみ';
                        // 制約を使った確率計算が既に実行されているので、基本確率での上書きは不要
                    }
                } else {
                    processingMethod = '確率計算のみ';
                    this.calculateBasicProbabilitiesForLargeGroup(borderMask);
                }
            }
        }
        
        // 残りのセルを制約外としてマーク（ビット版）
        const unknownMask = this.getUnknownCellsMask();
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((unknownMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                if (this.probabilities[coord.row][coord.col] === -1) {
                    this.probabilities[coord.row][coord.col] = -2;
                }
            }
        }
        
        // グローバル確率を計算
        const flaggedCount = this.countFlags();
        const remainingMines = this.game.mineCount - flaggedCount;
        // 制約外セル数を高速計算
        let constraintFreeCount = 0;
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (this.probabilities[row][col] === -2) {
                    constraintFreeCount++;
                }
            }
        }
        
        const globalProbability = constraintFreeCount > 0 
            ? Math.round((remainingMines / constraintFreeCount) * 100)
            : 0;
        
        // 処理時間を計算
        const endTime = performance.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(3);
        
        // 結果をログ出力
        const borderCellCount = this.popcount(borderMask);
        console.log(`⏱️ 計算完了: ${processingTime}秒`);
        
        return { probabilities: this.probabilities, globalProbability };
    }
    
    // ビット形式で盤面状態の変化を検出
    detectBoardChanges() {
        // 現在の盤面をビット形式に変換
        this.convertBoardToBits();
        
        if (!this.previousBoardState) {
            this.saveBitBoardState();
            return ['reset'];
        }
        
        // ビット演算で変化を高速検出
        let hasChanges = false;
        for (let i = 0; i < this.intsNeeded; i++) {
            if (this.tempRevealedBits[i] !== this.previousBoardState.revealedBits[i] ||
                this.tempFlaggedBits[i] !== this.previousBoardState.flaggedBits[i]) {
                hasChanges = true;
                break;
            }
        }
        
        // 現在の状態を保存
        this.saveBitBoardState();
        
        return hasChanges ? ['changed'] : [];
    }
    
    // 盤面をビット形式に変換
    convertBoardToBits() {
        // バッファをクリア
        this.tempRevealedBits.fill(0);
        this.tempFlaggedBits.fill(0);
        
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                const bitPos = this.coordToBitPos(row, col);
                const intIndex = Math.floor(bitPos / 32);
                const bitIndex = bitPos % 32;
                
                if (this.game.revealed[row][col]) {
                    this.tempRevealedBits[intIndex] |= (1 << bitIndex);
                }
                if (this.game.flagged[row][col]) {
                    this.tempFlaggedBits[intIndex] |= (1 << bitIndex);
                }
            }
        }
    }
    
    // ビット形式で盤面状態を保存
    saveBitBoardState() {
        this.previousBoardState = {
            revealedBits: new Uint32Array(this.tempRevealedBits),
            flaggedBits: new Uint32Array(this.tempFlaggedBits)
        };
    }
    
    // キャッシュの無効化
    invalidateCache(changes) {
        if (changes.length === 0) return;
        
        // リセットの場合は全キャッシュをクリア
        if (changes[0] === 'reset') {
            this.groupCache.clear();
            this.constraintPropCache.clear();
            return;
        }
        
        // 部分的な変化の場合は全キャッシュをクリア（簡易実装）
        this.groupCache.clear();
        this.constraintPropCache.clear();
    }
    
    // ビットベースのグループフィンガープリント生成
    getBitGroupFingerprint(cellsMask, constraints) {
        // セルマスクをそのまま使用（32bit以内の場合）
        let fingerprint = cellsMask;
        
        // 制約情報をハッシュ化して組み合わせ
        let constraintHash = 0n;
        for (const constraint of constraints) {
            // 制約のセルマスクとexpectedMinesを組み合わせてハッシュ
            const constraintData = constraint.cellsMask ^ (BigInt(constraint.expectedMines) << 28n);
            constraintHash ^= constraintData;
        }
        
        // セルマスクと制約ハッシュを組み合わせ（64bit相当の一意性確保）
        return `${fingerprint}-${constraintHash}`;
    }
    
    // 制約伝播専用のビットベースフィンガープリント生成
    getConstraintPropFingerprint(constraints) {
        let constraintHash = 0n;
        let constraintCount = 0;
        
        // 制約の順序に依存しないハッシュを生成
        for (const constraint of constraints) {
            // セルマスク、expectedMines、ソース位置を組み合わせ
            const sourceHash = constraint.sourceCell ? 
                (constraint.sourceCell.row * 100 + constraint.sourceCell.col) : 0;
            const constraintData = constraint.cellsMask ^ 
                                 (BigInt(constraint.expectedMines) << 28n) ^ 
                                 (BigInt(sourceHash) << 16n);
            constraintHash ^= constraintData;
            constraintCount++;
        }
        
        // 制約数も含めて一意性を確保
        return `prop-${constraintHash}-${constraintCount}`;
    }
    
    // 旗の数をカウント（ビット版 O(1)）
    countFlags() {
        if (!this.gameStateValid) {
            this.updateGameStateMasks();
        }
        return this.popcount(this.cachedFlaggedMask);
    }
    
    // メモリ使用量（ダミー）
    getMemoryUsage() {
        return { reduction: 50 };
    }
    
    // ======================================
    // 局所制約完全性（ビット管理版）
    // ======================================
    
    
    // グループ単位での局所制約完全性処理（完全ビット版）
    tryLocalConstraintCompletenessWithGroups(borderMask, constraints) {
        const borderCellCount = this.popcount(borderMask);
        
        // グループサイズ制限をチェック（64セル以内）
        if (borderCellCount > 64) {
            // 大きすぎる場合は確定マス発見は諦めて、確率のみ計算
            this.calculateBasicProbabilitiesForLargeGroup(borderMask);
            return false;
        }
        
        // 制約は既にビット形式なのでそのまま使用
        
        // 制約グループを分割（ビット演算版）
        const constraintGroups = this.partitionConstraintGroupsBit(borderMask, constraints);
        
        // 各グループを処理（確定マス発見時に早期終了）
        for (const group of constraintGroups) {
            const foundInGroup = this.processConstraintGroupBit(group, borderMask);
            if (foundInGroup) {
                return true; // 確定マス発見時は即座に終了
            }
        }
        
        return false;
    }
    
    // 制約グループを分割（ビット演算版）
    partitionConstraintGroupsBit(borderMask, constraints) {
        const groups = [];
        const processedConstraints = new Set();
        
        for (const constraint of constraints) {
            if (processedConstraints.has(constraint)) continue;
            
            // この制約から連結成分を探索
            const groupConstraints = [];
            const queue = [constraint];
            const visited = new Set([constraint]);
            let groupCellsMask = constraint.cellsMask;
            
            while (queue.length > 0) {
                const current = queue.shift();
                groupConstraints.push(current);
                
                // 隣接する制約を探索
                for (const other of constraints) {
                    if (visited.has(other)) continue;
                    
                    // ビット演算でセルの重複をチェック
                    if ((other.cellsMask & groupCellsMask) !== 0) {
                        groupCellsMask |= other.cellsMask;
                        visited.add(other);
                        queue.push(other);
                    }
                }
            }
            
            groups.push({
                cellsMask: groupCellsMask,
                constraints: groupConstraints
            });
            
            // 処理済みとしてマーク
            for (const c of groupConstraints) {
                processedConstraints.add(c);
            }
        }
        
        return groups;
    }
    
    // 制約グループを処理（ビット演算版）
    processConstraintGroupBit(group, borderMask) {
        console.log(`グループ処理開始: ${this.popcount(group.cellsMask)}セル`);
        const independentSubsets = this.findIndependentSubsetsBit(borderMask, group.constraints);
        
        if (independentSubsets.length === 0) {
            // 独立部分集合がない場合、全体を一つの部分集合として扱う
            const allCellsMask = group.cellsMask;
            const cellCount = this.popcount(allCellsMask);
            
            if (cellCount <= 30) {
                const subset = {
                    cellsMask: allCellsMask,
                    constraints: group.constraints
                };
                const hasActionable = this.solveSubsetWithCache(subset, borderMask);
                return hasActionable;
            } else {
                return false;
            }
        }
        
        // 各独立部分集合を処理
        for (let i = 0; i < independentSubsets.length; i++) {
            const subset = independentSubsets[i];
            const cellCount = this.popcount(subset.cellsMask);
            
            if (cellCount <= 30) {
                console.log(`部分集合処理開始: ${cellCount}セル`);
                const hasActionable = this.solveSubsetWithCache(subset, borderMask);
                console.log(`部分集合処理結果: ${hasActionable}`);
                if (hasActionable) {
                    // 確定マスが見つかったので、このグループの残りセルを中断マーク
                    this.markRemainingCellsAsInterrupted(borderMask, group.cellsMask);
                    return true; // グループ処理を早期終了
                }
            } else {
            }
        }
        
        console.log(`グループ処理終了: 確定マス発見=false`);
        return false;
    }
    
    // キャッシュ付き部分集合解決（ビット版）
    solveSubsetWithCache(subset, borderMask) {
        const cellCount = this.popcount(subset.cellsMask);
        
        // ビットベースのフィンガープリントを生成
        const fingerprint = this.getBitGroupFingerprint(subset.cellsMask, subset.constraints);
        
        // キャッシュをチェック
        if (this.groupCache.has(fingerprint)) {
            const cached = this.groupCache.get(fingerprint);
            
            // ビットマスクから確率を復元
            for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
                const bitMask = 1n << BigInt(bitIndex);
                if ((subset.cellsMask & bitMask) !== 0n) {
                    const coord = this.bitIndexToCoord(bitIndex);
                    const cachedProb = cached.probabilities[bitIndex];
                    this.probabilities[coord.row][coord.col] = cachedProb;
                
                    // 0%または100%の場合は永続確率も更新
                    if (cachedProb === 0 || cachedProb === 100) {
                        this.persistentProbabilities[coord.row][coord.col] = cachedProb;
                    }
                }
            }
            
            return cached.hasActionable;
        }
        
        // キャッシュにない場合は計算
        const result = this.solveSubsetWithBits(subset, borderMask);
        
        // 制約矛盾が検出された場合は特別な処理
        if (result === 'contradiction') {
            return false;
        }
        
        const hasActionable = result;
        
        // 結果をビット順序でキャッシュに保存
        const probabilities = [];
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((subset.cellsMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                probabilities[bitIndex] = this.probabilities[coord.row][coord.col];
            }
        }
        
        this.groupCache.set(fingerprint, {
            probabilities,
            hasActionable
        });
        
        return hasActionable;
    }
    
    // 確定マス以外のセルを計算中断としてマーク（ビット版）
    markRemainingCellsAsInterrupted(borderMask, cellsMask) {
        let interruptedCount = 0;
        
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((cellsMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                const currentProb = this.probabilities[coord.row][coord.col];
                
                // 未計算(-1)、または確定マス以外の確率値の場合
                if (currentProb === -1 || (currentProb !== 0 && currentProb !== 100 && currentProb !== -2)) {
                    this.probabilities[coord.row][coord.col] = -3; // 計算中断
                    interruptedCount++;
                }
            }
        }
        
        return interruptedCount;
    }
    
    // 既に盤面上に確定マス（0%/100%）が存在するかチェック
    checkForExistingActionableCells() {
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                // 未開示かつ旗が立っていないセルのみチェック
                if (!this.game.revealed[row][col] && !this.game.flagged[row][col]) {
                    const prob = this.probabilities[row][col];
                    // 0%または100%のセルが存在する場合
                    if (prob === 0 || prob === 100) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // 制約矛盾が発生しているかチェック（ビット版）
    hasContradictionInProbabilities(borderMask) {
        // 確率が設定されていないセルが多い場合、制約矛盾の可能性が高い
        let unsetCount = 0;
        let totalBorderCells = 0;
        
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((borderMask & bitMask) !== 0n) {
                totalBorderCells++;
                const coord = this.bitIndexToCoord(bitIndex);
                if (this.probabilities[coord.row][coord.col] === -1) {
                    unsetCount++;
                }
            }
        }
        
        // 境界セルの80%以上が確率未設定の場合、制約矛盾と判定
        return unsetCount >= totalBorderCells * 0.8;
    }

    // 大きなグループ用の基本確率計算（ビット版）
    calculateBasicProbabilitiesForLargeGroup(borderMask) {
        // 全体的な地雷密度から基本確率を計算
        const flaggedCount = this.countFlags();
        const remainingMines = this.game.mineCount - flaggedCount;
        const unknownCellsCount = this.getUnknownCellsCount();
        
        
        if (unknownCellsCount === 0) return;
        
        // 境界セル外の未開示セル数を計算（ビット演算）
        const borderCellCount = this.popcount(borderMask);
        const nonBorderUnknownCount = unknownCellsCount - borderCellCount;
        
        // 基本確率計算（境界セルは若干高め、制約外セルは平均的）
        const totalUnknownCount = unknownCellsCount;
        let borderProbability = Math.round((remainingMines / totalUnknownCount) * 100);
        
        
        // 境界セルは制約の影響で若干リスクが高い傾向があるため+5%
        // borderProbability = Math.min(95, borderProbability + 5);
        
        // 境界セルに基本確率を設定（ビット演算）
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((borderMask & bitMask) !== 0n) {
                const coord = this.bitIndexToCoord(bitIndex);
                if (this.probabilities[coord.row][coord.col] === -1) {
                    this.probabilities[coord.row][coord.col] = borderProbability;
                }
            }
        }
    }
    
    // ======================================
    // ビットマスク操作ユーティリティ
    // ======================================
    
    // セルインデックス配列をビットマスクに変換
    arrayToBitmask(indices) {
        let mask = 0;
        for (const index of indices) {
            if (index >= 0 && index < 32) {
                mask |= (1 << index);
            }
        }
        return mask;
    }
    
    // ビットマスクをセルインデックス配列に変換（BigInt対応）
    bitmaskToArray(mask) {
        const indices = [];
        if (typeof mask === 'bigint') {
            for (let i = 0; i < this.rows * this.cols; i++) {
                if ((mask >> BigInt(i)) & 1n) {
                    indices.push(i);
                }
            }
        } else {
            for (let i = 0; i < 32; i++) {
                if ((mask >> i) & 1) {
                    indices.push(i);
                }
            }
        }
        return indices;
    }
    
    // ビットマスクの立っているビット数をカウント（BigInt対応）
    popcount(mask) {
        if (typeof mask === 'bigint') {
            let count = 0;
            while (mask > 0n) {
                count += Number(mask & 1n);
                mask >>= 1n;
            }
            return count;
        } else {
            // 通常の数値の場合
            let count = 0;
            while (mask) {
                count += mask & 1;
                mask >>= 1;
            }
            return count;
        }
    }
    
    
    // 独立した部分集合を検出（ビット管理版）
    findIndependentSubsetsBit(borderMask, constraints) {
        const independentSubsets = [];
        const processedConstraints = new Set();
        
        for (let constraintIdx = 0; constraintIdx < constraints.length; constraintIdx++) {
            const constraint = constraints[constraintIdx];
            if (processedConstraints.has(constraint)) continue;
            
            // この制約から開始して関連する制約とセルを収集
            const relatedConstraints = [constraint];
            let relatedCellsMask = constraint.cellsMask;
            const constraintQueue = [constraint];
            const processedInThisSet = new Set([constraint]);
            
            // 制約の連鎖を辿る
            while (constraintQueue.length > 0) {
                const currentConstraint = constraintQueue.shift();
                
                // この制約に関わるセルを追加
                relatedCellsMask |= currentConstraint.cellsMask;
                
                // セルを共有する他の制約を探す
                for (const otherConstraint of constraints) {
                    if (processedInThisSet.has(otherConstraint)) continue;
                    
                    // セルの重複をチェック（ビット演算）
                    const hasOverlap = (otherConstraint.cellsMask & relatedCellsMask) !== 0;
                    
                    if (hasOverlap) {
                        relatedConstraints.push(otherConstraint);
                        constraintQueue.push(otherConstraint);
                        processedInThisSet.add(otherConstraint);
                    }
                }
            }
            
            // 部分集合を追加（セルが存在する場合のみ）
            if (relatedCellsMask > 0) {
                const cellCount = this.popcount(relatedCellsMask);
                // 制約完全性をチェックして、isCompleteフラグを設定
                const isComplete = this.checkLocalConstraintCompletenessBit(relatedCellsMask, relatedConstraints, constraints);
                
                
                independentSubsets.push({
                    cellsMask: relatedCellsMask,
                    constraints: relatedConstraints,
                    isComplete: isComplete
                });
            }
            
            // 処理済みとしてマーク
            for (const processedConstraint of relatedConstraints) {
                processedConstraints.add(processedConstraint);
            }
        }
        
        return independentSubsets;
    }
    
    
    // 局所制約完全性をチェック（ビット版）
    checkLocalConstraintCompletenessBit(cellsMask, constraintSet, allConstraints) {
        // 条件1: セル集合内の各セルが関与する制約が、すべて制約集合内に含まれているか
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const bitMask = 1n << BigInt(bitIndex);
            if ((cellsMask & bitMask) === 0n) continue; // このセルは集合に含まれていない
            
            // このセルが関与するすべての制約を取得
            const cellConstraints = allConstraints.filter(constraint => 
                (constraint.cellsMask & bitMask) !== 0n
            );
            
            // このセルの制約がすべて制約集合に含まれているかチェック
            for (const cellConstraint of cellConstraints) {
                if (!constraintSet.includes(cellConstraint)) {
                    return false; // 制約集合外の制約がセルに影響している
                }
            }
        }
        
        // 条件2: 制約集合内の各制約が影響するセルが、すべてセル集合内に含まれているか
        for (const constraint of constraintSet) {
            // 制約が影響するセルマスクと、セル集合マスクの差分をチェック
            if ((constraint.cellsMask & ~cellsMask) !== 0n) {
                return false; // セル集合外のセルに制約が影響している
            }
        }
        
        return true; // 完全性が確認された
    }
    
    
    // 独立部分集合をビット演算で解く
    solveSubsetWithBits(subset, borderMask) {
        const cellCount = this.popcount(subset.cellsMask);
        
        // デバッグカウンターをリセット
        this.debugValidationCount = 0;
        
        // 0セルの部分集合の場合は処理をスキップ
        if (cellCount === 0) {
            return false;
        }
        
        
        const totalConfigs = Math.pow(2, cellCount);
        const validConfigurations = [];
        
        // 全ての可能な配置を試す
        let validCount = 0;
        for (let config = 0; config < totalConfigs; config++) {
            if (this.isValidConfigBitmask(config, subset.constraints, subset.cellsMask)) {
                validConfigurations.push(config);
                validCount++;
            }
        }
        
        
        if (validConfigurations.length === 0) {
            return 'contradiction';
        }
        
        
        // 確率を計算してセット
        let hasActionable = false;
        
        for (let i = 0; i < cellCount; i++) {
            let mineCount = 0;
            for (const configMask of validConfigurations) {
                if ((configMask >> i) & 1) {
                    mineCount++;
                }
            }
            
            const probability = Math.round((mineCount / validConfigurations.length) * 100);
            
            
            // i番目のビットに対応する実際のセル座標を取得
            let currentBit = 0;
            for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
                const bitMask = 1n << BigInt(bitIndex);
                if ((subset.cellsMask & bitMask) !== 0n) {
                    if (currentBit === i) {
                        const coord = this.bitIndexToCoord(bitIndex);
                        this.probabilities[coord.row][coord.col] = probability;
                        
                        if (probability === 0 || probability === 100) {
                            this.persistentProbabilities[coord.row][coord.col] = probability;
                            hasActionable = true;
                        }
                        break;
                    }
                    currentBit++;
                }
            }
        }
        
        return hasActionable;
    }
    
    // ビットマスク形式での配置検証
    isValidConfigBitmask(mineMask, constraints, subsetCellsMask) {
        // mineMaskをBigIntに変換（数値の場合）
        const bigIntMineMask = typeof mineMask === 'bigint' ? mineMask : BigInt(mineMask);
        
        // 部分集合の相対位置から全体位置への変換マップを作成
        const bitMapping = [];
        let relativeBit = 0;
        for (let bitIndex = 0; bitIndex < this.rows * this.cols; bitIndex++) {
            const globalBitMask = 1n << BigInt(bitIndex);
            if ((subsetCellsMask & globalBitMask) !== 0n) {
                bitMapping[relativeBit] = bitIndex;
                relativeBit++;
            }
        }
        
        for (let i = 0; i < constraints.length; i++) {
            const constraint = constraints[i];
            
            // 相対位置のmineMaskを全体座標系に変換して制約と比較
            let actualMines = 0;
            for (let relativeBit = 0; relativeBit < bitMapping.length; relativeBit++) {
                if ((bigIntMineMask >> BigInt(relativeBit)) & 1n) {
                    const globalBitIndex = bitMapping[relativeBit];
                    const globalBitMask = 1n << BigInt(globalBitIndex);
                    if ((constraint.cellsMask & globalBitMask) !== 0n) {
                        actualMines++;
                    }
                }
            }
            
            if (actualMines !== constraint.expectedMines) {
                return false;
            }
        }
        return true;
    }
}

// グローバル利用可能にする
window.SimpleBitCSP = SimpleBitCSP;