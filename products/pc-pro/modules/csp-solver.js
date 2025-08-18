// CSP (制約充足問題) ソルバーモジュール
// マインスイーパーの地雷配置確率を計算

class CSPSolver {
    constructor(game) {
        this.game = game;
        this.probabilities = [];
        this.maxConstraintSize = 40; // 完全探索の最大サイズ（パフォーマンスに注意）
        this.warningThreshold = 25; // 警告を表示するセル数の閾値
    }
    
    // 各セルの地雷確率を計算
    calculateProbabilities() {
        const rows = this.game.rows;
        const cols = this.game.cols;
        
        // 確率配列を初期化 (-1: 未計算, -2: 制約外)
        this.probabilities = Array(rows).fill(null).map(() => Array(cols).fill(-1));
        
        // 統計情報を計算
        const unknownCells = this.getUnknownCells();
        const flaggedCount = this.countFlags();
        const remainingMines = this.game.mineCount - flaggedCount;
        const globalProbability = unknownCells.length > 0 
            ? Math.round((remainingMines / unknownCells.length) * 100)
            : 0;
        
        // 既に開示されたセルの確率を設定（旗は無視）
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (this.game.revealed[row][col]) {
                    this.probabilities[row][col] = 0; // 開示済みは地雷確率0%
                } else if (this.game.flagged[row][col]) {
                    this.probabilities[row][col] = 100; // 旗は地雷確率100%として扱う
                }
            }
        }
        
        // 開示されていない境界セルを収集
        const borderCells = this.getBorderCells();
        
        if (borderCells.length === 0) {
            // 境界セルがない場合（ゲーム開始時など）
            // すべてを制約外としてマーク
            for (const cell of unknownCells) {
                if (this.probabilities[cell.row][cell.col] === -1) {
                    this.probabilities[cell.row][cell.col] = -2;
                }
            }
            return { probabilities: this.probabilities, globalProbability };
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
        
        // 制約で計算されなかったセルを-2でマーク
        for (const cell of unknownCells) {
            if (this.probabilities[cell.row][cell.col] === -1) {
                this.probabilities[cell.row][cell.col] = -2; // 制約外
            }
        }
        
        return { probabilities: this.probabilities, globalProbability };
    }
    
    // 境界セル（開示されたセルに隣接する未開示セル）を取得
    getBorderCells() {
        const borderSet = new Set();
        
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (this.game.revealed[row][col] && this.game.board[row][col] > 0) {
                    // 数字セルの周囲の未開示セルを境界セルとして追加（旗も含む）
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const newRow = row + dr;
                            const newCol = col + dc;
                            
                            if (this.game.isValidCell(newRow, newCol) &&
                                !this.game.revealed[newRow][newCol] &&
                                !this.game.flagged[newRow][newCol]) {
                                // 旗が立っていないセルのみ境界セルとして扱う
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
    
    // 未開示のセルを取得（旗は除く）
    getUnknownCells() {
        const cells = [];
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (!this.game.revealed[row][col] && !this.game.flagged[row][col]) {
                    // 旗が立っていないセルのみを未開示として扱う
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
    
    // 制約グループを解く（完全探索のみ）
    solveConstraintGroup(group) {
        // 警告表示
        if (group.length > this.warningThreshold) {
            console.warn(`Large constraint group detected: ${group.length} cells. This may take some time...`);
        }
        
        // 完全探索で解く
        this.solveExact(group);
    }
    
    // 完全探索による確率計算（最適化版）
    solveExact(group) {
        // まず簡単なケースを処理
        const simpleSolution = this.trySolveSingleConstraint(group);
        if (simpleSolution) {
            for (let i = 0; i < group.length; i++) {
                this.probabilities[group[i].row][group[i].col] = simpleSolution[i];
            }
            return;
        }
        
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
        
        // STEP 1: 制約伝播で0%と100%のセルを確定
        const determinedCells = this.determineCertainCells(group, constraints);
        
        // デバッグ情報（大きなグループの場合のみ）
        if (group.length > 20) {
            console.log(`Constraint propagation: ${determinedCells.certain.length} mines, ${determinedCells.safe.length} safe cells confirmed`);
        }
        
        // 確定したセルの確率を設定
        for (const cellIdx of determinedCells.certain) {
            this.probabilities[group[cellIdx].row][group[cellIdx].col] = 100;
        }
        for (const cellIdx of determinedCells.safe) {
            this.probabilities[group[cellIdx].row][group[cellIdx].col] = 0;
        }
        
        // STEP 2: 確定していないセルだけを完全探索
        const uncertainIndices = [];
        for (let i = 0; i < group.length; i++) {
            if (!determinedCells.certain.includes(i) && !determinedCells.safe.includes(i)) {
                uncertainIndices.push(i);
            }
        }
        
        if (uncertainIndices.length === 0) {
            // すべて確定した
            return;
        }
        
        // デバッグ情報（大きなグループの場合のみ）
        if (group.length > 20) {
            console.log(`Exact search: ${uncertainIndices.length} cells (reduced from ${group.length})`);
        }
        
        // 不確定なセルのみで新しいグループと制約を作成
        const uncertainGroup = uncertainIndices.map(i => group[i]);
        const uncertainConstraints = this.adjustConstraintsForUncertain(
            constraints, 
            uncertainIndices, 
            determinedCells.certain
        );
        
        // グループが大きすぎる場合の警告と処理
        if (uncertainIndices.length > 30) {
            console.warn(`Large uncertain group (${uncertainIndices.length} cells). Using optimized DFS...`);
            this.solveReducedGroupOptimized(uncertainGroup, uncertainConstraints, uncertainIndices, group);
            return;
        }
        
        // 不確定なセルのみで完全探索
        this.solveReducedGroup(uncertainGroup, uncertainConstraints, uncertainIndices, group);
    }
    
    // 制約伝播で確定できるセルを見つける
    determineCertainCells(group, constraints) {
        const certain = new Set(); // 100%地雷
        const safe = new Set();    // 0%安全
        let changed = true;
        
        // 制約を繰り返し適用して確定セルを見つける
        while (changed) {
            changed = false;
            
            for (const constraint of constraints) {
                const unknownInConstraint = [];
                let minesInConstraint = 0; // 旗は既にrequiredMinesから引かれているので0から開始
                
                // この制約に関わるセルの状態を確認
                for (const cellIdx of constraint.cells) {
                    if (certain.has(cellIdx)) {
                        minesInConstraint++;
                    } else if (!safe.has(cellIdx)) {
                        unknownInConstraint.push(cellIdx);
                    }
                }
                
                const remainingMines = constraint.requiredMines - minesInConstraint;
                
                // すべて地雷の場合
                if (remainingMines === unknownInConstraint.length && unknownInConstraint.length > 0) {
                    for (const idx of unknownInConstraint) {
                        if (!certain.has(idx)) {
                            certain.add(idx);
                            changed = true;
                        }
                    }
                }
                
                // すべて安全の場合
                if (remainingMines === 0 && unknownInConstraint.length > 0) {
                    for (const idx of unknownInConstraint) {
                        if (!safe.has(idx)) {
                            safe.add(idx);
                            changed = true;
                        }
                    }
                }
            }
        }
        
        return {
            certain: Array.from(certain),
            safe: Array.from(safe)
        };
    }
    
    // 不確定セル用に制約を調整
    adjustConstraintsForUncertain(constraints, uncertainIndices, certainMines) {
        const indexMap = new Map();
        for (let i = 0; i < uncertainIndices.length; i++) {
            indexMap.set(uncertainIndices[i], i);
        }
        
        const adjustedConstraints = [];
        
        for (const constraint of constraints) {
            const newCells = [];
            let additionalMines = 0;
            
            for (const cellIdx of constraint.cells) {
                if (indexMap.has(cellIdx)) {
                    newCells.push(indexMap.get(cellIdx));
                } else if (certainMines.includes(cellIdx)) {
                    additionalMines++;
                }
            }
            
            if (newCells.length > 0) {
                adjustedConstraints.push({
                    cells: newCells,
                    requiredMines: constraint.requiredMines - additionalMines,
                    flaggedCount: 0, // 旗は既にrequiredMinesから引かれているので0にする
                    numberCell: constraint.numberCell
                });
            }
        }
        
        return adjustedConstraints;
    }
    
    // 縮小されたグループを完全探索
    solveReducedGroup(uncertainGroup, constraints, originalIndices, fullGroup) {
        const validConfigurations = [];
        const totalConfigs = Math.pow(2, uncertainGroup.length);
        
        // プログレス表示（大きなグループの場合）
        let progressCounter = 0;
        const progressInterval = Math.floor(totalConfigs / 100);
        
        // すべての可能な配置を試す
        for (let config = 0; config < totalConfigs; config++) {
            if (uncertainGroup.length > 15 && progressInterval > 0 && config % progressInterval === 0) {
                progressCounter++;
                if (progressCounter % 10 === 0) {
                    console.log(`Progress: ${progressCounter}%`);
                }
            }
            
            const mines = [];
            for (let i = 0; i < uncertainGroup.length; i++) {
                if ((config >> i) & 1) {
                    mines.push(i);
                }
            }
            
            if (this.isValidConfiguration(uncertainGroup, mines, constraints)) {
                validConfigurations.push(mines);
            }
        }
        
        // 有効な配置から確率を計算
        if (validConfigurations.length > 0) {
            for (let i = 0; i < uncertainGroup.length; i++) {
                let mineCount = 0;
                for (const config of validConfigurations) {
                    if (config.includes(i)) {
                        mineCount++;
                    }
                }
                const probability = (mineCount / validConfigurations.length) * 100;
                const originalIdx = originalIndices[i];
                this.probabilities[fullGroup[originalIdx].row][fullGroup[originalIdx].col] = Math.round(probability);
            }
        } else {
            // デフォルト値
            for (let i = 0; i < uncertainGroup.length; i++) {
                const originalIdx = originalIndices[i];
                this.probabilities[fullGroup[originalIdx].row][fullGroup[originalIdx].col] = 50;
            }
        }
    }
    
    // 縮小されたグループの最適化版
    solveReducedGroupOptimized(uncertainGroup, constraints, originalIndices, fullGroup) {
        // 枝刈りを使った深さ優先探索
        const validConfigurations = [];
        const currentConfig = [];
        
        const remainingMines = this.game.mineCount - this.countFlags();
        const certainCount = fullGroup.length - originalIndices.length;
        const maxMinesInUncertain = Math.min(remainingMines, uncertainGroup.length);
        
        const dfs = (index, minesUsed) => {
            // 上限チェック
            if (validConfigurations.length > 100000) {
                console.warn("Too many valid configurations found. Stopping early.");
                return false;
            }
            
            if (index === uncertainGroup.length) {
                if (this.isValidConfiguration(uncertainGroup, currentConfig, constraints)) {
                    validConfigurations.push([...currentConfig]);
                }
                return true;
            }
            
            // 残り地雷数による枝刈り
            const remainingCells = uncertainGroup.length - index;
            if (minesUsed + remainingCells < 0 || minesUsed > maxMinesInUncertain) {
                return true;
            }
            
            // このセルに地雷を置かない場合
            dfs(index + 1, minesUsed);
            
            // このセルに地雷を置く場合
            if (minesUsed < maxMinesInUncertain) {
                currentConfig.push(index);
                dfs(index + 1, minesUsed + 1);
                currentConfig.pop();
            }
            
            return true;
        };
        
        dfs(0, 0);
        
        // 有効な配置から確率を計算
        if (validConfigurations.length > 0) {
            for (let i = 0; i < uncertainGroup.length; i++) {
                let mineCount = 0;
                for (const config of validConfigurations) {
                    if (config.includes(i)) {
                        mineCount++;
                    }
                }
                const probability = (mineCount / validConfigurations.length) * 100;
                const originalIdx = originalIndices[i];
                this.probabilities[fullGroup[originalIdx].row][fullGroup[originalIdx].col] = Math.round(probability);
            }
        } else {
            for (let i = 0; i < uncertainGroup.length; i++) {
                const originalIdx = originalIndices[i];
                this.probabilities[fullGroup[originalIdx].row][fullGroup[originalIdx].col] = 50;
            }
        }
    }
    
    // 最適化された完全探索（巨大グループ用）
    solveExactOptimized(group, constraints) {
        // 枝刈りを使った深さ優先探索
        const validConfigurations = [];
        const currentConfig = [];
        
        const dfs = (index, remainingMinesGlobal) => {
            // 上限チェック（メモリ保護）
            if (validConfigurations.length > 100000) {
                console.warn("Too many valid configurations found. Stopping early.");
                return false;
            }
            
            if (index === group.length) {
                // 完全な配置が見つかった
                if (this.isValidConfiguration(group, currentConfig, constraints)) {
                    validConfigurations.push([...currentConfig]);
                }
                return true;
            }
            
            // 残り地雷数による枝刈り
            const remainingCells = group.length - index;
            if (remainingMinesGlobal > remainingCells) {
                return true; // 地雷が多すぎる
            }
            
            // このセルに地雷を置かない場合
            if (this.canPlaceEmpty(group, index, currentConfig, constraints)) {
                dfs(index + 1, remainingMinesGlobal);
            }
            
            // このセルに地雷を置く場合
            if (remainingMinesGlobal > 0 && this.canPlaceMine(group, index, currentConfig, constraints)) {
                currentConfig.push(index);
                dfs(index + 1, remainingMinesGlobal - 1);
                currentConfig.pop();
            }
            
            return true;
        };
        
        const remainingMines = this.game.mineCount - this.countFlags();
        dfs(0, remainingMines);
        
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
            // デフォルト値
            for (const cell of group) {
                this.probabilities[cell.row][cell.col] = 50;
            }
        }
    }
    
    // 枝刈り用のヘルパー関数
    canPlaceEmpty(group, index, currentConfig, constraints) {
        // 簡単な制約チェック
        return true; // より詳細な実装は必要に応じて追加
    }
    
    canPlaceMine(group, index, currentConfig, constraints) {
        // 簡単な制約チェック
        for (const constraint of constraints) {
            if (constraint.cells.includes(index)) {
                const currentMinesInConstraint = currentConfig.filter(i => constraint.cells.includes(i)).length;
                if (currentMinesInConstraint + 1 > constraint.requiredMines) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // 単一制約の簡単なケースを処理
    trySolveSingleConstraint(group) {
        // すべてのセルが同じ数字セルに隣接しているかチェック
        if (group.length === 0) return null;
        
        let commonConstraint = null;
        for (const cell of group) {
            const constraints = this.getConstrainingCells(cell);
            if (constraints.length !== 1) return null; // 複数の制約がある場合はスキップ
            
            if (!commonConstraint) {
                commonConstraint = constraints[0];
            } else if (commonConstraint.row !== constraints[0].row || 
                      commonConstraint.col !== constraints[0].col) {
                return null; // 異なる制約セルの場合はスキップ
            }
        }
        
        if (!commonConstraint) return null;
        
        // 共通の制約セルの周囲の状態を確認
        const flaggedCount = this.countFlaggedNeighbors(commonConstraint.row, commonConstraint.col);
        const unknownCount = this.countUnknownNeighbors(commonConstraint.row, commonConstraint.col);
        const remainingMines = commonConstraint.value - flaggedCount;
        
        const probabilities = new Array(group.length);
        
        if (remainingMines === 0) {
            // すべて安全
            probabilities.fill(0);
        } else if (remainingMines === unknownCount) {
            // すべて地雷
            probabilities.fill(100);
        } else if (remainingMines > 0 && remainingMines < unknownCount) {
            // 確率計算
            const probability = Math.round((remainingMines / unknownCount) * 100);
            probabilities.fill(probability);
        } else {
            return null; // 不正な状態
        }
        
        return probabilities;
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
            
            // 必要な地雷数をチェック（旗の数は既に引かれている）
            if (actualMines !== constraint.requiredMines) {
                return false;
            }
            
            // 必要な地雷数が未開示セル数を超える場合
            const maxPossibleMines = constraint.cells.length;
            if (constraint.requiredMines > maxPossibleMines) {
                return false;
            }
        }
        
        // 残り地雷数の制約もチェック
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
        const groupCellSet = new Set(group.map(c => `${c.row},${c.col}`));
        
        // グループに影響を与えるすべての数字セルを収集
        const relevantNumberCells = new Set();
        for (const cell of group) {
            const constrainingCells = this.getConstrainingCells(cell);
            for (const constraining of constrainingCells) {
                relevantNumberCells.add(`${constraining.row},${constraining.col},${constraining.value}`);
            }
        }
        
        // 各数字セルから制約を作成
        for (const numberCellStr of relevantNumberCells) {
            const [row, col, value] = numberCellStr.split(',').map(Number);
            
            // この数字セルの周囲の未開示セルを収集（旗も含む）
            const affectedCells = [];
            
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    if (this.game.isValidCell(newRow, newCol)) {
                        if (!this.game.revealed[newRow][newCol] && !this.game.flagged[newRow][newCol]) {
                            // グループ内のセルかチェック（旗は除く）
                            const cellKey = `${newRow},${newCol}`;
                            if (groupCellSet.has(cellKey)) {
                                const index = group.findIndex(c => c.row === newRow && c.col === newCol);
                                if (index !== -1) {
                                    affectedCells.push(index);
                                }
                            }
                        }
                    }
                }
            }
            
            if (affectedCells.length > 0) {
                const flaggedCount = this.countFlaggedNeighbors(row, col);
                constraints.push({
                    cells: affectedCells,
                    requiredMines: value - flaggedCount, // 旗の数を引いた必要地雷数
                    flaggedCount: flaggedCount,
                    numberCell: { row, col, value }
                });
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
    
    // 残りのセルのマーキング（制約外としてマーク）
    markRemainingCells(unknownCells, borderCells) {
        // このメソッドは削除または空実装に
        // 実際の処理はcalculateProbabilities内で完了
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
        // このメソッドは現在使用されていません
        // 代わりに-2でマークして、全体確率を別途表示
    }
    
    // 旗の数をカウント
    countFlags() {
        let count = 0;
        for (let row = 0; row < this.game.rows; row++) {
            for (let col = 0; col < this.game.cols; col++) {
                if (this.game.flagged[row][col]) {
                    count++;
                }
            }
        }
        return count;
    }
    
    // 未開示の隣接セル数をカウント（旗は除く）
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
                    // 旗が立っていないセルのみを未開示として数える
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