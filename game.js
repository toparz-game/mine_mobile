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
        this.minZoom = 0.3;
        this.maxZoom = 3.0;
        this.zoomStep = 0.1;
        this.lastTapTime = 0;
        this.doubleTapDelay = 300;
        
        // フォントサイズ関連の変数
        this.currentFontSize = 100; // パーセンテージ
        this.minFontSize = 50;
        this.maxFontSize = 200;
        this.fontSizeStep = 25;
        
        // ドラッグ関連の変数
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.scrollStartX = 0;
        this.scrollStartY = 0;
        
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
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });
        
        document.getElementById('close-settings').addEventListener('click', () => {
            this.closeSettings();
        });
        
        document.getElementById('font-size-up-btn').addEventListener('click', () => {
            this.increaseFontSize();
        });
        
        document.getElementById('font-size-down-btn').addEventListener('click', () => {
            this.decreaseFontSize();
        });
        
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 設定モーダルの外側クリックで閉じる
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.closeSettings();
            }
        });
        
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // PC用ドラッグイベントの設定
        this.setupDragEvents();
    }
    
    setupDragEvents() {
        const wrapper = document.querySelector('.game-board-wrapper');
        let clickedCell = null;
        let hasMoved = false;
        let mouseDownX = 0;
        let mouseDownY = 0;
        let initialScrollLeft = 0;
        let initialScrollTop = 0;
        
        // マウスダウンイベント（キャプチャフェーズで処理）
        wrapper.addEventListener('mousedown', (e) => {
            // 右クリックは無視
            if (e.button !== 0) return;
            
            // マウスダウン位置とスクロール位置を正確に記録
            mouseDownX = e.clientX;
            mouseDownY = e.clientY;
            initialScrollLeft = wrapper.scrollLeft;
            initialScrollTop = wrapper.scrollTop;
            
            // セルをクリックした場合、後でクリック処理するために記録
            if (e.target.classList.contains('cell')) {
                clickedCell = e.target;
                hasMoved = false;
            } else {
                clickedCell = null;
                hasMoved = false;
            }
            
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.scrollStartX = wrapper.scrollLeft;
            this.scrollStartY = wrapper.scrollTop;
            
            wrapper.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        }, true); // キャプチャフェーズで処理
        
        // マウス移動イベント
        wrapper.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            // マウスが1ピクセルでも動いたらドラッグとみなす
            if (e.clientX !== mouseDownX || e.clientY !== mouseDownY) {
                hasMoved = true;
            }
            
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            wrapper.scrollLeft = this.scrollStartX - deltaX;
            wrapper.scrollTop = this.scrollStartY - deltaY;
            
            // スクロール位置が変わった場合もドラッグとみなす
            if (wrapper.scrollLeft !== initialScrollLeft || wrapper.scrollTop !== initialScrollTop) {
                hasMoved = true;
            }
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        // マウスアップイベント（キャプチャフェーズで処理）
        const handleMouseUp = (e) => {
            if (this.isDragging) {
                this.isDragging = false;
                wrapper.style.cursor = '';
                
                // マウスアップ位置がダウン位置と異なる、またはスクロール位置が変わった場合
                if (e.clientX !== mouseDownX || e.clientY !== mouseDownY || 
                    wrapper.scrollLeft !== initialScrollLeft || wrapper.scrollTop !== initialScrollTop) {
                    hasMoved = true;
                }
                
                // 完全に静止していた場合のみセルを開く
                if (clickedCell && !hasMoved && !this.gameOver) {
                    const row = parseInt(clickedCell.dataset.row);
                    const col = parseInt(clickedCell.dataset.col);
                    
                    if (e.shiftKey || this.flagMode) {
                        this.toggleFlag(row, col);
                    } else {
                        this.revealCell(row, col);
                    }
                }
                
                clickedCell = null;
                hasMoved = false;
                
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        wrapper.addEventListener('mouseup', handleMouseUp, true); // キャプチャフェーズで処理
        document.addEventListener('mouseup', handleMouseUp, true);
        
        // マウスがウィンドウ外に出た場合
        wrapper.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                wrapper.style.cursor = '';
            }
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
        this.updateFontSizeButtons();
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
        let touchStartX = 0;
        let touchStartY = 0;
        const moveThreshold = 10;
        let isProcessed = false; // タッチ操作が処理済みかどうかのフラグ
        
        cell.addEventListener('touchstart', (e) => {
            // マルチタッチの場合はピンチ操作と判断
            if (e.touches.length > 1) {
                this.isPinching = true;
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                }
                return;
            }
            
            // e.preventDefault()を削除してスクロールを許可
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
            this.isLongPress = false;
            this.isPinching = false;
            isProcessed = false; // 新しいタッチ開始時にリセット
            
            this.longPressTimer = setTimeout(() => {
                if (!touchMoved && !this.gameOver && !this.isPinching) {
                    this.isLongPress = true;
                    isProcessed = true; // 長押し処理済みとマーク
                    navigator.vibrate && navigator.vibrate(50);
                    this.toggleFlag(row, col);
                    // 長押しが成功したらデフォルト動作を防ぐ
                    e.preventDefault();
                }
            }, 300);
        });
        
        cell.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                this.isPinching = true;
                touchMoved = true;
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                }
                return;
            }
            
            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
            
            if (deltaX > moveThreshold || deltaY > moveThreshold) {
                touchMoved = true;
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                }
            }
        });
        
        cell.addEventListener('touchend', (e) => {
            if (this.isPinching) {
                this.isPinching = false;
                return;
            }
            
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
            }
            
            // すでに処理済み（長押しで旗操作済み）の場合は何もしない
            if (isProcessed) {
                e.preventDefault();
                return;
            }
            
            const touchDuration = Date.now() - touchStartTime;
            
            // 移動していない、長押しではない、短いタップ、ゲームオーバーでない場合のみ処理
            if (!touchMoved && !this.isLongPress && touchDuration < 300 && !this.gameOver) {
                // タップ操作の場合のみpreventDefaultを呼ぶ
                e.preventDefault();
                
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
        });
        
        // PCのクリックイベントを無効化（ドラッグイベントで処理するため）
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // クリック処理はsetupDragEventsで行う
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
        } else {
            document.getElementById('reset-btn').textContent = '😵';
            this.revealAllMines();
        }
    }
    
    revealAllMines() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                
                if (this.flagged[row][col]) {
                    if (this.board[row][col] !== -1) {
                        // 間違った場所に旗を立てていた場合
                        cell.classList.add('wrong-flag');
                        cell.textContent = '❌';
                    }
                    // 正しい場所に旗を立てていた場合は何もしない（旗のまま表示）
                } else if (this.board[row][col] === -1) {
                    // 旗を立てていない地雷を表示
                    cell.classList.add('revealed', 'mine');
                }
            }
        }
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
    
    increaseFontSize() {
        if (this.currentFontSize < this.maxFontSize) {
            this.currentFontSize = Math.min(this.currentFontSize + this.fontSizeStep, this.maxFontSize);
            this.updateFontSize();
            this.updateFontSizeButtons();
            this.updateFontSizeDisplay();
        }
    }
    
    decreaseFontSize() {
        if (this.currentFontSize > this.minFontSize) {
            this.currentFontSize = Math.max(this.currentFontSize - this.fontSizeStep, this.minFontSize);
            this.updateFontSize();
            this.updateFontSizeButtons();
            this.updateFontSizeDisplay();
        }
    }
    
    updateFontSizeDisplay() {
        const display = document.getElementById('font-size-display');
        if (display) {
            display.textContent = `${this.currentFontSize}%`;
        }
    }
    
    updateFontSize() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.fontSize = `${this.currentFontSize}%`;
        });
    }
    
    updateFontSizeButtons() {
        const upBtn = document.getElementById('font-size-up-btn');
        const downBtn = document.getElementById('font-size-down-btn');
        
        upBtn.disabled = this.currentFontSize >= this.maxFontSize;
        downBtn.disabled = this.currentFontSize <= this.minFontSize;
    }
    
    toggleTheme() {
        const body = document.body;
        const themeBtn = document.getElementById('theme-toggle-btn');
        const themeIcon = themeBtn.querySelector('.theme-icon');
        const themeText = themeBtn.querySelector('.theme-text');
        
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            themeIcon.textContent = '🌙';
            themeText.textContent = 'ダークモード';
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            themeIcon.textContent = '☀️';
            themeText.textContent = 'ライトモード';
            localStorage.setItem('theme', 'dark');
        }
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const themeBtn = document.getElementById('theme-toggle-btn');
        const themeIcon = themeBtn.querySelector('.theme-icon');
        const themeText = themeBtn.querySelector('.theme-text');
        
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeIcon.textContent = '☀️';
            themeText.textContent = 'ライトモード';
        }
    }
    
    openSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.add('show');
        this.updateFontSizeDisplay();
    }
    
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Minesweeper();
    game.loadTheme();
});