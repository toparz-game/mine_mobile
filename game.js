class Minesweeper {
    constructor() {
        // デバイス判定
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.isPC = !this.isTouchDevice;
        
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
        this.questioned = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.mineCount = 0;
        this.timer = 0;
        this.timerInterval = null;
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
                // タッチデバイスはtouchstartのみ
                zoomInBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.zoomIn();
                }, { passive: false });
            } else {
                // PCはclickのみ
                zoomInBtn.addEventListener('click', () => this.zoomIn());
            }
        }
        
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            if (this.isTouchDevice) {
                // タッチデバイスはtouchstartのみ
                zoomOutBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.zoomOut();
                }, { passive: false });
            } else {
                // PCはclickのみ
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
                // スクロール位置が最上部の場合のタッチ開始を記録
                if (window.pageYOffset === 0) {
                    this.touchStartY = e.touches[0].clientY;
                }
            }, { passive: true }); // passiveをtrueに変更
            
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
                // シングルタッチの場合のみ処理
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
        this.questioned = [];
        
        for (let row = 0; row < this.rows; row++) {
            this.board[row] = [];
            this.revealed[row] = [];
            this.flagged[row] = [];
            this.questioned[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = 0;
                this.revealed[row][col] = false;
                this.flagged[row][col] = false;
                this.questioned[row][col] = false;
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
        // タッチデバイス向けイベント
        if (this.isTouchDevice) {
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
                    // 長押しで旗を立てる、または旗/?を消去
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
            }, 200); // 200ms長押しで旗
            
                // preventDefaultを削除してスクロールを可能にする
                // e.preventDefault();
            }, { passive: true }); // passiveをtrueに変更
            
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
            }, { passive: true }); // passiveをtrueに変更
            
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
                    if (this.flagMode > 0) {
                        this.handleCellMark(row, col);
                    } else if (this.flagged[row][col]) {
                        // 旗がある時はタップで?に切り替え
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        this.flagged[row][col] = false;
                        this.questioned[row][col] = true;
                        cell.classList.remove('flagged');
                        cell.classList.add('questioned');
                        cell.textContent = '?';
                        this.updateMineCount();
                    } else if (this.questioned[row][col]) {
                        // ?がある時はタップで旗に戻す
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        this.questioned[row][col] = false;
                        this.flagged[row][col] = true;
                        cell.classList.remove('questioned');
                        cell.classList.add('flagged');
                        cell.textContent = '';
                        // ?から旗への切り替え時はアニメーションなし
                        this.updateMineCount();
                        this.checkWin();
                    } else {
                        this.revealCell(row, col);
                    }
                    lastTapTime = currentTime;
                }
                    // タップ時のみpreventDefaultを呼ぶ
                    e.preventDefault();
                }
            }, { passive: false });
            
            // タッチキャンセル
            cell.addEventListener('touchcancel', () => {
                clearTimeout(touchTimer);
                this.isLongPress = false;
                hasMoved = false;
            }, { passive: true }); // passiveをtrueに変更
        }
        
        // PC向けイベント
        if (this.isPC) {
            // PCのクリックイベント
            cell.addEventListener('click', (e) => {
            if (!this.gameOver) {
                if (e.shiftKey || this.flagMode > 0) {
                    this.handleCellMark(row, col);
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
                    this.cycleFlag(row, col);
                }
                return false;
            });
        }
    }
    
    revealCell(row, col) {
        if (this.revealed[row][col] || this.flagged[row][col] || this.questioned[row][col]) return;
        
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
                    !this.flagged[newRow][newCol] &&
                    !this.questioned[newRow][newCol]) {
                    this.revealCell(newRow, newCol);
                }
            }
        }
    }
    
    toggleFlag(row, col) {
        // この関数は現在使われていません（長押し処理に統合）
        if (this.revealed[row][col]) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagged[row][col] || this.questioned[row][col]) {
            // 旗または?がある場合は消去
            if (this.flagged[row][col]) {
                this.createRisingFlag(cell);
                cell.classList.add('unflag-animation');
                setTimeout(() => {
                    cell.classList.remove('unflag-animation');
                }, 200);
            }
            this.flagged[row][col] = false;
            this.questioned[row][col] = false;
            cell.classList.remove('flagged', 'questioned');
            cell.textContent = '';
        } else {
            // 何もない場合は旗を立てる
            this.flagged[row][col] = true;
            cell.classList.add('flagged');
            cell.classList.add('flag-animation');
            this.createFallingFlag(cell);
            setTimeout(() => {
                cell.classList.remove('flag-animation');
            }, 300);
        }
        
        this.updateMineCount();
        this.checkWin();
    }
    
    // PC用: 右クリックで旗→?→なしをサイクル
    cycleFlag(row, col) {
        if (this.revealed[row][col]) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagged[row][col]) {
            // 旗 → ?
            this.createRisingFlag(cell);
            cell.classList.add('unflag-animation');
            setTimeout(() => {
                cell.classList.remove('unflag-animation');
            }, 200);
            this.flagged[row][col] = false;
            this.questioned[row][col] = true;
            cell.classList.remove('flagged');
            cell.classList.add('questioned');
            cell.textContent = '?';
        } else if (this.questioned[row][col]) {
            // ? → なし
            this.createRisingQuestion(cell);
            cell.classList.add('unflag-animation');
            setTimeout(() => {
                cell.classList.remove('unflag-animation');
            }, 200);
            this.questioned[row][col] = false;
            cell.classList.remove('questioned');
            cell.textContent = '';
        } else {
            // なし → 旗
            this.flagged[row][col] = true;
            cell.classList.add('flagged');
            cell.classList.add('flag-animation');
            
            // 画面上部から旗が降ってくるアニメーション
            this.createFallingFlag(cell);
            
            setTimeout(() => {
                cell.classList.remove('flag-animation');
            }, 300);
        }
        
        this.updateMineCount();
        this.checkWin();
    }
    
    // 旗モード/？モード/取り消しモードでのタップ処理
    handleCellMark(row, col) {
        if (this.revealed[row][col]) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagMode === 1) {
            // 旗モード
            if (this.flagged[row][col] || this.questioned[row][col]) {
                // 既に旗か?がある場合は消す
                if (this.flagged[row][col]) {
                    this.createRisingFlag(cell);
                    cell.classList.add('unflag-animation');
                    setTimeout(() => {
                        cell.classList.remove('unflag-animation');
                    }, 200);
                }
                this.flagged[row][col] = false;
                this.questioned[row][col] = false;
                cell.classList.remove('flagged', 'questioned');
                cell.textContent = '';
            } else {
                // 旗を立てる
                this.flagged[row][col] = true;
                cell.classList.add('flagged');
                cell.classList.add('flag-animation');
                
                this.createFallingFlag(cell);
                
                setTimeout(() => {
                    cell.classList.remove('flag-animation');
                }, 300);
            }
        } else if (this.flagMode === 2) {
            // ?モード
            if (this.questioned[row][col] || this.flagged[row][col]) {
                // 既に?か旗がある場合は消す
                if (this.flagged[row][col]) {
                    this.createRisingFlag(cell);
                    cell.classList.add('unflag-animation');
                    setTimeout(() => {
                        cell.classList.remove('unflag-animation');
                    }, 200);
                }
                this.questioned[row][col] = false;
                this.flagged[row][col] = false;
                cell.classList.remove('questioned', 'flagged');
                cell.textContent = '';
            } else {
                // ?を付ける
                this.questioned[row][col] = true;
                cell.classList.add('questioned');
                cell.textContent = '?';
            }
        } else if (this.flagMode === 3) {
            // 取り消しモード
            if (this.flagged[row][col] || this.questioned[row][col]) {
                if (this.flagged[row][col]) {
                    this.createRisingFlag(cell);
                    cell.classList.add('unflag-animation');
                    setTimeout(() => {
                        cell.classList.remove('unflag-animation');
                    }, 200);
                }
                this.flagged[row][col] = false;
                this.questioned[row][col] = false;
                cell.classList.remove('flagged', 'questioned');
                cell.textContent = '';
            }
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
                        !this.flagged[newRow][newCol] &&
                        !this.questioned[newRow][newCol]) {
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
                    cell.textContent = '❌';
                }
            }
        }
        
        // クリア時にポップアップを表示
        if (won) {
            setTimeout(() => {
                this.showClearModal();
            }, 500);
        }
    }
    
    showClearModal() {
        const modal = document.getElementById('clear-modal');
        if (!modal) return;
        
        // 現在の難易度に応じたメッセージを設定
        const messageElement = document.getElementById('clear-message');
        const nextButton = document.getElementById('next-difficulty-btn');
        const replayButton = document.getElementById('replay-difficulty-btn');
        
        let message = '';
        let nextDifficulty = '';
        let showNextButton = true;
        
        switch(this.currentDifficulty) {
            case 'easy':
                message = 'おめでとう！初級をクリアしました！\n中級に挑戦してみましょう！';
                nextDifficulty = 'medium';
                break;
            case 'medium':
                message = 'おめでとう！中級をクリアしました！\n上級で腕前を試してみませんか？';
                nextDifficulty = 'hard';
                break;
            case 'hard':
                message = 'おめでとう！上級をクリアしました！\n素晴らしいプレイでした！';
                showNextButton = false;
                break;
            case 'hiddeneasy':
                message = 'おめでとう！隠し初級をクリアしました！\n隠し中級に挑戦してみましょう！';
                nextDifficulty = 'hiddenmedium';
                break;
            case 'hiddenmedium':
                message = 'おめでとう！隠し中級をクリアしました！\n隠し上級で腕前を試してみませんか？';
                nextDifficulty = 'hiddenhard';
                break;
            case 'hiddenhard':
                message = 'おめでとう！隠し上級をクリアしました！\n究極の難易度に挑戦しますか？';
                nextDifficulty = 'extreme';
                break;
            case 'extreme':
                message = 'おめでとう！究極難易度をクリアしました！\nあなたは真のマインスイーパーマスターです！';
                showNextButton = false;
                break;
        }
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        if (nextButton) {
            if (showNextButton) {
                nextButton.style.display = 'block';
                nextButton.onclick = () => {
                    this.currentDifficulty = nextDifficulty;
                    const difficultySelect = document.getElementById('difficulty-select');
                    if (difficultySelect) {
                        difficultySelect.value = nextDifficulty;
                    }
                    this.newGame();
                    this.closeClearModal();
                };
            } else {
                nextButton.style.display = 'none';
            }
        }
        
        if (replayButton) {
            replayButton.onclick = () => {
                this.newGame();
                this.closeClearModal();
            };
        }
        
        modal.classList.add('show');
    }
    
    closeClearModal() {
        const modal = document.getElementById('clear-modal');
        if (modal) {
            modal.classList.remove('show');
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
    
    createRisingFlag(targetCell) {
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
        flag.className = 'rising-flag';
        flag.textContent = '🚩';
        
        // 開始位置（セルの中心）に配置
        flag.style.left = (cellCenterX - 25) + 'px';
        flag.style.top = cellCenterY + 'px';
        
        container.appendChild(flag);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            flag.remove();
        }, 400);
    }
    
    createRisingQuestion(targetCell) {
        // アニメーションが無効の場合は実行しない
        if (!this.flagAnimationEnabled) return;
        
        const container = document.getElementById('flag-animation-container');
        if (!container) return;
        
        // セルの位置を取得
        const cellRect = targetCell.getBoundingClientRect();
        const cellCenterX = cellRect.left + cellRect.width / 2;
        const cellCenterY = cellRect.top + cellRect.height / 2;
        
        // ？要素を作成
        const question = document.createElement('div');
        question.className = 'rising-question';
        question.textContent = '?';
        question.style.fontWeight = 'bold';
        
        // 開始位置（セルの中心）に配置
        question.style.left = (cellCenterX - 25) + 'px';
        question.style.top = cellCenterY + 'px';
        
        container.appendChild(question);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            question.remove();
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
    
    loadPowerSaveSettings() {
        // グラデーション・影の設定読み込み（デフォルトON）
        const savedPowerSave = localStorage.getItem('powerSaveMode');
        const powerBtn = document.getElementById('power-save-toggle-btn');
        if (powerBtn) {
            const powerText = powerBtn.querySelector('.power-save-text');
            if (savedPowerSave === 'off') {
                this.powerSaveMode = true;
                if (powerText) powerText.textContent = 'OFF';
                document.body.classList.add('power-save-mode');
            } else {
                this.powerSaveMode = false;
                if (powerText) powerText.textContent = 'ON';
            }
        }
        
    }
    
    loadReverseModeSetting() {
        // リバース操作設定の読み込み（デフォルトOFF）
        const savedReverse = localStorage.getItem('reverseMode');
        const reverseBtn = document.getElementById('reverse-toggle-btn');
        if (reverseBtn) {
            const reverseText = reverseBtn.querySelector('.reverse-text');
            if (savedReverse === 'on') {
                this.reverseMode = true;
                if (reverseText) reverseText.textContent = 'ON';
            } else {
                this.reverseMode = false;
                if (reverseText) reverseText.textContent = 'OFF';
            }
        }
    }
    
    togglePowerSaveMode() {
        this.powerSaveMode = !this.powerSaveMode;
        const btn = document.getElementById('power-save-toggle-btn');
        if (!btn) return;
        
        const powerText = btn.querySelector('.power-save-text');
        
        if (this.powerSaveMode) {
            if (powerText) powerText.textContent = 'OFF';
            document.body.classList.add('power-save-mode');
        } else {
            if (powerText) powerText.textContent = 'ON';
            document.body.classList.remove('power-save-mode');
        }
        
        // 設定を保存（逆転：OFFが省電力モード）
        localStorage.setItem('powerSaveMode', this.powerSaveMode ? 'off' : 'on');
    }
    
    toggleReverseMode() {
        this.reverseMode = !this.reverseMode;
        const btn = document.getElementById('reverse-toggle-btn');
        if (!btn) return;
        
        const reverseText = btn.querySelector('.reverse-text');
        
        if (this.reverseMode) {
            if (reverseText) reverseText.textContent = 'ON';
        } else {
            if (reverseText) reverseText.textContent = 'OFF';
        }
        
        // 設定を保存
        localStorage.setItem('reverseMode', this.reverseMode ? 'on' : 'off');
    }
    
    setupVisibilityHandler() {
        // Page Visibility APIを使用してバックグラウンド時の処理を制御
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // ページが非表示になった時
                if (this.timerInterval) {
                    this.wasTimerRunning = true;
                    this.stopTimer();
                }
            } else {
                // ページが表示された時
                if (this.wasTimerRunning && !this.gameOver && !this.firstClick) {
                    this.startTimer();
                    this.wasTimerRunning = false;
                }
            }
        });
        
        // ブラウザのフォーカス/ブラー処理も追加
        window.addEventListener('blur', () => {
            if (this.timerInterval && !document.hidden) {
                this.wasTimerRunning = true;
                this.stopTimer();
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.wasTimerRunning && !this.gameOver && !this.firstClick && !document.hidden) {
                this.startTimer();
                this.wasTimerRunning = false;
            }
        });
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
    
    openHelp() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.add('show');
            // デバイスに応じて適切なセクションを表示
            const mobileHelp = document.getElementById('mobile-help');
            const pcHelp = document.getElementById('pc-help');
            if (mobileHelp && pcHelp) {
                if (this.isTouchDevice) {
                    mobileHelp.style.display = 'block';
                    pcHelp.style.display = 'none';
                } else {
                    mobileHelp.style.display = 'none';
                    pcHelp.style.display = 'block';
                }
            }
        }
    }
    
    closeHelp() {
        const modal = document.getElementById('help-modal');
        if (modal) modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Minesweeper();
        game.loadTheme();
        game.loadPowerSaveSettings();
        game.loadReverseModeSetting();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});