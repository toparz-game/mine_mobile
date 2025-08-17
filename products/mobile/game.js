// MobileMinesweeper: MinesweeperCoreを継承したモバイル版の実装
class MobileMinesweeper extends MinesweeperCore {
    constructor() {
        super();
        
        // デバイス判定
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.isPC = !this.isTouchDevice;
        
        // 難易度設定
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
        this.flagMode = 0; // 0: 通常, 1: 旗モード, 2: ?モード, 3: 取り消しモード
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
        
        // 省電力モード設定
        this.powerSaveMode = false;
        
        // リバース操作設定
        this.reverseMode = false;
        
        // ページ表示状態の監視
        this.wasTimerRunning = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupVisibilityHandler();
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
            if (this.isTouchDevice) {
                zoomInBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.zoomIn();
                }, { passive: false });
            } else {
                zoomInBtn.addEventListener('click', () => this.zoomIn());
            }
        }
        
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            if (this.isTouchDevice) {
                zoomOutBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.zoomOut();
                }, { passive: false });
            } else {
                zoomOutBtn.addEventListener('click', () => this.zoomOut());
            }
        }
        
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }
        
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.openHelp();
            });
        }
        
        const closeSettingsBtn = document.getElementById('close-settings');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.closeSettings();
            });
        }
        
        const closeHelpBtn = document.getElementById('close-help');
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => {
                this.closeHelp();
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
        
        const powerSaveToggleBtn = document.getElementById('power-save-toggle-btn');
        if (powerSaveToggleBtn) {
            powerSaveToggleBtn.addEventListener('click', () => {
                this.togglePowerSaveMode();
            });
        }
        
        const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
        if (reverseToggleBtn) {
            reverseToggleBtn.addEventListener('click', () => {
                this.toggleReverseMode();
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
        
        // ヘルプモーダルの外側クリックで閉じる
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) {
                    this.closeHelp();
                }
            });
        }
        
        // ゲームボードのピンチイベントを防止（タッチデバイスのみ）
        if (this.isTouchDevice) {
            const gameBoard = document.getElementById('game-board');
            if (gameBoard) {
                gameBoard.addEventListener('touchstart', (e) => {
                    if (e.touches.length > 1) {
                        e.preventDefault();
                    }
                }, { passive: false });
            }
        }
        
        // タッチデバイス向けのイベント防止
        if (this.isTouchDevice) {
            // グローバルなピンチズーム防止
            document.addEventListener('touchmove', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            // プルトゥリフレッシュを防止
            document.addEventListener('touchstart', (e) => {
                if (window.pageYOffset === 0) {
                    this.touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });
            
            document.addEventListener('touchmove', (e) => {
                if (window.pageYOffset === 0 && this.touchStartY !== undefined) {
                    const touchY = e.touches[0].clientY;
                    const touchDiff = touchY - this.touchStartY;
                    if (touchDiff > 0) {
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
            }, { passive: false });
            
            // iOS Safari用のジェスチャーイベント防止
            document.addEventListener('gesturestart', (e) => {
                e.preventDefault();
                return false;
            });
        }
        
        // ドラッグイベントの設定
        this.setupDragEvents();
    }
    
    setupDragEvents() {
        const wrapper = document.querySelector('.game-board-wrapper');
        if (!wrapper) return;
        
        // 設定の読み込み
        this.loadFlagAnimationSetting();
        this.loadPowerSaveSettings();
        this.loadReverseModeSetting();
        
        let isDraggingWithMiddleButton = false;
        let isDraggingTouch = false;
        
        // 中ボタン（スクロールボタン）でのドラッグ処理
        wrapper.addEventListener('mousedown', (e) => {
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
            
            // リバースモードの場合、スクロール方向を反転
            if (this.reverseMode) {
                wrapper.scrollLeft = this.scrollStartX + deltaX;
                wrapper.scrollTop = this.scrollStartY + deltaY;
            } else {
                wrapper.scrollLeft = this.scrollStartX - deltaX;
                wrapper.scrollTop = this.scrollStartY - deltaY;
            }
            
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
        
        // タッチデバイス向けのスワイプ実装
        if (this.isTouchDevice) {
            let touchStartX = 0;
            let touchStartY = 0;
            let scrollStartX = 0;
            let scrollStartY = 0;
            
            wrapper.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    isDraggingTouch = true;
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    scrollStartX = wrapper.scrollLeft;
                    scrollStartY = wrapper.scrollTop;
                }
            }, { passive: true });
            
            wrapper.addEventListener('touchmove', (e) => {
                if (!isDraggingTouch || e.touches.length !== 1) return;
                
                const touch = e.touches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                
                // リバースモードの場合、スクロール方向を反転
                if (this.reverseMode) {
                    wrapper.scrollLeft = scrollStartX + deltaX;
                    wrapper.scrollTop = scrollStartY + deltaY;
                } else {
                    wrapper.scrollLeft = scrollStartX - deltaX;
                    wrapper.scrollTop = scrollStartY - deltaY;
                }
                
                e.preventDefault();
            }, { passive: false });
            
            wrapper.addEventListener('touchend', () => {
                isDraggingTouch = false;
            });
            
            wrapper.addEventListener('touchcancel', () => {
                isDraggingTouch = false;
            });
        }
    }
    
    toggleFlagMode() {
        this.flagMode = (this.flagMode + 1) % 4;
        const btn = document.getElementById('flag-mode-btn');
        if (!btn) return;
        
        switch(this.flagMode) {
            case 0:
                btn.classList.remove('active');
                btn.textContent = '🚩';
                break;
            case 1:
                btn.classList.add('active');
                btn.textContent = '🚩';
                break;
            case 2:
                btn.classList.add('active');
                btn.textContent = '❓';
                break;
            case 3:
                btn.classList.add('active');
                btn.textContent = '❌';
                break;
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
        
        // 親クラスのinitBoardを使用
        this.initBoard(difficulty.rows, difficulty.cols, difficulty.mines);
        
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
    
    renderBoard() {
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        
        // ボード要素で右クリックメニューを無効化
        boardElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
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
        // タッチデバイス向けイベント
        if (this.isTouchDevice) {
            let touchTimer;
            let touchStartX, touchStartY;
            let hasMoved = false;
            let lastTapTime = 0;
            const doubleTapThreshold = 300;
            
            // タッチ開始
            cell.addEventListener('touchstart', (e) => {
                if (this.gameOver) return;
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                hasMoved = false;
                
                // 長押し検出用タイマー
                touchTimer = setTimeout(() => {
                    if (!hasMoved && !this.gameOver) {
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (this.flagged[row][col] || this.questioned[row][col]) {
                            // 旗または?がある場合は消去
                            if (this.flagged[row][col]) {
                                this.createRisingFlag(cell);
                                cell.classList.add('unflag-animation');
                                setTimeout(() => {
                                    cell.classList.remove('unflag-animation');
                                }, 200);
                            } else if (this.questioned[row][col]) {
                                this.createRisingQuestion(cell);
                                cell.classList.add('unflag-animation');
                                setTimeout(() => {
                                    cell.classList.remove('unflag-animation');
                                }, 200);
                            }
                            this.flagged[row][col] = false;
                            this.questioned[row][col] = false;
                            cell.classList.remove('flagged', 'questioned');
                            cell.textContent = '';
                            this.updateMineCount();
                        } else {
                            // 何もない場合は旗を立てる
                            this.flagged[row][col] = true;
                            cell.classList.add('flagged');
                            cell.classList.add('flag-animation');
                            this.createFallingFlag(cell);
                            setTimeout(() => {
                                cell.classList.remove('flag-animation');
                            }, 300);
                            this.updateMineCount();
                            this.checkWin();
                        }
                        this.isLongPress = true;
                    }
                }, 200);
            }, { passive: true });
            
            // タッチ移動
            cell.addEventListener('touchmove', (e) => {
                const moveX = e.touches[0].clientX;
                const moveY = e.touches[0].clientY;
                const distance = Math.sqrt(
                    Math.pow(moveX - touchStartX, 2) + 
                    Math.pow(moveY - touchStartY, 2)
                );
                
                if (distance > 10) {
                    hasMoved = true;
                    clearTimeout(touchTimer);
                }
            }, { passive: true });
            
            // タッチ終了
            cell.addEventListener('touchend', (e) => {
                clearTimeout(touchTimer);
                
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
                        this.chordReveal(row, col);
                        lastTapTime = 0;
                    } else {
                        // シングルタップの処理
                        if (this.flagMode > 0) {
                            this.handleCellMark(row, col);
                        } else if (this.flagged[row][col]) {
                            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                            this.flagged[row][col] = false;
                            this.questioned[row][col] = true;
                            cell.classList.remove('flagged');
                            cell.classList.add('questioned');
                            cell.textContent = '?';
                            this.updateMineCount();
                        } else if (this.questioned[row][col]) {
                            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                            this.questioned[row][col] = false;
                            this.flagged[row][col] = true;
                            cell.classList.remove('questioned');
                            cell.classList.add('flagged');
                            cell.textContent = '';
                            this.updateMineCount();
                            this.checkWin();
                        } else {
                            this.revealCell(row, col);
                        }
                        lastTapTime = currentTime;
                    }
                }
                
                e.preventDefault();
            });
            
            // タッチキャンセル
            cell.addEventListener('touchcancel', () => {
                clearTimeout(touchTimer);
                this.isLongPress = false;
            });
        }
        
        // PC向けイベント
        if (this.isPC) {
            // 左クリック
            cell.addEventListener('click', (e) => {
                if (this.gameOver) return;
                
                if (this.flagMode > 0) {
                    this.handleCellMark(row, col);
                } else if (!this.flagged[row][col] && !this.questioned[row][col]) {
                    this.revealCell(row, col);
                }
            });
            
            // 右クリック
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!this.gameOver && !this.revealed[row][col]) {
                    this.toggleFlag(row, col);
                }
            });
            
            // ダブルクリック
            cell.addEventListener('dblclick', (e) => {
                if (this.revealed[row][col] && this.board[row][col] > 0) {
                    this.chordReveal(row, col);
                }
            });
        }
    }
    
    // コアライブラリのメソッドをオーバーライド
    onGameOver() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = '😢';
        }
    }
    
    onGameWon() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = '😎';
        }
        this.showClearModal();
    }
    
    updateTimer() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = String(this.timer).padStart(3, '0');
        }
    }
    
    // 以下、UI関連のメソッドを追加
    handleCellMark(row, col) {
        if (this.revealed[row][col]) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagMode === 1) {
            // 旗モード
            if (!this.flagged[row][col] && !this.questioned[row][col]) {
                this.flagged[row][col] = true;
                cell.classList.add('flagged');
                cell.classList.add('flag-animation');
                this.createFallingFlag(cell);
                setTimeout(() => {
                    cell.classList.remove('flag-animation');
                }, 300);
                this.updateMineCount();
                this.checkWin();
            }
        } else if (this.flagMode === 2) {
            // ?モード
            if (!this.flagged[row][col] && !this.questioned[row][col]) {
                this.questioned[row][col] = true;
                cell.classList.add('questioned');
                cell.textContent = '?';
            }
        } else if (this.flagMode === 3) {
            // 取り消しモード
            if (this.flagged[row][col]) {
                this.createRisingFlag(cell);
                cell.classList.add('unflag-animation');
                setTimeout(() => {
                    cell.classList.remove('unflag-animation');
                }, 200);
                this.flagged[row][col] = false;
                cell.classList.remove('flagged');
                cell.textContent = '';
                this.updateMineCount();
            } else if (this.questioned[row][col]) {
                this.createRisingQuestion(cell);
                cell.classList.add('unflag-animation');
                setTimeout(() => {
                    cell.classList.remove('unflag-animation');
                }, 200);
                this.questioned[row][col] = false;
                cell.classList.remove('questioned');
                cell.textContent = '';
            }
        }
    }
    
    toggleFlag(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagged[row][col]) {
            this.flagged[row][col] = false;
            this.questioned[row][col] = true;
            cell.classList.remove('flagged');
            cell.classList.add('questioned');
            cell.textContent = '?';
            this.updateMineCount();
        } else if (this.questioned[row][col]) {
            this.questioned[row][col] = false;
            cell.classList.remove('questioned');
            cell.textContent = '';
        } else {
            this.flagged[row][col] = true;
            cell.classList.add('flagged');
            cell.classList.add('flag-animation');
            this.createFallingFlag(cell);
            setTimeout(() => {
                cell.classList.remove('flag-animation');
            }, 300);
            this.updateMineCount();
            this.checkWin();
        }
    }
    
    chordReveal(row, col) {
        if (!this.revealed[row][col]) return;
        
        const mineCount = this.board[row][col];
        if (mineCount === 0) return;
        
        let flagCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isValidCell(newRow, newCol) && this.flagged[newRow][newCol]) {
                    flagCount++;
                }
            }
        }
        
        if (flagCount === mineCount) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (this.isValidCell(newRow, newCol) && 
                        !this.flagged[newRow][newCol] && 
                        !this.revealed[newRow][newCol]) {
                        this.revealCell(newRow, newCol);
                    }
                }
            }
        }
    }
    
    updateMineCount() {
        let flaggedCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.flagged[row][col]) flaggedCount++;
            }
        }
        
        const flagCountElement = document.getElementById('flag-count');
        if (flagCountElement) {
            flagCountElement.textContent = `${flaggedCount}/${this.mineCount}`;
        }
        
        const mineRemainingElement = document.getElementById('mine-remaining');
        if (mineRemainingElement) {
            const remaining = this.mineCount - flaggedCount;
            mineRemainingElement.textContent = remaining;
        }
    }
    
    updateCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        
        if (this.revealed[row][col]) {
            cell.classList.add('revealed');
            
            if (this.board[row][col] === -1) {
                cell.classList.add('mine');
                cell.textContent = '💣';
            } else if (this.board[row][col] > 0) {
                cell.textContent = this.board[row][col];
                cell.classList.add(`number-${this.board[row][col]}`);
            }
        }
    }
    
    // ズーム機能
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
        const boardElement = document.getElementById('game-board');
        if (boardElement) {
            boardElement.style.transform = `scale(${this.zoomLevel})`;
            boardElement.style.transformOrigin = 'center center';
        }
    }
    
    // フォントサイズ機能
    increaseFontSize() {
        if (this.currentFontSize < this.maxFontSize) {
            this.currentFontSize = Math.min(this.currentFontSize + this.fontSizeStep, this.maxFontSize);
            this.updateFontSize();
            this.saveFontSizeSetting();
        }
    }
    
    decreaseFontSize() {
        if (this.currentFontSize > this.minFontSize) {
            this.currentFontSize = Math.max(this.currentFontSize - this.fontSizeStep, this.minFontSize);
            this.updateFontSize();
            this.saveFontSizeSetting();
        }
    }
    
    updateFontSize() {
        const display = document.getElementById('font-size-display');
        if (display) {
            display.textContent = `${this.currentFontSize}%`;
        }
        
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.fontSize = `${this.currentFontSize}%`;
        });
    }
    
    saveFontSizeSetting() {
        localStorage.setItem('minesweeper-font-size', this.currentFontSize);
    }
    
    loadFontSizeSetting() {
        const saved = localStorage.getItem('minesweeper-font-size');
        if (saved) {
            this.currentFontSize = parseInt(saved);
            this.updateFontSize();
        }
    }
    
    // テーマ機能
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.toggle('dark-theme');
        
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            const icon = themeBtn.querySelector('.theme-icon');
            const text = themeBtn.querySelector('.theme-text');
            if (isDark) {
                icon.textContent = '🌙';
                text.textContent = 'ダークモード';
            } else {
                icon.textContent = '☀️';
                text.textContent = 'ライトモード';
            }
        }
        
        localStorage.setItem('minesweeper-theme', isDark ? 'dark' : 'light');
    }
    
    loadThemeSetting() {
        const theme = localStorage.getItem('minesweeper-theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            const themeBtn = document.getElementById('theme-toggle-btn');
            if (themeBtn) {
                const icon = themeBtn.querySelector('.theme-icon');
                const text = themeBtn.querySelector('.theme-text');
                icon.textContent = '🌙';
                text.textContent = 'ダークモード';
            }
        }
    }
    
    // 旗アニメーション
    toggleFlagAnimation() {
        this.flagAnimationEnabled = !this.flagAnimationEnabled;
        
        const btn = document.getElementById('flag-animation-toggle-btn');
        if (btn) {
            const text = btn.querySelector('.flag-animation-text');
            text.textContent = this.flagAnimationEnabled ? 'ON' : 'OFF';
        }
        
        localStorage.setItem('minesweeper-flag-animation', this.flagAnimationEnabled);
    }
    
    loadFlagAnimationSetting() {
        const saved = localStorage.getItem('minesweeper-flag-animation');
        if (saved !== null) {
            this.flagAnimationEnabled = saved === 'true';
            const btn = document.getElementById('flag-animation-toggle-btn');
            if (btn) {
                const text = btn.querySelector('.flag-animation-text');
                text.textContent = this.flagAnimationEnabled ? 'ON' : 'OFF';
            }
        }
    }
    
    createFallingFlag(cell) {
        if (!this.flagAnimationEnabled) return;
        
        const container = document.getElementById('flag-animation-container');
        if (!container) return;
        
        const rect = cell.getBoundingClientRect();
        const flag = document.createElement('div');
        flag.className = 'falling-flag';
        flag.textContent = '🚩';
        flag.style.left = `${rect.left + rect.width / 2}px`;
        flag.style.top = `${rect.top - 30}px`;
        
        container.appendChild(flag);
        
        setTimeout(() => {
            flag.style.transform = `translateY(${rect.height + 30}px)`;
            flag.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            flag.remove();
        }, 310);
    }
    
    createRisingFlag(cell) {
        if (!this.flagAnimationEnabled) return;
        
        const container = document.getElementById('flag-animation-container');
        if (!container) return;
        
        const rect = cell.getBoundingClientRect();
        const flag = document.createElement('div');
        flag.className = 'rising-flag';
        flag.textContent = '🚩';
        flag.style.left = `${rect.left + rect.width / 2}px`;
        flag.style.top = `${rect.top + rect.height / 2}px`;
        
        container.appendChild(flag);
        
        setTimeout(() => {
            flag.style.transform = 'translateY(-50px)';
            flag.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            flag.remove();
        }, 210);
    }
    
    createRisingQuestion(cell) {
        if (!this.flagAnimationEnabled) return;
        
        const container = document.getElementById('flag-animation-container');
        if (!container) return;
        
        const rect = cell.getBoundingClientRect();
        const question = document.createElement('div');
        question.className = 'rising-flag';
        question.textContent = '?';
        question.style.left = `${rect.left + rect.width / 2}px`;
        question.style.top = `${rect.top + rect.height / 2}px`;
        
        container.appendChild(question);
        
        setTimeout(() => {
            question.style.transform = 'translateY(-50px)';
            question.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            question.remove();
        }, 210);
    }
    
    // 省電力モード
    togglePowerSaveMode() {
        this.powerSaveMode = !this.powerSaveMode;
        
        const body = document.body;
        if (this.powerSaveMode) {
            body.classList.add('power-save-mode');
        } else {
            body.classList.remove('power-save-mode');
        }
        
        const btn = document.getElementById('power-save-toggle-btn');
        if (btn) {
            const text = btn.querySelector('.power-save-text');
            text.textContent = this.powerSaveMode ? 'OFF' : 'ON';
        }
        
        localStorage.setItem('minesweeper-power-save', this.powerSaveMode);
    }
    
    loadPowerSaveSettings() {
        const saved = localStorage.getItem('minesweeper-power-save');
        if (saved === 'true') {
            this.powerSaveMode = true;
            document.body.classList.add('power-save-mode');
            const btn = document.getElementById('power-save-toggle-btn');
            if (btn) {
                const text = btn.querySelector('.power-save-text');
                text.textContent = 'OFF';
            }
        }
    }
    
    // リバースモード
    toggleReverseMode() {
        this.reverseMode = !this.reverseMode;
        
        const btn = document.getElementById('reverse-toggle-btn');
        if (btn) {
            const text = btn.querySelector('.reverse-text');
            text.textContent = this.reverseMode ? 'ON' : 'OFF';
        }
        
        localStorage.setItem('minesweeper-reverse-mode', this.reverseMode);
    }
    
    loadReverseModeSetting() {
        const saved = localStorage.getItem('minesweeper-reverse-mode');
        if (saved === 'true') {
            this.reverseMode = true;
            const btn = document.getElementById('reverse-toggle-btn');
            if (btn) {
                const text = btn.querySelector('.reverse-text');
                text.textContent = 'ON';
            }
        }
    }
    
    // モーダル関連
    openSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    openHelp() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    closeHelp() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    showClearModal() {
        const modal = document.getElementById('clear-modal');
        if (!modal) return;
        
        const message = document.getElementById('clear-message');
        if (message) {
            message.textContent = `タイム: ${this.timer}秒`;
        }
        
        const nextBtn = document.getElementById('next-difficulty-btn');
        const replayBtn = document.getElementById('replay-difficulty-btn');
        
        // 次の難易度を決定
        const difficultyOrder = ['easy', 'medium', 'hard'];
        const currentIndex = difficultyOrder.indexOf(this.currentDifficulty);
        
        if (currentIndex < difficultyOrder.length - 1) {
            // 次の難易度がある場合
            const nextDifficulty = difficultyOrder[currentIndex + 1];
            if (nextBtn) {
                nextBtn.style.display = 'block';
                nextBtn.onclick = () => {
                    this.currentDifficulty = nextDifficulty;
                    const select = document.getElementById('difficulty-select');
                    if (select) {
                        select.value = nextDifficulty;
                    }
                    this.newGame();
                    modal.classList.remove('active');
                };
            }
        } else {
            // 最高難易度の場合
            if (nextBtn) {
                nextBtn.style.display = 'none';
            }
        }
        
        if (replayBtn) {
            replayBtn.onclick = () => {
                this.newGame();
                modal.classList.remove('active');
            };
        }
        
        modal.classList.add('active');
    }
    
    // ページ表示状態の監視
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // ページが非表示になった
                if (this.timerInterval) {
                    this.wasTimerRunning = true;
                    this.stopTimer();
                }
            } else {
                // ページが表示された
                if (this.wasTimerRunning && !this.gameOver && !this.gameWon && !this.firstClick) {
                    this.wasTimerRunning = false;
                    this.startTimer();
                }
            }
        });
    }
    
    // コアのrevealCellメソッドをオーバーライドして、UI更新を追加
    revealCell(row, col) {
        super.revealCell(row, col);
        this.updateCell(row, col);
        
        // 周囲のセルも更新（0の場合の連鎖開示）
        if (this.board[row][col] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (this.isValidCell(newRow, newCol) && this.revealed[newRow][newCol]) {
                        this.updateCell(newRow, newCol);
                    }
                }
            }
        }
    }
    
    // コアのrevealAllMinesメソッドをオーバーライドして、UI更新を追加
    revealAllMines() {
        super.revealAllMines();
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1) {
                    this.updateCell(row, col);
                }
            }
        }
    }
}

// ゲームの初期化
document.addEventListener('DOMContentLoaded', () => {
    const game = new MobileMinesweeper();
    
    // 設定の読み込み
    game.loadThemeSetting();
    game.loadFontSizeSetting();
});