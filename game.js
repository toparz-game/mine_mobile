class Minesweeper {
    constructor() {
        this.difficulties = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 },
            hiddeneasy: { rows: 9, cols: 9, mines: 20 },
            hiddenmedium: { rows: 16, cols: 16, mines: 64 },
            hiddenhard: { rows: 16, cols: 30, mines: 120 },
            extreme: { rows: 64, cols: 64, mines: 999 }
        };
        
        this.currentDifficulty = 'medium';
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.mineCount = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.flagMode = false;
        this.longPressTimer = null;
        this.isLongPress = false;
        this.isPinching = false;
        this.touchCount = 0;
        this.zoomLevel = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 2.0;
        this.zoomStep = 0.1;
        this.lastTapTime = 0;
        this.doubleTapDelay = 300;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.newGame();
    }
    
    setupEventListeners() {
        document.getElementById('reset-btn').addEventListener('click', () => this.newGame());
        document.getElementById('modal-reset').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.remove('show');
            this.newGame();
        });
        
        document.getElementById('flag-mode-btn').addEventListener('click', () => {
            this.toggleFlagMode();
        });
        
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            this.currentDifficulty = e.target.value;
            this.newGame();
        });
        
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoomIn();
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoomOut();
        });
        
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }
    
    toggleFlagMode() {
        this.flagMode = !this.flagMode;
        const btn = document.getElementById('flag-mode-btn');
        const text = btn.querySelector('.mode-text');
        
        if (this.flagMode) {
            btn.classList.add('active');
            text.textContent = '旗モード: ON';
        } else {
            btn.classList.remove('active');
            text.textContent = '旗モード: OFF';
        }
    }
    
    newGame() {
        this.stopTimer();
        this.timer = 0;
        this.updateTimer();
        this.firstClick = true;
        this.gameOver = false;
        this.gameWon = false;
        this.flagMode = false;
        
        const btn = document.getElementById('flag-mode-btn');
        const text = btn.querySelector('.mode-text');
        btn.classList.remove('active');
        text.textContent = '旗モード: OFF';
        
        document.getElementById('reset-btn').textContent = '😊';
        
        const diff = this.difficulties[this.currentDifficulty];
        this.rows = diff.rows;
        this.cols = diff.cols;
        this.mineCount = diff.mines;
        
        this.initBoard();
        this.renderBoard();
        this.updateMineCount();
        this.updateZoom();
    }
    
    initBoard() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.revealed = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
    }
    
    placeMines(excludeRow, excludeCol) {
        let minesPlaced = 0;
        
        while (minesPlaced < this.mineCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            if (this.board[row][col] !== -1 && !(row === excludeRow && col === excludeCol)) {
                this.board[row][col] = -1;
                minesPlaced++;
                
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const newRow = row + dr;
                        const newCol = col + dc;
                        
                        if (newRow >= 0 && newRow < this.rows && 
                            newCol >= 0 && newCol < this.cols && 
                            this.board[newRow][newCol] !== -1) {
                            this.board[newRow][newCol]++;
                        }
                    }
                }
            }
        }
    }
    
    renderBoard() {
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';
        
        // CSSカスタムプロパティを設定
        document.documentElement.style.setProperty('--cols', this.cols);
        document.documentElement.style.setProperty('--rows', this.rows);
        
        // グリッドを動的に設定
        boardElement.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                this.setupCellListeners(cell, row, col);
                
                boardElement.appendChild(cell);
            }
        }
    }
    
    setupCellListeners(cell, row, col) {
        let touchStartTime = 0;
        let touchMoved = false;
        let tapCount = 0;
        let tapTimer = null;
        
        cell.addEventListener('touchstart', (e) => {
            // マルチタッチの場合はピンチ操作と判断
            if (e.touches.length > 1) {
                this.isPinching = true;
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                }
                return;
            }
            
            e.preventDefault();
            touchStartTime = Date.now();
            touchMoved = false;
            this.isLongPress = false;
            this.isPinching = false;
            
            this.longPressTimer = setTimeout(() => {
                this.isLongPress = true;
                if (!touchMoved && !this.gameOver && !this.isPinching) {
                    navigator.vibrate && navigator.vibrate(50);
                    this.toggleFlag(row, col);
                }
            }, 500);
        }, { passive: false });
        
        cell.addEventListener('touchmove', (e) => {
            touchMoved = true;
            if (e.touches.length > 1) {
                this.isPinching = true;
            }
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
            }
        });
        
        cell.addEventListener('touchend', (e) => {
            if (this.isPinching) {
                this.isPinching = false;
                return;
            }
            
            e.preventDefault();
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
            }
            
            const touchDuration = Date.now() - touchStartTime;
            
            if (!touchMoved && !this.isLongPress && touchDuration < 500 && !this.gameOver) {
                const currentTime = Date.now();
                const timeSinceLastTap = currentTime - this.lastTapTime;
                
                if (this.revealed[row][col] && this.board[row][col] > 0 && timeSinceLastTap < this.doubleTapDelay) {
                    this.chordReveal(row, col);
                    this.lastTapTime = 0;
                } else {
                    this.lastTapTime = currentTime;
                    if (this.flagMode) {
                        this.toggleFlag(row, col);
                    } else {
                        this.revealCell(row, col);
                    }
                }
            }
        }, { passive: false });
        
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.gameOver) {
                if (e.shiftKey || e.ctrlKey || this.flagMode) {
                    this.toggleFlag(row, col);
                } else {
                    this.revealCell(row, col);
                }
            }
        });
        
        cell.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (!this.gameOver && this.revealed[row][col] && this.board[row][col] > 0) {
                this.chordReveal(row, col);
            }
        });
        
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!this.gameOver) {
                this.toggleFlag(row, col);
            }
            return false;
        });
    }
    
    revealCell(row, col) {
        if (this.revealed[row][col] || this.flagged[row][col]) return;
        
        if (this.firstClick) {
            this.placeMines(row, col);
            this.firstClick = false;
            this.startTimer();
        }
        
        this.revealed[row][col] = true;
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('revealed');
        
        if (this.board[row][col] === -1) {
            cell.classList.add('mine');
            this.endGame(false);
            return;
        }
        
        if (this.board[row][col] > 0) {
            cell.textContent = this.board[row][col];
            cell.dataset.count = this.board[row][col];
        } else {
            this.revealEmpty(row, col);
        }
        
        this.checkWin();
    }
    
    revealEmpty(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols && 
                    !this.revealed[newRow][newCol] && 
                    !this.flagged[newRow][newCol]) {
                    this.revealCell(newRow, newCol);
                }
            }
        }
    }
    
    toggleFlag(row, col) {
        if (this.revealed[row][col]) return;
        
        this.flagged[row][col] = !this.flagged[row][col];
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagged[row][col]) {
            cell.classList.add('flagged');
        } else {
            cell.classList.remove('flagged');
        }
        
        this.updateMineCount();
    }
    
    countFlagsAround(row, col) {
        let flagCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols && 
                    this.flagged[newRow][newCol]) {
                    flagCount++;
                }
            }
        }
        return flagCount;
    }
    
    chordReveal(row, col) {
        if (!this.revealed[row][col] || this.board[row][col] <= 0) return;
        
        const mineCount = this.board[row][col];
        const flagCount = this.countFlagsAround(row, col);
        
        if (mineCount === flagCount) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    if (newRow >= 0 && newRow < this.rows && 
                        newCol >= 0 && newCol < this.cols && 
                        !this.revealed[newRow][newCol] && 
                        !this.flagged[newRow][newCol]) {
                        this.revealCell(newRow, newCol);
                    }
                }
            }
        }
    }
    
    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
            this.updateZoom();
        }
    }
    
    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
            this.updateZoom();
        }
    }
    
    updateZoom() {
        const board = document.getElementById('game-board');
        board.style.transform = `scale(${this.zoomLevel})`;
        
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        
        zoomInBtn.disabled = this.zoomLevel >= this.maxZoom;
        zoomOutBtn.disabled = this.zoomLevel <= this.minZoom;
    }
    
    checkWin() {
        let revealedCount = 0;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.revealed[row][col]) {
                    revealedCount++;
                }
            }
        }
        
        if (revealedCount === this.rows * this.cols - this.mineCount) {
            this.endGame(true);
        }
    }
    
    endGame(won) {
        this.gameOver = true;
        this.gameWon = won;
        this.stopTimer();
        
        if (won) {
            document.getElementById('reset-btn').textContent = '😎';
            this.showModal('勝利！', `タイム: ${this.timer}秒`);
        } else {
            document.getElementById('reset-btn').textContent = '😵';
            this.revealAllMines();
            this.showModal('ゲームオーバー', 'もう一度挑戦してください！');
        }
    }
    
    revealAllMines() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1) {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    cell.classList.add('revealed', 'mine');
                }
            }
        }
    }
    
    showModal(title, message) {
        setTimeout(() => {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            document.getElementById('game-over-modal').classList.add('show');
        }, 500);
    }
    
    updateMineCount() {
        let flagCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.flagged[row][col]) flagCount++;
            }
        }
        document.getElementById('flag-count').textContent = `${flagCount}/${this.mineCount}`;
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimer();
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimer() {
        document.getElementById('timer').textContent = String(this.timer).padStart(3, '0');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});