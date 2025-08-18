// CSP (制約充足問題) ソルバーモジュール
// マインスイーパーの地雷配置確率を計算

class CSPSolver {
    constructor(game) {
        this.game = game;
        this.probabilities = [];
        this.maxSamples = 10000; // モンテカルロサンプリング数
        this.maxConstraintSize = 25; // 制約グループの最大サイズ
    }
    
    // 各セルの地雷確率を計算
    calculateProbabilities() {
        const rows = this.game.rows;
        const cols = this.game.cols;
        
        // 確率配列を初期化
        this.probabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        
        // 開示されていない境界セルを収集
        const borderCells = this.getBorderCells();
        const unknownCells = this.getUnknownCells();
        
        // 既に開示されたセルと旗が立っているセルの確率を設定
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (this.game.revealed[row][col]) {
                    this.probabilities[row][col] = 0; // 開示済みは地雷確率0%
                } else if (this.game.flagged[row][col]) {
                    this.probabilities[row][col] = 100; // 旗付きは地雷確率100%
                }
            }
        }
        
        if (borderCells.length === 0) {
            // 境界セルがない場合（ゲーム開始時など）
            this.calculateUniformProbabilities(unknownCells);
            return this.probabilities;
        }
        
        // 制約グループに分割
        const constraintGroups = this.partitionIntoConstraintGroups(borderCells);
        
        // 各グループごとに確率を計算
        for (const group of constraintGroups) {
            if (group.length <= this.maxConstraintSize) {
                this.solveConstraintGroup(group);
            } else {
                // グループが大きすぎる場合は近似計算
                this.approximateConstraintGroup(group);
            }
        }
        
        // 境界外のセルの確率を計算
        this.calculateRemainingProbabilities(unknownCells, borderCells);
        
        return this.probabilities;
    }
    
    // 境界セル（開示されたセルに隣接する未開示セル）を取得
    getBorderCells() {
        const borderSet = new Set();
        
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    // 数字セルの周囲の未開示セルを境界セルとして追加
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const newRow = row + dr;
                            const newCol = col + dc;
                            
                            if (this.game.isValidCell(newRow, newCol) &&
                                !this.game.revealed[newRow][newCol] &&
                                !this.game.flagged[newRow][newCol]) {
                                borderSet.add(`${newRow},${newCol}`);
                            }
                        }
                    }
                }
            }
        }
        
        return Array.from(borderSet).map(key => {
            const [row, col] = key.split(',').map(Number);
            return { row, col };
        });
    }
    
    // 未開示かつ旗なしのセルを取得
    getUnknownCells() {
        const cells = [];
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (!this.game.revealed[row][col] && !this.game.flagged[row][col]) {
                    cells.push({ row, col });
                }
            }
        }
        return cells;
    }
    
    // 制約グループに分割（連結成分を見つける）
    partitionIntoConstraintGroups(borderCells) {
        const groups = [];
        const visited = new Set();
        const borderCellsSet = new Set(borderCells.map(c => `${c.row},${c.col}`));
        
        for (const cell of borderCells) {
            const key = `${cell.row},${cell.col}`;
            if (visited.has(key)) continue;
            
            const group = [];
            const queue = [cell];
            const groupSet = new Set([key]);
            visited.add(key);
            
            while (queue.length > 0) {
                const current = queue.shift();
                group.push(current);
                
                // この境界セルに制約を与える数字セルを見つける
                const constrainingCells = this.getConstrainingCells(current);
                
                // 各制約セルから、その周りの境界セルを探す
                for (const constraining of constrainingCells) {
                    // 制約セルの周りのすべての境界セルを同じグループに追加
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const newRow = constraining.row + dr;
                            const newCol = constraining.col + dc;
                            const newKey = `${newRow},${newCol}`;
                            
                            // 境界セルであり、まだ訪問していない場合
                            if (borderCellsSet.has(newKey) && !groupSet.has(newKey)) {
                                visited.add(newKey);
                                groupSet.add(newKey);
                                queue.push({ row: newRow, col: newCol });
                            }
                        }
                    }
                }
            }
            
            groups.push(group);
        }
        
        return groups;
    }
    
    // 指定セルに制約を与える数字セルを取得
    getConstrainingCells(cell) {
        const constraining = [];
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const row = cell.row + dr;
                const col = cell.col + dc;
                
                if (this.game.isValidCell(row, col) &&
                    this.game.revealed[row][col] &&
                    this.game.board[row][col] > 0) {
                    constraining.push({ row, col, value: this.game.board[row][col] });
                }
            }
        }
        
        return constraining;
    }
    
    // 制約グループを解く（完全探索またはモンテカルロ）
    solveConstraintGroup(group) {
        if (group.length <= 15) {
            // 小さいグループは完全探索
            this.solveExact(group);
        } else {
            // 大きいグループはモンテカルロ法
            this.solveMonteCarlo(group);
        }
    }
    
    // 完全探索による確率計算
    solveExact(group) {
        const constraints = this.getConstraintsForGroup(group);
        
        // 制約がない場合は均等確率を割り当て
        if (constraints.length === 0) {
            const remainingMines = this.game.mineCount - this.countFlags();
            const unknownCount = this.getUnknownCells().length;
            const probability = Math.min(100, Math.round((remainingMines / unknownCount) * 100));
            
            for (const cell of group) {
                this.probabilities[cell.row][cell.col] = probability;
            }
            return;
        }
        
        const validConfigurations = [];
        const totalConfigs = Math.pow(2, group.length);
        
        // すべての可能な配置を試す
        for (let config = 0; config < totalConfigs; config++) {
            const mines = [];
            for (let i = 0; i < group.length; i++) {
                if ((config >> i) & 1) {
                    mines.push(i);
                }
            }
            
            if (this.isValidConfiguration(group, mines, constraints)) {
                validConfigurations.push(mines);
            }
        }
        
        // 有効な配置から確率を計算
        if (validConfigurations.length > 0) {
            for (let i = 0; i < group.length; i++) {
                let mineCount = 0;
                for (const config of validConfigurations) {
                    if (config.includes(i)) {
                        mineCount++;
                    }
                }
                const probability = (mineCount / validConfigurations.length) * 100;
                this.probabilities[group[i].row][group[i].col] = Math.round(probability);
            }
        } else {
            // 有効な配置がない場合（矛盾がある場合）
            console.warn('No valid configurations found for group');
            for (const cell of group) {
                this.probabilities[cell.row][cell.col] = 50; // デフォルト値
            }
        }
    }
    
    // モンテカルロ法による確率計算
    solveMonteCarlo(group) {
        const constraints = this.getConstraintsForGroup(group);
        
        // 制約がない場合は均等確率を割り当て
        if (constraints.length === 0) {
            const remainingMines = this.game.mineCount - this.countFlags();
            const unknownCount = this.getUnknownCells().length;
            const probability = Math.min(100, Math.round((remainingMines / unknownCount) * 100));
            
            for (const cell of group) {
                this.probabilities[cell.row][cell.col] = probability;
            }
            return;
        }
        
        const samples = [];
        let validSamples = 0;
        
        // ランダムサンプリング
        for (let sample = 0; sample < this.maxSamples; sample++) {
            const mines = [];
            for (let i = 0; i < group.length; i++) {
                if (Math.random() < 0.5) {
                    mines.push(i);
                }
            }
            
            if (this.isValidConfiguration(group, mines, constraints)) {
                samples.push(mines);
                validSamples++;
            }
        }
        
        // サンプルから確率を計算
        if (validSamples > 0) {
            for (let i = 0; i < group.length; i++) {
                let mineCount = 0;
                for (const config of samples) {
                    if (config.includes(i)) {
                        mineCount++;
                    }
                }
                const probability = (mineCount / validSamples) * 100;
                this.probabilities[group[i].row][group[i].col] = Math.round(probability);
            }
        } else {
            // 有効なサンプルがない場合
            for (const cell of group) {
                this.probabilities[cell.row][cell.col] = 50; // デフォルト値
            }
        }
    }
    
    // 配置が制約を満たすかチェック
    isValidConfiguration(group, mineIndices, constraints) {
        // 各制約をチェック
        for (const constraint of constraints) {
            let actualMines = 0;
            
            for (const cellIndex of constraint.cells) {
                if (mineIndices.includes(cellIndex)) {
                    actualMines++;
                }
            }
            
            // 既に配置されている旗も考慮
            actualMines += constraint.flaggedCount;
            
            if (actualMines !== constraint.requiredMines) {
                return false;
            }
        }
        
        // 残り地雷数の制約もチェック
        const totalMines = mineIndices.length + this.countFlags();
        const remainingMines = this.game.mineCount - this.countFlags();
        
        if (mineIndices.length > remainingMines) {
            return false;
        }
        
        return true;
    }
    
    // グループの制約を取得
    getConstraintsForGroup(group) {
        const constraints = [];
        const processedCells = new Set();
        
        // グループ内の各セルに影響する数字セルから制約を作成
        for (const cell of group) {
            const constrainingCells = this.getConstrainingCells(cell);
            
            for (const constraining of constrainingCells) {
                const key = `${constraining.row},${constraining.col}`;
                if (processedCells.has(key)) continue;
                processedCells.add(key);
                
                // この数字セルの周囲の未開示セルを収集
                const affectedCells = [];
                let flaggedCount = 0;
                
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const newRow = constraining.row + dr;
                        const newCol = constraining.col + dc;
                        
                        if (this.game.isValidCell(newRow, newCol)) {
                            if (this.game.flagged[newRow][newCol]) {
                                flaggedCount++;
                            } else if (!this.game.revealed[newRow][newCol]) {
                                // グループ内のセルのインデックスを見つける
                                const index = group.findIndex(c => c.row === newRow && c.col === newCol);
                                if (index !== -1) {
                                    affectedCells.push(index);
                                }
                            }
                        }
                    }
                }
                
                if (affectedCells.length > 0) {
                    constraints.push({
                        cells: affectedCells,
                        requiredMines: constraining.value,
                        flaggedCount: flaggedCount
                    });
                }
            }
        }
        
        return constraints;
    }
    
    // 近似計算（グループが大きすぎる場合）
    approximateConstraintGroup(group) {
        // 簡単なヒューリスティック：各セルの局所的な制約から確率を推定
        for (const cell of group) {
            const constraints = this.getConstrainingCells(cell);
            if (constraints.length === 0) continue;
            
            let minProbability = 0;
            let maxProbability = 100;
            
            for (const constraint of constraints) {
                const unknownNeighbors = this.countUnknownNeighbors(constraint.row, constraint.col);
                const flaggedNeighbors = this.countFlaggedNeighbors(constraint.row, constraint.col);
                const remainingMines = constraint.value - flaggedNeighbors;
                
                if (unknownNeighbors > 0) {
                    const localProbability = (remainingMines / unknownNeighbors) * 100;
                    minProbability = Math.max(minProbability, Math.max(0, localProbability - 20));
                    maxProbability = Math.min(maxProbability, Math.min(100, localProbability + 20));
                }
            }
            
            this.probabilities[cell.row][cell.col] = Math.round((minProbability + maxProbability) / 2);
        }
    }
    
    // 境界外のセルの確率を計算
    calculateRemainingProbabilities(unknownCells, borderCells) {
        const borderSet = new Set(borderCells.map(c => `${c.row},${c.col}`));
        
        // 残り地雷数を計算
        const flaggedCount = this.countFlags();
        const borderMineEstimate = this.estimateBorderMines(borderCells);
        const remainingMines = Math.max(0, this.game.mineCount - flaggedCount - borderMineEstimate);
        
        // 境界セル以外のすべての未開示セルに確率を割り当て
        for (const cell of unknownCells) {
            // 既に確率が計算されていない場合のみ
            if (this.probabilities[cell.row][cell.col] === -1) {
                // 境界セルかどうかチェック
                if (borderSet.has(`${cell.row},${cell.col}`)) {
                    // 境界セルだが確率が計算されていない場合
                    // これは制約グループに含まれなかったセルなので、デフォルト値を設定
                    const localConstraints = this.getConstrainingCells(cell);
                    if (localConstraints.length > 0) {
                        // 局所的な制約から簡単な推定
                        let sumProbability = 0;
                        let count = 0;
                        
                        for (const constraint of localConstraints) {
                            const unknownNeighbors = this.countUnknownNeighbors(constraint.row, constraint.col);
                            const flaggedNeighbors = this.countFlaggedNeighbors(constraint.row, constraint.col);
                            const remainingLocalMines = constraint.value - flaggedNeighbors;
                            
                            if (unknownNeighbors > 0) {
                                sumProbability += (remainingLocalMines / unknownNeighbors) * 100;
                                count++;
                            }
                        }
                        
                        if (count > 0) {
                            this.probabilities[cell.row][cell.col] = Math.round(sumProbability / count);
                        } else {
                            this.probabilities[cell.row][cell.col] = 25; // デフォルト値
                        }
                    } else {
                        this.probabilities[cell.row][cell.col] = 25; // デフォルト値
                    }
                } else {
                    // 境界外のセル
                    const remainingUnknownCount = unknownCells.length - borderCells.length;
                    if (remainingUnknownCount > 0) {
                        const probability = Math.min(100, Math.round((remainingMines / remainingUnknownCount) * 100));
                        this.probabilities[cell.row][cell.col] = probability;
                    } else {
                        this.probabilities[cell.row][cell.col] = 0;
                    }
                }
            }
        }
    }
    
    // 境界セルの地雷数を推定
    estimateBorderMines(borderCells) {
        let estimate = 0;
        for (const cell of borderCells) {
            const prob = this.probabilities[cell.row][cell.col];
            if (prob >= 0) {
                estimate += prob / 100;
            }
        }
        return Math.round(estimate);
    }
    
    // 均等確率を計算（ゲーム開始時など）
    calculateUniformProbabilities(unknownCells) {
        const remainingMines = this.game.mineCount - this.countFlags();
        const probability = Math.round((remainingMines / unknownCells.length) * 100);
        
        for (const cell of unknownCells) {
            if (this.probabilities[cell.row][cell.col] === -1) {
                this.probabilities[cell.row][cell.col] = probability;
            }
        }
    }
    
    // 旗の数をカウント
    countFlags() {
        let count = 0;
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (this.game.flagged[row][col]) count++;
            }
        }
        return count;
    }
    
    // 未開示の隣接セル数をカウント
    countUnknownNeighbors(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (this.game.isValidCell(newRow, newCol) &&
                    !this.game.revealed[newRow][newCol] &&
                    !this.game.flagged[newRow][newCol]) {
                    count++;
                }
            }
        }
        return count;
    }
    
    // 旗付きの隣接セル数をカウント
    countFlaggedNeighbors(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (this.game.isValidCell(newRow, newCol) &&
                    this.game.flagged[newRow][newCol]) {
                    count++;
                }
            }
        }
        return count;
    }
}