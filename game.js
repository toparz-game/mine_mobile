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
        
        this.currentDifficulty = 'easy';
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
        
        // 旗アニメーション設定
        this.flagAnimationEnabled = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.newGame();
    }
    
    setupEventListeners() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.newGame());
        }
        
        
        const flagModeBtn = document.getElementById('flag-mode-btn');
        if (flagModeBtn) {
            flagModeBtn.addEventListener('click', () => {
                this.toggleFlagMode();
            });
        }
        
        const difficultySelect = document.getElementById('difficulty-select');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.currentDifficulty = e.target.value;
                this.newGame();
                this.closeSettings();
            });
        }
        
        const zoomInBtn = document.getElementById('zoom-in-btn');
        if (zoomInBtn) {
            // タッチイベントで即座に反応
            zoomInBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.zoomIn();
            }, { passive: false });
            
            // PCのクリックイベントも維持
            zoomInBtn.addEventListener('click', (e) => {
                // タッチデバイスでのクリックイベントは無視（二重実行防止）
                if (e.detail === 0) return;
                this.zoomIn();
            });
        }
        
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            // タッチイベントで即座に反応
            zoomOutBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.zoomOut();
            }, { passive: false });
            
            // PCのクリックイベントも維持
            zoomOutBtn.addEventListener('click', (e) => {
                // タッチデバイスでのクリックイベントは無視（二重実行防止）
                if (e.detail === 0) return;
                this.zoomOut();
            });
        }
        
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }
        
        const closeSettingsBtn = document.getElementById('close-settings');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.closeSettings();
            });
        }
        
        const fontSizeUpBtn = document.getElementById('font-size-up-btn');
        if (fontSizeUpBtn) {
            fontSizeUpBtn.addEventListener('click', () => {
                this.increaseFontSize();
            });
        }
        
        const fontSizeDownBtn = document.getElementById('font-size-down-btn');
        if (fontSizeDownBtn) {
            fontSizeDownBtn.addEventListener('click', () => {
                this.decreaseFontSize();
            });
        }
        
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        const flagAnimationToggleBtn = document.getElementById('flag-animation-toggle-btn');
        if (flagAnimationToggleBtn) {
            flagAnimationToggleBtn.addEventListener('click', () => {
                this.toggleFlagAnimation();
            });
        }
        
        // 設定モーダルの外側クリックで閉じる
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeSettings();
                }
            });
        }
        
        // ゲームボードのピンチイベントを防止
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            gameBoard.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        // グローバルなピンチズーム防止
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // プルトゥリフレッシュを防止
        document.addEventListener('touchstart', (e) => {
            // スクロール位置が最上部の場合のタッチ開始を記録
            if (window.pageYOffset === 0) {
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            // スクロール位置が最上部で下方向にスワイプしている場合
            if (window.pageYOffset === 0 && this.touchStartY !== undefined) {
                const touchY = e.touches[0].clientY;
                const touchDiff = touchY - this.touchStartY;
                if (touchDiff > 0) {
                    // 下方向へのスワイプを防止
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        // ダブルタップズーム防止
        document.addEventListener('touchend', (e) => {
            const now = new Date().getTime();
            if (now - this.lastTapTime < 500) {
                e.preventDefault();
            }
            this.lastTapTime = now;
        }, false);
        
        // iOS Safari用のジェスチャーイベント防止
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
            return false;
        });
        
        // PC用ドラッグイベントの設定
        this.setupDragEvents();
    }
    
    setupDragEvents() {
        const wrapper = document.querySelector('.game-board-wrapper');
        if (!wrapper) return;
        
        // 設定の読み込み
        this.loadFlagAnimationSetting();
        
        let isDraggingWithMiddleButton = false;
        
        // 中ボタン（スクロールボタン）でのドラッグ処理
        wrapper.addEventListener('mousedown', (e) => {
            // 中ボタンの場合のみドラッグ開始
            if (e.button === 1) {
                isDraggingWithMiddleButton = true;
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.scrollStartX = wrapper.scrollLeft;
                this.scrollStartY = wrapper.scrollTop;
                
                wrapper.style.cursor = 'move';
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        // マウス移動イベント（中ボタンドラッグ時のみ）
        wrapper.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !isDraggingWithMiddleButton) return;
            
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            wrapper.scrollLeft = this.scrollStartX - deltaX;
            wrapper.scrollTop = this.scrollStartY - deltaY;
            
            e.preventDefault();
        });
        
        // マウスアップイベント
        const handleMouseUp = (e) => {
            if (isDraggingWithMiddleButton && e.button === 1) {
                this.isDragging = false;
                isDraggingWithMiddleButton = false;
                wrapper.style.cursor = 'grab';
                e.preventDefault();
            }
        };
        
        wrapper.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseup', handleMouseUp);
        
        // マウスがウィンドウ外に出た場合
        wrapper.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.isDragging = false;
                isDraggingWithMiddleButton = false;
                wrapper.style.cursor = 'grab';
            }
        });
    }
    
    toggleFlagMode() {
        this.flagMode = !this.flagMode;
        const btn = document.getElementById('flag-mode-btn');
        if (!btn) return;
        
        if (this.flagMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    
    newGame() {
        this.stopTimer();
        this.timer = 0;
        this.updateTimer();
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        
        const difficulty = this.difficulties[this.currentDifficulty];
        this.rows = difficulty.rows;
        this.cols = difficulty.cols;
        this.mineCount = difficulty.mines;
        
        this.initBoard();
        this.renderBoard();
        this.updateMineCount();
        
        // 残りの地雷数を初期化
        const mineRemainingElement = document.getElementById('mine-remaining');
        if (mineRemainingElement) {
            mineRemainingElement.textContent = this.mineCount;
        }
        
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = '😊';
        }
    }
    
    initBoard() {
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        
        for (let row = 0; row < this.rows; row++) {
            this.board[row] = [];
            this.revealed[row] = [];
            this.flagged[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = 0;
                this.revealed[row][col] = false;
                this.flagged[row][col] = false;
            }
        }
    }
    
    placeMines(excludeRow, excludeCol) {
        let minesPlaced = 0;
        
        while (minesPlaced < this.mineCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            if (row === excludeRow && col === excludeCol) continue;
            if (this.board[row][col] === -1) continue;
            
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
    
    renderBoard() {
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                this.setupCellEventListeners(cell, row, col);
                
                boardElement.appendChild(cell);
            }
        }
        
        // 現在のズームレベルとフォントサイズを適用
        this.updateZoom();
        this.updateFontSize();
    }
    
    setupCellEventListeners(cell, row, col) {
        let touchTimer;
        let touchStartX, touchStartY;
        let hasMoved = false;
        let lastTapTime = 0;
        const doubleTapThreshold = 300; // ダブルタップの判定時間（ミリ秒）
        
        // タッチ開始
        cell.addEventListener('touchstart', (e) => {
            if (this.gameOver) return;
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            hasMoved = false;
            
            // 長押し検出用タイマー
            touchTimer = setTimeout(() => {
                if (!hasMoved && !this.gameOver) {
                    this.toggleFlag(row, col);
                    this.isLongPress = true;
                }
            }, 300); // 300ms長押しで旗
            
            // preventDefaultを削除してスクロールを可能にする
            // e.preventDefault();
        }, { passive: false });
        
        // タッチ移動（長押し判定のキャンセル用）
        cell.addEventListener('touchmove', (e) => {
            const moveX = e.touches[0].clientX;
            const moveY = e.touches[0].clientY;
            const distance = Math.sqrt(
                Math.pow(moveX - touchStartX, 2) + 
                Math.pow(moveY - touchStartY, 2)
            );
            
            // 10ピクセル以上動いたら移動とみなす
            if (distance > 10) {
                hasMoved = true;
                clearTimeout(touchTimer);
            }
        });
        
        // タッチ終了
        cell.addEventListener('touchend', (e) => {
            clearTimeout(touchTimer);
            
            // 長押しの場合は何もしない（旗の設置/取り消しは既に実行済み）
            if (this.isLongPress) {
                this.isLongPress = false;
                e.preventDefault();
                return;
            }
            
            if (!hasMoved && !this.gameOver) {
                const currentTime = new Date().getTime();
                const timeDiff = currentTime - lastTapTime;
                
                // ダブルタップの検出
                if (timeDiff < doubleTapThreshold && this.revealed[row][col] && this.board[row][col] > 0) {
                    // ダブルタップでチョードリビール（数字の周りを開く）
                    this.chordReveal(row, col);
                    lastTapTime = 0; // ダブルタップ後はリセット
                } else {
                    // シングルタップの処理
                    if (this.flagMode) {
                        this.toggleFlag(row, col);
                    } else {
                        this.revealCell(row, col);
                    }
                    lastTapTime = currentTime;
                }
                // タップ時のみpreventDefaultを呼ぶ
                e.preventDefault();
            }
        });
        
        // タッチキャンセル
        cell.addEventListener('touchcancel', () => {
            clearTimeout(touchTimer);
            this.isLongPress = false;
            hasMoved = false;
        });
        
        // PCのクリックイベント
        cell.addEventListener('click', (e) => {
            if (!this.gameOver) {
                if (e.shiftKey || this.flagMode) {
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
    
    toggleFlag(row, col) {
        if (this.revealed[row][col]) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        this.flagged[row][col] = !this.flagged[row][col];
        
        if (this.flagged[row][col]) {
            cell.classList.add('flagged');
            // ビジュアルフィードバック：旗を立てた時のアニメーション
            cell.classList.add('flag-animation');
            
            // 画面上部から旗が降ってくるアニメーション
            this.createFallingFlag(cell);
            
            setTimeout(() => {
                cell.classList.remove('flag-animation');
            }, 300);
        } else {
            cell.classList.remove('flagged');
            // 旗を外した時のアニメーション
            cell.classList.add('unflag-animation');
            setTimeout(() => {
                cell.classList.remove('unflag-animation');
            }, 200);
        }
        
        this.updateMineCount();
        this.checkWin();
    }
    
    chordReveal(row, col) {
        if (!this.revealed[row][col]) return;
        
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
        
        if (flagCount === this.board[row][col]) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    if (newRow >= 0 && newRow < this.rows && 
                        newCol >= 0 && newCol < this.cols && 
                        !this.flagged[newRow][newCol]) {
                        this.revealCell(newRow, newCol);
                    }
                }
            }
        }
    }
    
    checkWin() {
        let revealedCount = 0;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.revealed[row][col] && this.board[row][col] !== -1) {
                    revealedCount++;
                }
            }
        }
        
        // 勝利条件：爆弾以外のすべてのマスが開かれた時
        if (revealedCount === this.rows * this.cols - this.mineCount) {
            this.endGame(true);
        }
    }
    
    endGame(won) {
        this.gameOver = true;
        this.gameWon = won;
        this.stopTimer();
        
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = won ? '😎' : '😵';
        }
        
        // すべての地雷を表示
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (this.board[row][col] === -1 && !this.flagged[row][col]) {
                    // 勝利時は赤背景なしで爆弾マークのみ表示
                    if (won) {
                        cell.classList.add('revealed', 'mine-won');
                    } else {
                        cell.classList.add('mine', 'revealed');
                    }
                } else if (this.flagged[row][col] && this.board[row][col] !== -1) {
                    cell.classList.add('wrong-flag');
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
        const flagCountElement = document.getElementById('flag-count');
        if (flagCountElement) {
            flagCountElement.textContent = `${flagCount}/${this.mineCount}`;
        }
        
        // 残りの地雷数を更新
        const mineRemainingElement = document.getElementById('mine-remaining');
        if (mineRemainingElement) {
            const remaining = Math.max(0, this.mineCount - flagCount);
            mineRemainingElement.textContent = remaining;
        }
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
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = String(this.timer).padStart(3, '0');
        }
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
        
        if (upBtn) upBtn.disabled = this.currentFontSize >= this.maxFontSize;
        if (downBtn) downBtn.disabled = this.currentFontSize <= this.minFontSize;
    }
    
    toggleTheme() {
        const body = document.body;
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (!themeBtn) return;
        
        const themeIcon = themeBtn.querySelector('.theme-icon');
        const themeText = themeBtn.querySelector('.theme-text');
        
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'ダークモード';
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'ライトモード';
            localStorage.setItem('theme', 'dark');
        }
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (!themeBtn) return;
        
        const themeIcon = themeBtn.querySelector('.theme-icon');
        const themeText = themeBtn.querySelector('.theme-text');
        
        // デフォルトをダークテーマに設定（保存された設定がない場合、またはダークテーマの場合）
        if (savedTheme !== 'light') {
            document.body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'ライトモード';
        }
    }
    
    createFallingFlag(targetCell) {
        // アニメーションが無効の場合は実行しない
        if (!this.flagAnimationEnabled) return;
        
        const container = document.getElementById('flag-animation-container');
        if (!container) return;
        
        // セルの位置を取得
        const cellRect = targetCell.getBoundingClientRect();
        const cellCenterX = cellRect.left + cellRect.width / 2;
        const cellCenterY = cellRect.top + cellRect.height / 2;
        
        // 旗要素を作成
        const flag = document.createElement('div');
        flag.className = 'falling-flag';
        flag.textContent = '🚩';
        
        // 最終位置（セルの中心）に配置
        flag.style.left = (cellCenterX - 25) + 'px';
        flag.style.top = cellCenterY + 'px';
        
        container.appendChild(flag);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            flag.remove();
        }, 400);
    }
    
    toggleFlagAnimation() {
        this.flagAnimationEnabled = !this.flagAnimationEnabled;
        const btn = document.getElementById('flag-animation-toggle-btn');
        if (!btn) return;
        
        const animationText = btn.querySelector('.flag-animation-text');
        
        if (this.flagAnimationEnabled) {
            if (animationText) animationText.textContent = 'ON';
        } else {
            if (animationText) animationText.textContent = 'OFF';
        }
        
        // 設定を保存
        localStorage.setItem('flagAnimation', this.flagAnimationEnabled ? 'on' : 'off');
    }
    
    loadFlagAnimationSetting() {
        const savedSetting = localStorage.getItem('flagAnimation');
        const btn = document.getElementById('flag-animation-toggle-btn');
        if (!btn) return;
        
        const animationText = btn.querySelector('.flag-animation-text');
        
        // デフォルトはON
        if (savedSetting === 'off') {
            this.flagAnimationEnabled = false;
            if (animationText) animationText.textContent = 'OFF';
        } else {
            this.flagAnimationEnabled = true;
            if (animationText) animationText.textContent = 'ON';
        }
    }
    
    zoomIn() {
        const newZoom = this.zoomLevel + this.zoomStep;
        if (newZoom <= this.maxZoom) {
            this.zoomLevel = newZoom;
            this.updateZoom();
        }
    }
    
    zoomOut() {
        const newZoom = this.zoomLevel - this.zoomStep;
        if (newZoom >= this.minZoom) {
            this.zoomLevel = newZoom;
            this.updateZoom();
        }
    }
    
    updateZoom() {
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            gameBoard.style.transform = `scale(${this.zoomLevel})`;
        }
        this.updateZoomButtons();
    }
    
    updateZoomButtons() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        
        if (zoomInBtn) {
            const isMaxZoom = Math.abs(this.zoomLevel - this.maxZoom) < 0.001;
            zoomInBtn.disabled = isMaxZoom;
        }
        if (zoomOutBtn) {
            const isMinZoom = Math.abs(this.zoomLevel - this.minZoom) < 0.001;
            zoomOutBtn.disabled = isMinZoom;
        }
    }
    
    openSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.add('show');
        this.updateFontSizeDisplay();
        this.updateFontSizeButtons();
    }
    
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Minesweeper();
        game.loadTheme();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});