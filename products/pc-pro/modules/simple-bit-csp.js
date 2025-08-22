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
    
    // キャッシュ対応制約伝播
    applyConstraintPropagationWithCache(constraints) {
        // 制約をビットマスク付きに変換
        const borderCells = this.getBorderCells();
        const constraintsWithBitmask = this.addBitmaskToConstraints(constraints, borderCells);
        
        // フィンガープリントを生成
        const fingerprint = this.getConstraintPropFingerprint(constraintsWithBitmask);
        
        // キャッシュをチェック
        if (this.constraintPropCache.has(fingerprint)) {
            const cached = this.constraintPropCache.get(fingerprint);
            
            // キャッシュから結果を復元
            this.restoreConstraintPropResult(cached, borderCells);
            
            return cached.foundActionable;
        }
        
        // キャッシュにない場合は制約伝播を実行
        const foundActionable = this.applySimpleConstraintPropagation(constraints);
        
        // 結果をキャッシュに保存
        this.cacheConstraintPropResult(fingerprint, borderCells, foundActionable);
        
        return foundActionable;
    }
    
    // 制約伝播結果をキャッシュに保存
    cacheConstraintPropResult(fingerprint, borderCells, foundActionable) {
        const safeSetBits = [];
        const mineSetBits = [];
        
        // 0%と100%のセルをビットマスク形式で保存
        for (const cell of borderCells) {
            const prob = this.probabilities[cell.row][cell.col];
            if (prob === 0) {
                safeSetBits.push({row: cell.row, col: cell.col});
            } else if (prob === 100) {
                mineSetBits.push({row: cell.row, col: cell.col});
            }
        }
        
        this.constraintPropCache.set(fingerprint, {
            safeSetBits,
            mineSetBits,
            foundActionable
        });
    }
    
    // キャッシュから制約伝播結果を復元
    restoreConstraintPropResult(cached, borderCells) {
        // 安全セルを復元
        for (const cell of cached.safeSetBits) {
            this.probabilities[cell.row][cell.col] = 0;
        }
        
        // 地雷セルを復元
        for (const cell of cached.mineSetBits) {
            this.probabilities[cell.row][cell.col] = 100;
        }
    }
    
    // メイン確率計算（シンプル版）
    calculateProbabilities() {
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
        
        if (unknownCells.length === 0) {
            return { probabilities: this.probabilities, globalProbability: 0 };
        }
        
        // 境界セルを取得
        const borderCells = this.getBorderCells();
        
        if (borderCells.length === 0) {
            // 境界セルがない場合、全て制約外
            for (const cell of unknownCells) {
                this.probabilities[cell.row][cell.col] = -2;
            }
            return { probabilities: this.probabilities, globalProbability: 50 };
        }
        
        // 制約を生成
        const constraints = this.generateConstraints(borderCells);
        
        // 制約伝播を適用（キャッシュ対応版）
        foundActionable = this.applyConstraintPropagationWithCache(constraints);
        
        if (foundActionable) {
            processingMethod = '制約伝播';
        } else {
            // 制約伝播で確定マスが見つからない場合、局所制約完全性を試行
            const localFoundActionable = this.tryLocalConstraintCompleteness(borderCells, constraints);
            
            if (localFoundActionable) {
                foundActionable = true;
                processingMethod = '局所制約完全性';
            } else {
                processingMethod = '確率計算のみ';
            }
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
        
        // 処理時間を計算
        const endTime = performance.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(3);
        
        // 結果をログ出力
        console.log(`📊 [CSP結果] 処理方法: ${processingMethod} | 境界マス: ${borderCells.length}個 | 処理時間: ${processingTime}秒`);
        
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
        let constraintHash = 0;
        for (const constraint of constraints) {
            // 制約のセルマスクとexpectedMinesを組み合わせてハッシュ
            const constraintData = constraint.cellsMask ^ (constraint.expectedMines << 28);
            constraintHash ^= constraintData;
        }
        
        // セルマスクと制約ハッシュを組み合わせ（64bit相当の一意性確保）
        return `${fingerprint}-${constraintHash}`;
    }
    
    // 制約伝播専用のビットベースフィンガープリント生成
    getConstraintPropFingerprint(constraints) {
        let constraintHash = 0;
        let constraintCount = 0;
        
        // 制約の順序に依存しないハッシュを生成
        for (const constraint of constraints) {
            // セルマスク、expectedMines、ソース位置を組み合わせ
            const sourceHash = constraint.sourceCell ? 
                (constraint.sourceCell.row * 100 + constraint.sourceCell.col) : 0;
            const constraintData = constraint.cellsMask ^ 
                                 (constraint.expectedMines << 28) ^ 
                                 (sourceHash << 16);
            constraintHash ^= constraintData;
            constraintCount++;
        }
        
        // 制約数も含めて一意性を確保
        return `prop-${constraintHash}-${constraintCount}`;
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
    
    // ======================================
    // 局所制約完全性（ビット管理版）
    // ======================================
    
    // 制約伝播で確定マスが見つからない場合の局所制約完全性処理
    tryLocalConstraintCompleteness(borderCells, constraints) {
        // グループサイズ制限をチェック（32セル以内）
        if (borderCells.length > 32) {
            console.log(`⚠️  [サイズ制限] 境界マス数が制限超過 (${borderCells.length} > 32) - スキップ`);
            return false;
        }
        
        // 制約にビットマスクを追加
        const constraintsWithBitmask = this.addBitmaskToConstraints(constraints, borderCells);
        
        // 独立した部分集合を検出
        const independentSubsets = this.findIndependentSubsetsBit(borderCells, constraintsWithBitmask);
        
        if (independentSubsets.length === 0) {
            return false;
        }
        
        // 各独立部分集合を処理
        let foundActionable = false;
        for (const subset of independentSubsets) {
            const cellCount = this.popcount(subset.cellsMask);
            
            // サイズ制限チェック（完全探索可能な範囲）
            if (cellCount <= 25) {
                const hasActionable = this.solveSubsetWithCache(subset, borderCells);
                if (hasActionable) {
                    foundActionable = true;
                    break; // 確定マスが見つかったので早期終了
                }
            }
        }
        
        return foundActionable;
    }
    
    // キャッシュ付き部分集合解決
    solveSubsetWithCache(subset, borderCells) {
        // ビットベースのフィンガープリントを生成
        const fingerprint = this.getBitGroupFingerprint(subset.cellsMask, subset.constraints);
        
        // キャッシュをチェック
        if (this.groupCache.has(fingerprint)) {
            const cached = this.groupCache.get(fingerprint);
            
            // ビットマスクから該当セルを特定してキャッシュから確率を復元
            const cellIndices = this.bitmaskToArray(subset.cellsMask);
            for (let i = 0; i < cellIndices.length; i++) {
                const cellIdx = cellIndices[i];
                const cell = borderCells[cellIdx];
                const cachedProb = cached.probabilities[i];
                this.probabilities[cell.row][cell.col] = cachedProb;
            }
            
            return cached.hasActionable;
        }
        
        // キャッシュにない場合は計算
        const hasActionable = this.solveSubsetWithBits(subset, borderCells);
        
        // 結果をビット順序でキャッシュに保存
        const cellIndices = this.bitmaskToArray(subset.cellsMask);
        const probabilities = cellIndices.map(cellIdx => {
            const cell = borderCells[cellIdx];
            return this.probabilities[cell.row][cell.col];
        });
        
        this.groupCache.set(fingerprint, {
            probabilities,
            hasActionable
        });
        
        return hasActionable;
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
    
    // ビットマスクをセルインデックス配列に変換
    bitmaskToArray(mask) {
        const indices = [];
        for (let i = 0; i < 32; i++) {
            if ((mask >> i) & 1) {
                indices.push(i);
            }
        }
        return indices;
    }
    
    // ビットマスクの立っているビット数をカウント
    popcount(mask) {
        let count = 0;
        while (mask) {
            count += mask & 1;
            mask >>= 1;
        }
        return count;
    }
    
    // 制約にビットマスクを追加
    addBitmaskToConstraints(constraints, borderCells) {
        return constraints.map(constraint => {
            // セル座標をborderCells配列内のインデックスに変換
            const cellIndices = constraint.cells.map(cell => {
                const index = borderCells.findIndex(borderCell => 
                    borderCell.row === cell.row && borderCell.col === cell.col
                );
                return index;
            }).filter(index => index !== -1); // 見つからなかった場合を除外
            
            return {
                ...constraint,
                cells: cellIndices, // インデックス配列に変換
                cellsMask: this.arrayToBitmask(cellIndices)
            };
        });
    }
    
    // 独立した部分集合を検出（ビット管理版）
    findIndependentSubsetsBit(borderCells, constraints) {
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
                const cellArray = this.bitmaskToArray(relatedCellsMask);
                const isComplete = this.checkLocalConstraintCompleteness(cellArray, relatedConstraints, constraints);
                
                
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
    
    // 局所制約完全性をチェック（セル集合が独立して解けるか判定）
    checkLocalConstraintCompleteness(cellSet, constraintSet, allConstraints) {
        const cellIndices = new Set(cellSet);
        
        // 条件1: セル集合内の各セルが関与する制約が、すべて制約集合内に含まれているか
        for (const cellIdx of cellIndices) {
            // このセルが関与するすべての制約を取得
            const cellConstraints = allConstraints.filter(constraint => 
                constraint.cells.includes(cellIdx)
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
            for (const cellIdx of constraint.cells) {
                if (!cellIndices.has(cellIdx)) {
                    return false; // セル集合外のセルに制約が影響している
                }
            }
        }
        
        return true; // 完全性が確認された
    }
    
    // 局所制約完全性をビット演算でチェック
    checkLocalCompletenessWithBitmask(cellMask, constraintMask, allConstraints) {
        // 条件1: セル集合内の各セルが関与する制約が、すべて制約集合内に含まれているか
        for (let cellIdx = 0; cellIdx < 32; cellIdx++) {
            if ((cellMask >> cellIdx) & 1) {
                let cellConstraintMask = 0;
                for (let constraintIdx = 0; constraintIdx < Math.min(32, allConstraints.length); constraintIdx++) {
                    if ((allConstraints[constraintIdx].cellsMask >> cellIdx) & 1) {
                        cellConstraintMask |= (1 << constraintIdx);
                    }
                }
                
                if ((constraintMask & cellConstraintMask) !== cellConstraintMask) {
                    return false;
                }
            }
        }
        
        // 条件2: 制約集合内の各制約が影響するセルが、すべてセル集合内に含まれているか
        for (let constraintIdx = 0; constraintIdx < Math.min(32, allConstraints.length); constraintIdx++) {
            if ((constraintMask >> constraintIdx) & 1) {
                const constraintCellMask = allConstraints[constraintIdx].cellsMask;
                if ((cellMask & constraintCellMask) !== constraintCellMask) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // 独立部分集合をビット演算で解く
    solveSubsetWithBits(subset, borderCells) {
        const cellCount = this.popcount(subset.cellsMask);
        
        // 0セルの部分集合の場合は処理をスキップ
        if (cellCount === 0) {
            return false;
        }
        
        const totalConfigs = Math.pow(2, cellCount);
        const validConfigurations = [];
        
        // 全ての可能な配置を試す
        for (let config = 0; config < totalConfigs; config++) {
            if (this.isValidConfigBitmask(config, subset.constraints)) {
                validConfigurations.push(config);
            }
        }
        
        if (validConfigurations.length === 0) {
            return false;
        }
        
        // 確率を計算してセット
        let hasActionable = false;
        const cellIndices = this.bitmaskToArray(subset.cellsMask);
        
        for (let i = 0; i < cellCount; i++) {
            let mineCount = 0;
            for (const configMask of validConfigurations) {
                if ((configMask >> i) & 1) {
                    mineCount++;
                }
            }
            
            const probability = Math.round((mineCount / validConfigurations.length) * 100);
            const borderCellIdx = cellIndices[i];
            const cell = borderCells[borderCellIdx];
            
            this.probabilities[cell.row][cell.col] = probability;
            
            if (probability === 0 || probability === 100) {
                hasActionable = true;
            }
        }
        
        return hasActionable;
    }
    
    // ビットマスク形式での配置検証
    isValidConfigBitmask(mineMask, constraints) {
        for (const constraint of constraints) {
            const minesInConstraint = constraint.cellsMask & mineMask;
            const actualMines = this.popcount(minesInConstraint);
            
            if (actualMines !== constraint.expectedMines) {
                return false;
            }
        }
        return true;
    }
}

// グローバル利用可能にする
window.SimpleBitCSP = SimpleBitCSP;