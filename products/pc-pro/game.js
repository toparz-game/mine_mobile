// PCProMinesweeper: PCMinesweeperを継承したPRO版の実装
class PCProMinesweeper extends PCMinesweeper {
    constructor() {
        super();
        
        // PRO版専用の機能
        this.statistics = {
            gamesPlayed: 0,
            gamesWon: 0,
            bestTimes: {},
            currentStreak: 0,
            bestStreak: 0,
            totalPlayTime: 0
        };
        
        // リプレイ機能
        this.replayData = [];
        this.isReplaying = false;
        this.isRecording = true;
        
        // ヒント機能
        this.hintsUsed = 0;
        this.maxHints = 3;
        
        // アンドゥ/リドゥ機能
        this.moveHistory = [];
        this.redoHistory = [];
        this.maxHistorySize = 50;
        
        // チャレンジモード
        this.challengeMode = null;
        this.dailyChallengeSeed = null;
        
        // カスタムテーマ
        this.customThemes = {
            classic: { name: 'クラシック', primary: '#2196F3', secondary: '#FF9800' },
            ocean: { name: 'オーシャン', primary: '#006994', secondary: '#00ACC1' },
            forest: { name: 'フォレスト', primary: '#2E7D32', secondary: '#66BB6A' },
            sunset: { name: 'サンセット', primary: '#E65100', secondary: '#FFB74D' },
            galaxy: { name: 'ギャラクシー', primary: '#4A148C', secondary: '#AB47BC' }
        };
        this.currentTheme = 'classic';
        
        // サウンド設定
        this.soundEnabled = false;
        this.sounds = {};
        
        // CSPソルバー
        this.cspSolver = null;
        this.probabilityMode = false;
        
        this.initPro();
    }
    
    initPro() {
        this.loadStatistics();
        this.loadSettings();
        this.setupProEventListeners();
        this.initSounds();
        this.initCSPSolver();
    }
    
    setupProEventListeners() {
        // 統計ボタン
        const statsBtn = document.getElementById('stats-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStatistics());
        }
        
        // ヒントボタン
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.useHint());
        }
        
        // アンドゥ/リドゥボタン
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }
        
        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.redo());
        }
        
        // リプレイボタン
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.toggleReplay());
        }
        
        // チャレンジモードボタン
        const challengeBtn = document.getElementById('challenge-btn');
        if (challengeBtn) {
            challengeBtn.addEventListener('click', () => this.showChallengeMenu());
        }
        
        // テーマ選択
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => this.applyTheme(e.target.value));
        }
        
        // サウンドトグル
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => this.toggleSound());
        }
        
        // 確率表示ボタン
        const probabilityBtn = document.getElementById('probability-btn');
        if (probabilityBtn) {
            probabilityBtn.addEventListener('click', () => this.toggleProbabilityMode());
        }
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'z':
                        e.preventDefault();
                        this.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.useHint();
                        break;
                    case 's':
                        e.preventDefault();
                        this.showStatistics();
                        break;
                }
            }
        });
    }
    
    // 統計機能
    loadStatistics() {
        const saved = localStorage.getItem('minesweeper-pro-statistics');
        if (saved) {
            this.statistics = JSON.parse(saved);
        }
    }
    
    saveStatistics() {
        localStorage.setItem('minesweeper-pro-statistics', JSON.stringify(this.statistics));
    }
    
    updateStatistics(won) {
        this.statistics.gamesPlayed++;
        
        if (won) {
            this.statistics.gamesWon++;
            this.statistics.currentStreak++;
            if (this.statistics.currentStreak > this.statistics.bestStreak) {
                this.statistics.bestStreak = this.statistics.currentStreak;
            }
            
            // ベストタイムの更新
            const difficulty = this.currentDifficulty;
            if (!this.statistics.bestTimes[difficulty] || this.timer < this.statistics.bestTimes[difficulty]) {
                this.statistics.bestTimes[difficulty] = this.timer;
            }
        } else {
            this.statistics.currentStreak = 0;
        }
        
        this.saveStatistics();
    }
    
    showStatistics() {
        const modal = document.getElementById('stats-modal');
        if (!modal) return;
        
        const content = document.getElementById('stats-content');
        if (content) {
            const winRate = this.statistics.gamesPlayed > 0 
                ? Math.round((this.statistics.gamesWon / this.statistics.gamesPlayed) * 100) 
                : 0;
            
            let bestTimesHTML = '<h3>ベストタイム</h3><ul>';
            const difficultyNames = {
                'easy': '初級',
                'medium': '中級',
                'hard': '上級',
                'hiddeneasy': '裏初級',
                'hiddenmedium': '裏中級',
                'hiddenhard': '裏上級',
                'extreme': '極悪'
            };
            
            for (const [diff, time] of Object.entries(this.statistics.bestTimes)) {
                const minutes = Math.floor(time / 60);
                const seconds = time % 60;
                const timeStr = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
                bestTimesHTML += `<li>${difficultyNames[diff] || diff}: ${timeStr}</li>`;
            }
            bestTimesHTML += '</ul>';
            
            content.innerHTML = `
                <h2>統計情報</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">プレイ回数</span>
                        <span class="stat-value">${this.statistics.gamesPlayed}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">勝利回数</span>
                        <span class="stat-value">${this.statistics.gamesWon}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">勝率</span>
                        <span class="stat-value">${winRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">現在の連勝</span>
                        <span class="stat-value">${this.statistics.currentStreak}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最高連勝</span>
                        <span class="stat-value">${this.statistics.bestStreak}</span>
                    </div>
                </div>
                ${bestTimesHTML}
                <button onclick="game.closeStatsModal()">閉じる</button>
            `;
        }
        
        modal.classList.add('show');
    }
    
    closeStatsModal() {
        const modal = document.getElementById('stats-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    // ヒント機能
    useHint() {
        if (this.gameOver || this.gameWon || this.hintsUsed >= this.maxHints) {
            return;
        }
        
        // 安全なセルを探す
        const safeCells = this.findSafeCells();
        if (safeCells.length > 0) {
            const randomSafe = safeCells[Math.floor(Math.random() * safeCells.length)];
            const cell = document.querySelector(`[data-row="${randomSafe.row}"][data-col="${randomSafe.col}"]`);
            if (cell) {
                cell.classList.add('hint-highlight');
                setTimeout(() => {
                    cell.classList.remove('hint-highlight');
                }, 2000);
            }
            this.hintsUsed++;
            this.updateHintButton();
            if (this.soundEnabled) this.playSound('hint');
        }
    }
    
    findSafeCells() {
        const safeCells = [];
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.revealed[row][col] && this.board[row][col] > 0) {
                    const neighbors = this.getNeighbors(row, col);
                    const unrevealed = neighbors.filter(n => !this.revealed[n.row][n.col]);
                    const flagged = neighbors.filter(n => this.flagged[n.row][n.col]);
                    
                    if (flagged.length === this.board[row][col]) {
                        // すべての地雷が特定されている場合、残りは安全
                        unrevealed.forEach(n => {
                            if (!this.flagged[n.row][n.col]) {
                                safeCells.push(n);
                            }
                        });
                    }
                }
            }
        }
        
        return safeCells;
    }
    
    getNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isValidCell(newRow, newCol)) {
                    neighbors.push({ row: newRow, col: newCol });
                }
            }
        }
        return neighbors;
    }
    
    updateHintButton() {
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.textContent = `💡 ヒント (${this.maxHints - this.hintsUsed})`;
            if (this.hintsUsed >= this.maxHints) {
                hintBtn.disabled = true;
            }
        }
    }
    
    // アンドゥ/リドゥ機能
    saveMove(move) {
        if (this.moveHistory.length >= this.maxHistorySize) {
            this.moveHistory.shift();
        }
        this.moveHistory.push(move);
        this.redoHistory = [];
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.moveHistory.length === 0 || this.gameOver || this.isReplaying) return;
        
        const move = this.moveHistory.pop();
        this.redoHistory.push(move);
        
        // 移動を元に戻す
        this.applyMove(move, true);
        this.updateUndoRedoButtons();
        
        if (this.soundEnabled) this.playSound('undo');
    }
    
    redo() {
        if (this.redoHistory.length === 0 || this.gameOver || this.isReplaying) return;
        
        const move = this.redoHistory.pop();
        this.moveHistory.push(move);
        
        // 移動を再適用
        this.applyMove(move, false);
        this.updateUndoRedoButtons();
        
        if (this.soundEnabled) this.playSound('redo');
    }
    
    applyMove(move, isUndo) {
        // 移動の適用/取り消しロジック
        // この実装は簡略化されており、実際にはより複雑になります
        const { type, row, col, previousState } = move;
        
        if (type === 'reveal') {
            if (isUndo) {
                this.revealed[row][col] = false;
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.remove('revealed');
                    cell.textContent = '';
                }
            } else {
                this.revealCell(row, col);
            }
        } else if (type === 'flag') {
            this.toggleFlag(row, col);
        }
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.moveHistory.length === 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.redoHistory.length === 0;
        }
    }
    
    // リプレイ機能
    startRecording() {
        this.isRecording = true;
        this.replayData = [];
    }
    
    stopRecording() {
        this.isRecording = false;
    }
    
    recordAction(action) {
        if (this.isRecording && !this.isReplaying) {
            this.replayData.push({
                ...action,
                timestamp: Date.now(),
                timer: this.timer
            });
        }
    }
    
    toggleReplay() {
        if (this.isReplaying) {
            this.stopReplay();
        } else {
            this.startReplay();
        }
    }
    
    startReplay() {
        if (this.replayData.length === 0) return;
        
        this.isReplaying = true;
        this.newGame();
        
        let index = 0;
        const replayInterval = setInterval(() => {
            if (index >= this.replayData.length || !this.isReplaying) {
                clearInterval(replayInterval);
                this.isReplaying = false;
                return;
            }
            
            const action = this.replayData[index];
            this.applyReplayAction(action);
            index++;
        }, 500);
        
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.textContent = '⏸ 停止';
        }
    }
    
    stopReplay() {
        this.isReplaying = false;
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.textContent = '▶ リプレイ';
        }
    }
    
    applyReplayAction(action) {
        // リプレイアクションの適用
        if (action.type === 'reveal') {
            this.revealCell(action.row, action.col);
        } else if (action.type === 'flag') {
            this.toggleFlag(action.row, action.col);
        }
    }
    
    // チャレンジモード
    showChallengeMenu() {
        const modal = document.getElementById('challenge-modal');
        if (!modal) return;
        
        const content = document.getElementById('challenge-content');
        if (content) {
            content.innerHTML = `
                <h2>チャレンジモード</h2>
                <div class="challenge-options">
                    <button onclick="game.startDailyChallenge()">🗓 デイリーチャレンジ</button>
                    <button onclick="game.startTimeAttack()">⏱ タイムアタック</button>
                    <button onclick="game.startNoFlagMode()">🚫 ノーフラグモード</button>
                    <button onclick="game.startSpeedRun()">🏃 スピードラン</button>
                </div>
                <button onclick="game.closeChallengeModal()">閉じる</button>
            `;
        }
        
        modal.classList.add('show');
    }
    
    closeChallengeModal() {
        const modal = document.getElementById('challenge-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    startDailyChallenge() {
        // 日付ベースのシード生成
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        this.dailyChallengeSeed = seed;
        this.challengeMode = 'daily';
        
        // シードを使用してボードを生成
        this.newGameWithSeed(seed);
        this.closeChallengeModal();
        
        if (this.soundEnabled) this.playSound('challenge');
    }
    
    startTimeAttack() {
        this.challengeMode = 'timeattack';
        this.newGame();
        this.closeChallengeModal();
        
        // タイムアタック用のタイマー表示
        this.showTimeAttackTimer();
    }
    
    startNoFlagMode() {
        this.challengeMode = 'noflag';
        this.newGame();
        
        // 旗ボタンを無効化
        const flagBtn = document.getElementById('flag-mode-btn');
        if (flagBtn) {
            flagBtn.disabled = true;
        }
        
        this.closeChallengeModal();
    }
    
    startSpeedRun() {
        this.challengeMode = 'speedrun';
        this.currentDifficulty = 'easy';
        this.speedRunStage = 1;
        this.speedRunTotalTime = 0;
        this.newGame();
        this.closeChallengeModal();
    }
    
    newGameWithSeed(seed) {
        // シードを使用した疑似乱数生成
        let random = seed;
        const pseudoRandom = () => {
            random = (random * 9301 + 49297) % 233280;
            return random / 233280;
        };
        
        // 通常のnewGameロジックをシード付きで実行
        this.stopTimer();
        this.timer = 0;
        this.updateTimer();
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        
        const difficulty = this.difficulties[this.currentDifficulty];
        this.initBoard(difficulty.rows, difficulty.cols, difficulty.mines);
        
        // シードを使用して地雷を配置
        // （実際の実装では、firstClickを考慮する必要があります）
        
        this.renderBoard();
        this.updateMineCount();
    }
    
    // サウンド機能
    initSounds() {
        // Web Audio APIを使用した簡単なサウンド生成
        if (window.AudioContext || window.webkitAudioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch(type) {
            case 'reveal':
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.1;
                break;
            case 'flag':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                break;
            case 'win':
                oscillator.frequency.value = 1000;
                gainNode.gain.value = 0.2;
                break;
            case 'lose':
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.2;
                break;
            case 'hint':
                oscillator.frequency.value = 700;
                gainNode.gain.value = 0.15;
                break;
            case 'undo':
                oscillator.frequency.value = 500;
                gainNode.gain.value = 0.1;
                break;
            case 'challenge':
                oscillator.frequency.value = 900;
                gainNode.gain.value = 0.2;
                break;
        }
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
        localStorage.setItem('minesweeper-pro-sound', this.soundEnabled);
    }
    
    // テーマ機能
    applyTheme(themeName) {
        if (!this.customThemes[themeName]) return;
        
        this.currentTheme = themeName;
        const theme = this.customThemes[themeName];
        
        document.documentElement.style.setProperty('--theme-primary', theme.primary);
        document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
        
        localStorage.setItem('minesweeper-pro-theme', themeName);
    }
    
    // 設定の保存と読み込み
    loadSettings() {
        // サウンド設定
        const soundSetting = localStorage.getItem('minesweeper-pro-sound');
        if (soundSetting === 'true') {
            this.soundEnabled = true;
            const soundToggle = document.getElementById('sound-toggle');
            if (soundToggle) {
                soundToggle.textContent = '🔊';
            }
        }
        
        // テーマ設定
        const themeSetting = localStorage.getItem('minesweeper-pro-theme');
        if (themeSetting && this.customThemes[themeSetting]) {
            this.applyTheme(themeSetting);
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = themeSetting;
            }
        }
    }
    
    // オーバーライドメソッド
    revealCell(row, col) {
        const wasRevealed = this.revealed[row][col];
        super.revealCell(row, col);
        
        if (!wasRevealed && this.revealed[row][col]) {
            // アクションを記録
            this.recordAction({
                type: 'reveal',
                row: row,
                col: col
            });
            
            // 移動を保存
            this.saveMove({
                type: 'reveal',
                row: row,
                col: col,
                previousState: { revealed: wasRevealed }
            });
            
            if (this.soundEnabled) this.playSound('reveal');
        }
    }
    
    toggleFlag(row, col) {
        const wasFlagged = this.flagged[row][col];
        super.toggleFlag(row, col);
        
        // アクションを記録
        this.recordAction({
            type: 'flag',
            row: row,
            col: col
        });
        
        // 移動を保存
        this.saveMove({
            type: 'flag',
            row: row,
            col: col,
            previousState: { flagged: wasFlagged }
        });
        
        if (this.soundEnabled && this.flagged[row][col]) {
            this.playSound('flag');
        }
    }
    
    onGameOver() {
        super.onGameOver();
        this.updateStatistics(false);
        this.stopRecording();
        if (this.soundEnabled) this.playSound('lose');
    }
    
    onGameWon() {
        super.onGameWon();
        this.updateStatistics(true);
        this.stopRecording();
        if (this.soundEnabled) this.playSound('win');
        
        // スピードランモードの処理
        if (this.challengeMode === 'speedrun') {
            this.speedRunTotalTime += this.timer;
            this.speedRunStage++;
            
            if (this.speedRunStage <= 3) {
                // 次のステージへ
                const difficulties = ['easy', 'medium', 'hard'];
                this.currentDifficulty = difficulties[this.speedRunStage - 1];
                setTimeout(() => this.newGame(), 2000);
            } else {
                // スピードラン完了
                this.showSpeedRunComplete();
            }
        }
    }
    
    showSpeedRunComplete() {
        const modal = document.getElementById('speedrun-complete-modal');
        if (!modal) return;
        
        const minutes = Math.floor(this.speedRunTotalTime / 60);
        const seconds = this.speedRunTotalTime % 60;
        const timeStr = `${minutes}分${seconds}秒`;
        
        const content = document.getElementById('speedrun-content');
        if (content) {
            content.innerHTML = `
                <h2>スピードラン完了！</h2>
                <p>総合タイム: ${timeStr}</p>
                <button onclick="game.closeSpeedRunModal()">閉じる</button>
            `;
        }
        
        modal.classList.add('show');
    }
    
    closeSpeedRunModal() {
        const modal = document.getElementById('speedrun-complete-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.challengeMode = null;
    }
    
    newGame() {
        // リセット
        this.hintsUsed = 0;
        this.moveHistory = [];
        this.redoHistory = [];
        this.updateHintButton();
        this.updateUndoRedoButtons();
        
        // 確率表示をクリア
        this.clearProbabilityDisplay();
        
        // 録画開始
        this.startRecording();
        
        // 基本的なnewGame処理
        super.newGame();
    }
    
    // CSPソルバー関連メソッド
    initCSPSolver() {
        if (typeof CSPSolver !== 'undefined') {
            this.cspSolver = new CSPSolver(this);
        }
    }
    
    toggleProbabilityMode() {
        this.probabilityMode = !this.probabilityMode;
        const btn = document.getElementById('probability-btn');
        const boardElement = document.getElementById('game-board');
        
        if (this.probabilityMode) {
            btn.classList.add('active');
            boardElement.classList.add('probability-mode');
            this.calculateAndDisplayProbabilities();
        } else {
            btn.classList.remove('active');
            boardElement.classList.remove('probability-mode');
            this.clearProbabilityDisplay();
        }
    }
    
    calculateAndDisplayProbabilities() {
        if (!this.cspSolver) return;
        
        // 計算中インジケーターを表示
        this.showCalculatingIndicator();
        
        // 非同期で計算を実行
        setTimeout(() => {
            const probabilities = this.cspSolver.calculateProbabilities();
            this.displayProbabilities(probabilities);
            this.hideCalculatingIndicator();
        }, 10);
    }
    
    displayProbabilities(probabilities) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!cell) continue;
                
                // 既存の確率表示を削除
                const existingOverlay = cell.querySelector('.probability-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
                
                // 確率クラスをクリア
                cell.classList.remove('probability-safe', 'probability-low', 
                                    'probability-medium', 'probability-high', 'probability-certain');
                
                const probability = probabilities[row][col];
                
                // 開示済みまたは旗付きのセルはスキップ
                if (this.revealed[row][col] || this.flagged[row][col]) {
                    continue;
                }
                
                if (probability >= 0) {
                    // 確率オーバーレイを作成
                    const overlay = document.createElement('div');
                    overlay.className = 'probability-overlay';
                    overlay.textContent = `${probability}%`;
                    
                    // 確率に応じてクラスを設定
                    if (probability === 0) {
                        cell.classList.add('probability-safe');
                    } else if (probability <= 25) {
                        cell.classList.add('probability-low');
                    } else if (probability <= 50) {
                        cell.classList.add('probability-medium');
                    } else if (probability < 100) {
                        cell.classList.add('probability-high');
                    } else {
                        cell.classList.add('probability-certain');
                    }
                    
                    cell.appendChild(overlay);
                }
            }
        }
    }
    
    clearProbabilityDisplay() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const overlay = cell.querySelector('.probability-overlay');
            if (overlay) {
                overlay.remove();
            }
            cell.classList.remove('probability-safe', 'probability-low', 
                                'probability-medium', 'probability-high', 'probability-certain');
        });
    }
    
    showCalculatingIndicator() {
        let indicator = document.querySelector('.calculating-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'calculating-indicator';
            indicator.innerHTML = '<span>確率を計算中<span class="calculating-spinner"></span></span>';
            document.body.appendChild(indicator);
        }
        indicator.classList.add('show');
    }
    
    hideCalculatingIndicator() {
        const indicator = document.querySelector('.calculating-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }
    
    // オーバーライド: セルが更新されたら確率を再計算
    revealCell(row, col) {
        super.revealCell(row, col);
        
        // 確率モードの場合、自動的に再計算
        if (this.probabilityMode) {
            this.calculateAndDisplayProbabilities();
        }
    }
    
    toggleFlag(row, col) {
        super.toggleFlag(row, col);
        
        // 確率モードの場合、自動的に再計算
        if (this.probabilityMode) {
            this.calculateAndDisplayProbabilities();
        }
    }
}

// ゲームの初期化
document.addEventListener('DOMContentLoaded', () => {
    window.game = new PCProMinesweeper();
});