// MobileMinesweeper: MinesweeperCoreを継承したモバイル版の実装
class MobileMinesweeper extends MinesweeperCore {
    constructor() {
        super();
        
        // タッチデバイス判定
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // ボタン連打防止用
        this.buttonCooldown = false;
        this.buttonCooldownTime = 100; // ミリ秒
        this.zoomTransitioning = false; // ズームアニメーション中フラグ
        this.zoomDebounceTimer = null; // デバウンス用タイマー
        
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
        this.longPressTimer = null;
        this.isLongPress = false;
        this.isPinching = false;
        this.touchCount = 0;
        this.multiTouchDetected = false;
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
        
        
        // 省電力モード設定
        this.powerSaveMode = false;
        
        // リバース操作設定
        this.reverseMode = false;
        
        // 音響管理
        this.soundManager = new SoundManager();
        this.isChainReveal = false; // 連鎖開示中フラグ
        this.revealCount = 0; // 連鎖開示中のセル数カウント
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.newGame();
    }
    
    setupEventListeners() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            // タッチデバイスの場合はtouchstartを優先
            if (this.isTouchDevice) {
                let isProcessing = false;
                resetBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.newGame();
                    setTimeout(() => { isProcessing = false; }, 30);
                });
            } else {
                resetBtn.addEventListener('click', () => this.newGame());
            }
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
                let isProcessing = false;
                zoomInBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.zoomIn();
                    setTimeout(() => { isProcessing = false; }, 20);
                });
            } else {
                zoomInBtn.addEventListener('click', () => this.zoomIn());
            }
        }
        
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                zoomOutBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.zoomOut();
                    setTimeout(() => { isProcessing = false; }, 20);
                });
            } else {
                zoomOutBtn.addEventListener('click', () => this.zoomOut());
            }
        }
        
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                settingsBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.openSettings();
                    setTimeout(() => { isProcessing = false; }, 30);
                });
            } else {
                settingsBtn.addEventListener('click', () => {
                    this.openSettings();
                });
            }
        }
        
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                helpBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.openHelp();
                    setTimeout(() => { isProcessing = false; }, 30);
                });
            } else {
                helpBtn.addEventListener('click', () => {
                    this.openHelp();
                });
            }
        }
        
        const closeSettingsBtn = document.getElementById('close-settings');
        if (closeSettingsBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                closeSettingsBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.closeSettings();
                    setTimeout(() => { isProcessing = false; }, 30);
                });
            } else {
                closeSettingsBtn.addEventListener('click', () => {
                    this.closeSettings();
                });
            }
        }
        
        const closeHelpBtn = document.getElementById('close-help');
        if (closeHelpBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                closeHelpBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.closeHelp();
                    setTimeout(() => { isProcessing = false; }, 30);
                });
            } else {
                closeHelpBtn.addEventListener('click', () => {
                    this.closeHelp();
                });
            }
        }
        
        const fontSizeUpBtn = document.getElementById('font-size-up-btn');
        if (fontSizeUpBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                fontSizeUpBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.increaseFontSize();
                    setTimeout(() => { isProcessing = false; }, 20);
                });
            } else {
                fontSizeUpBtn.addEventListener('click', () => {
                    this.increaseFontSize();
                });
            }
        }
        
        const fontSizeDownBtn = document.getElementById('font-size-down-btn');
        if (fontSizeDownBtn) {
            if (this.isTouchDevice) {
                let isProcessing = false;
                fontSizeDownBtn.addEventListener('touchstart', (e) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    e.preventDefault();
                    this.decreaseFontSize();
                    setTimeout(() => { isProcessing = false; }, 20);
                });
            } else {
                fontSizeDownBtn.addEventListener('click', () => {
                    this.decreaseFontSize();
                });
            }
        }
        
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            if (this.isTouchDevice) {
                let touchStartY = 0;
                let touchMoved = false;
                
                themeToggleBtn.addEventListener('touchstart', (e) => {
                    touchStartY = e.touches[0].clientY;
                    touchMoved = false;
                }, { passive: true });
                
                themeToggleBtn.addEventListener('touchmove', (e) => {
                    const touchY = e.touches[0].clientY;
                    if (Math.abs(touchY - touchStartY) > 5) {
                        touchMoved = true;
                    }
                }, { passive: true });
                
                themeToggleBtn.addEventListener('touchend', (e) => {
                    if (!touchMoved) {
                        this.toggleTheme();
                    }
                }, { passive: true });
            } else {
                themeToggleBtn.addEventListener('click', () => {
                    this.toggleTheme();
                });
            }
        }
        
        
        const powerSaveToggleBtn = document.getElementById('power-save-toggle-btn');
        if (powerSaveToggleBtn) {
            if (this.isTouchDevice) {
                let touchStartY = 0;
                let touchMoved = false;
                
                powerSaveToggleBtn.addEventListener('touchstart', (e) => {
                    touchStartY = e.touches[0].clientY;
                    touchMoved = false;
                }, { passive: true });
                
                powerSaveToggleBtn.addEventListener('touchmove', (e) => {
                    const touchY = e.touches[0].clientY;
                    if (Math.abs(touchY - touchStartY) > 5) {
                        touchMoved = true;
                    }
                }, { passive: true });
                
                powerSaveToggleBtn.addEventListener('touchend', (e) => {
                    if (!touchMoved) {
                        this.togglePowerSaveMode();
                    }
                }, { passive: true });
            } else {
                powerSaveToggleBtn.addEventListener('click', () => {
                    this.togglePowerSaveMode();
                });
            }
        }
        
        const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
        if (reverseToggleBtn) {
            if (this.isTouchDevice) {
                let touchStartY = 0;
                let touchMoved = false;
                
                reverseToggleBtn.addEventListener('touchstart', (e) => {
                    touchStartY = e.touches[0].clientY;
                    touchMoved = false;
                }, { passive: true });
                
                reverseToggleBtn.addEventListener('touchmove', (e) => {
                    const touchY = e.touches[0].clientY;
                    if (Math.abs(touchY - touchStartY) > 5) {
                        touchMoved = true;
                    }
                }, { passive: true });
                
                reverseToggleBtn.addEventListener('touchend', (e) => {
                    if (!touchMoved) {
                        this.toggleReverseMode();
                    }
                }, { passive: true });
            } else {
                reverseToggleBtn.addEventListener('click', () => {
                    this.toggleReverseMode();
                });
            }
        }
        
        const soundToggleBtn = document.getElementById('sound-toggle-btn');
        if (soundToggleBtn) {
            if (this.isTouchDevice) {
                let touchStartY = 0;
                let touchMoved = false;
                
                soundToggleBtn.addEventListener('touchstart', (e) => {
                    touchStartY = e.touches[0].clientY;
                    touchMoved = false;
                }, { passive: true });
                
                soundToggleBtn.addEventListener('touchmove', (e) => {
                    const touchY = e.touches[0].clientY;
                    if (Math.abs(touchY - touchStartY) > 5) {
                        touchMoved = true;
                    }
                }, { passive: true });
                
                soundToggleBtn.addEventListener('touchend', (e) => {
                    if (!touchMoved) {
                        this.toggleSound();
                    }
                }, { passive: true });
            } else {
                soundToggleBtn.addEventListener('click', () => {
                    this.toggleSound();
                });
            }
        }
        
        const volumeUpBtn = document.getElementById('volume-up-btn');
        if (volumeUpBtn) {
            if (this.isTouchDevice) {
                volumeUpBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.increaseVolume();
                });
            } else {
                volumeUpBtn.addEventListener('click', () => {
                    this.increaseVolume();
                });
            }
        }
        
        const volumeDownBtn = document.getElementById('volume-down-btn');
        if (volumeDownBtn) {
            if (this.isTouchDevice) {
                volumeDownBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.decreaseVolume();
                });
            } else {
                volumeDownBtn.addEventListener('click', () => {
                    this.decreaseVolume();
                });
            }
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
        
        // ゲームボードのピンチイベントを防止と複数タッチ検出
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            gameBoard.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                    this.multiTouchDetected = true;
                }
            }, { passive: false });
            
            gameBoard.addEventListener('touchend', (e) => {
                if (e.touches.length === 0) {
                    // すべての指が離れたらリセット
                    setTimeout(() => {
                        this.multiTouchDetected = false;
                    }, 100);
                }
            }, { passive: false });
        }
        
        // タッチデバイス向けのイベント防止
        // グローバルなピンチズーム防止（モーダル内を除く）
        document.addEventListener('touchmove', (e) => {
            // モーダル内のスクロールは許可
            const settingsModal = document.getElementById('settings-modal');
            const helpModal = document.getElementById('help-modal');
            if ((settingsModal && settingsModal.contains(e.target)) || 
                (helpModal && helpModal.contains(e.target))) {
                return;
            }
            
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // プルトゥリフレッシュを完全に防止（モーダル内は除外）
        let lastTouchY = 0;
        let preventPullToRefresh = false;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // モーダル内のタッチイベントは無視
                const settingsModal = document.getElementById('settings-modal');
                const helpModal = document.getElementById('help-modal');
                if ((settingsModal && settingsModal.contains(e.target)) || 
                    (helpModal && helpModal.contains(e.target))) {
                    preventPullToRefresh = false;
                    return;
                }
                
                lastTouchY = e.touches[0].clientY;
                preventPullToRefresh = window.pageYOffset === 0;
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (preventPullToRefresh) {
                // モーダル内のタッチイベントは無視
                const settingsModal = document.getElementById('settings-modal');
                const helpModal = document.getElementById('help-modal');
                if ((settingsModal && settingsModal.contains(e.target)) || 
                    (helpModal && helpModal.contains(e.target))) {
                    return;
                }
                
                const touchY = e.touches[0].clientY;
                const touchDiff = touchY - lastTouchY;
                
                // 下にスクロールしようとしていて、かつページが一番上にある場合
                if (touchDiff > 0 && window.pageYOffset === 0) {
                    e.preventDefault();
                }
                
                lastTouchY = touchY;
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            preventPullToRefresh = false;
        });
        
        // ダブルタップズーム防止（ゲームボード内のみ）
        const gameBoardElement = document.getElementById('game-board');
        if (gameBoardElement) {
            gameBoardElement.addEventListener('touchend', (e) => {
                const now = new Date().getTime();
                if (now - this.lastTapTime < 500) {
                    e.preventDefault();
                }
                this.lastTapTime = now;
            }, { passive: false });
        }
        
        // iOS Safari用のジェスチャーイベント防止
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
            return false;
        });
        
        // ドラッグイベントの設定
        this.setupDragEvents();
    }
    
    setupDragEvents() {
        const wrapper = document.querySelector('.game-board-wrapper');
        if (!wrapper) return;
        
        // 設定の読み込み
        this.loadPowerSaveSettings();
        this.loadReverseModeSetting();
        this.loadSoundSettings();
        
        
        // タッチデバイス向けのドラッグ処理
        {
            let isDraggingTouch = false;
            let touchStartX = 0;
            let touchStartY = 0;
            let scrollStartX = 0;
            let scrollStartY = 0;
            let touchStartTime = 0;
            let dragThreshold = 10; // ドラッグと判定する最小移動量
            let touchStartTarget = null;
            
            wrapper.addEventListener('touchstart', (e) => {
                // セル以外のタッチ、またはゲームボードの空き領域のタッチを処理
                if (e.touches.length === 1) {
                    touchStartTarget = e.target;
                    const isCell = e.target.classList && e.target.classList.contains('cell');
                    
                    // セルではない場合、またはwrapper自体へのタッチの場合のみドラッグを開始
                    if (!isCell) {
                        isDraggingTouch = true;
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        scrollStartX = wrapper.scrollLeft;
                        scrollStartY = wrapper.scrollTop;
                        touchStartTime = Date.now();
                    }
                }
            }, { passive: true });
            
            wrapper.addEventListener('touchmove', (e) => {
                if (!isDraggingTouch || e.touches.length !== 1) return;
                
                const touch = e.touches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // 閾値を超えたらドラッグと判定
                if (distance > dragThreshold) {
                    // リバースモードの場合、スクロール方向を反転
                    if (this.reverseMode) {
                        wrapper.scrollLeft = scrollStartX + deltaX;
                        wrapper.scrollTop = scrollStartY + deltaY;
                    } else {
                        wrapper.scrollLeft = scrollStartX - deltaX;
                        wrapper.scrollTop = scrollStartY - deltaY;
                    }
                    
                    e.preventDefault();
                }
            }, { passive: false });
            
            wrapper.addEventListener('touchend', () => {
                isDraggingTouch = false;
                touchStartTarget = null;
            });
            
            wrapper.addEventListener('touchcancel', () => {
                isDraggingTouch = false;
                touchStartTarget = null;
            });
        }
        
        // セルのタッチイベントでもドラッグを有効にする
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            let isDraggingFromCell = false;
            let cellTouchStartX = 0;
            let cellTouchStartY = 0;
            let cellScrollStartX = 0;
            let cellScrollStartY = 0;
            let cellTouchStartTime = 0;
            let cellDragThreshold = 15; // セルからのドラッグ判定閾値
            let hasMoved = false;
            
            gameBoard.addEventListener('touchstart', (e) => {
                // 2本指以上のタッチは無視
                if (e.touches.length > 1) {
                    hasMoved = true;
                    isDraggingFromCell = false;
                    return;
                }
                
                if (e.target.classList && e.target.classList.contains('cell') && e.touches.length === 1) {
                    cellTouchStartX = e.touches[0].clientX;
                    cellTouchStartY = e.touches[0].clientY;
                    cellScrollStartX = wrapper.scrollLeft;
                    cellScrollStartY = wrapper.scrollTop;
                    cellTouchStartTime = Date.now();
                    hasMoved = false;
                }
            }, { passive: true });
            
            gameBoard.addEventListener('touchmove', (e) => {
                // 2本指以上のタッチは無視
                if (e.touches.length > 1) {
                    hasMoved = true;
                    isDraggingFromCell = false;
                    return;
                }
                
                if (e.target.classList && e.target.classList.contains('cell') && e.touches.length === 1) {
                    const touch = e.touches[0];
                    const deltaX = touch.clientX - cellTouchStartX;
                    const deltaY = touch.clientY - cellTouchStartY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    
                    // セルからのドラッグ判定
                    if (distance > cellDragThreshold) {
                        hasMoved = true;
                        isDraggingFromCell = true;
                        
                        // リバースモードの場合、スクロール方向を反転
                        if (this.reverseMode) {
                            wrapper.scrollLeft = cellScrollStartX + deltaX;
                            wrapper.scrollTop = cellScrollStartY + deltaY;
                        } else {
                            wrapper.scrollLeft = cellScrollStartX - deltaX;
                            wrapper.scrollTop = cellScrollStartY - deltaY;
                        }
                        
                        // セルの操作をキャンセル
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            }, { passive: false });
            
            gameBoard.addEventListener('touchend', () => {
                isDraggingFromCell = false;
            });
        }
    }
    
    newGame() {
        this.stopTimer();
        this.timer = 0;
        this.updateTimer();
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        
        // 新しいゲームの効果音
        this.soundManager.playSound('newGame');
        
        const difficulty = this.difficulties[this.currentDifficulty];
        
        // 親クラスのinitBoardを使用
        this.initBoard(difficulty.rows, difficulty.cols, difficulty.mines);
        
        this.renderBoard();
        this.updateMineCount();
        
        // 初級と裏初級の場合、デフォルトズームを設定
        if (this.currentDifficulty === 'easy' || this.currentDifficulty === 'hiddeneasy') {
            this.zoomLevel = 1.3; // 1.0 + (0.1 * 3) = 1.3
            this.updateZoom();
        } else {
            this.zoomLevel = 1.0;
            this.updateZoom();
        }
        
        // 残りの地雷数を初期化
        const mineRemainingElement = document.getElementById('mine-remaining');
        if (mineRemainingElement) {
            mineRemainingElement.textContent = this.mineCount;
        }
        
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = 'リスタート';
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
            const dragThreshold = 15; // ドラッグと判定する最小移動量
            
            // タッチ開始
            cell.addEventListener('touchstart', (e) => {
                if (this.gameOver) return;
                
                // ユーザー操作を記録（音響の自動再生ポリシー対応）
                this.soundManager.recordUserInteraction();
                
                // 2本指以上のタッチは無視
                if (e.touches.length > 1 || this.multiTouchDetected) {
                    clearTimeout(touchTimer);
                    return;
                }
                
                // 長押しによるiOSの拡大鏡などを防止
                e.preventDefault();
                
                // 既存のタイマーをクリア
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                hasMoved = false;
                
                // 長押し検出用タイマー
                touchTimer = setTimeout(() => {
                    if (!hasMoved && !this.gameOver && !this.revealed[row][col]) {
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (this.flagged[row][col] || this.questioned[row][col]) {
                            // 旗または?がある場合は消去
                            console.log('Playing flagRemove sound (long press)');
                            this.soundManager.playSound('flagRemove');
                            this.flagged[row][col] = false;
                            this.questioned[row][col] = false;
                            cell.classList.remove('flagged', 'questioned');
                            cell.textContent = '';
                            this.updateMineCount();
                        } else {
                            // 何もない場合は旗を立てる
                            console.log('Playing flagPlace sound (long press)');
                            this.soundManager.playSound('flagPlace');
                            this.flagged[row][col] = true;
                            cell.classList.add('flagged');
                            this.updateMineCount();
                            this.checkWin();
                        }
                        this.isLongPress = true;
                    }
                }, 133);
            }, { passive: false });
            
            // タッチ移動
            cell.addEventListener('touchmove', (e) => {
                // 2本指以上のタッチは無視
                if (e.touches.length > 1) {
                    hasMoved = true;
                    clearTimeout(touchTimer);
                    return;
                }
                
                const moveX = e.touches[0].clientX;
                const moveY = e.touches[0].clientY;
                const distance = Math.sqrt(
                    Math.pow(moveX - touchStartX, 2) + 
                    Math.pow(moveY - touchStartY, 2)
                );
                
                if (distance > dragThreshold) {
                    hasMoved = true;
                    clearTimeout(touchTimer);
                }
            }, { passive: true });
            
            // タッチ終了
            cell.addEventListener('touchend', (e) => {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                
                // 複数タッチが検出された場合は何もしない
                if (e.touches.length > 0) {
                    this.isLongPress = false;
                    return;
                }
                
                if (this.isLongPress) {
                    this.isLongPress = false;
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
                        // シングルタップの処理（リバースモード対応）
                        if (this.reverseMode) {
                            // リバースモード: タップで旗操作
                            if (this.flagged[row][col]) {
                                console.log('Playing flagRemove sound (single tap - reverse mode)');
                                this.soundManager.playSound('flagRemove');
                                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                                this.flagged[row][col] = false;
                                this.questioned[row][col] = true;
                                cell.classList.remove('flagged');
                                cell.classList.add('questioned');
                                cell.textContent = '?';
                                this.updateMineCount();
                            } else if (this.questioned[row][col]) {
                                console.log('Playing flagPlace sound (single tap - reverse mode)');
                                this.soundManager.playSound('flagPlace');
                                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                                this.questioned[row][col] = false;
                                this.flagged[row][col] = true;
                                cell.classList.remove('questioned');
                                cell.classList.add('flagged');
                                cell.textContent = '';
                                this.updateMineCount();
                                this.checkWin();
                            } else {
                                console.log('Playing flagPlace sound (single tap - reverse mode new flag)');
                                this.soundManager.playSound('flagPlace');
                                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                                this.flagged[row][col] = true;
                                cell.classList.add('flagged');
                                this.updateMineCount();
                                this.checkWin();
                            }
                        } else {
                            // 通常モード: タップでマス開け
                            if (!this.flagged[row][col] && !this.questioned[row][col]) {
                                console.log('Calling revealCell from touch end (normal mode)');
                                this.revealCell(row, col);
                            }
                        }
                        lastTapTime = currentTime;
                    }
                }
            }, { passive: true });
            
            // タッチキャンセル
            cell.addEventListener('touchcancel', () => {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                this.isLongPress = false;
                hasMoved = false;
            });
        }
        
        // PC向けマウスイベント（タッチデバイス以外、または併用時）
        // 左クリック
        cell.addEventListener('click', (e) => {
            if (this.gameOver) return;
            
            // ユーザー操作を記録（音響の自動再生ポリシー対応）
            this.soundManager.recordUserInteraction();
            
            // タッチデバイスの場合は既存のタッチイベントを優先
            if (this.isTouchDevice && e.pointerType !== 'mouse') return;
            
            if (!this.flagged[row][col] && !this.questioned[row][col]) {
                this.revealCell(row, col);
            }
        });
        
        // 右クリック
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // ユーザー操作を記録（音響の自動再生ポリシー対応）
            this.soundManager.recordUserInteraction();
            
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
    
    // コアライブラリのメソッドをオーバーライド
    onGameOver() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = 'リスタート';
        }
        
        // ゲームオーバーの効果音
        this.soundManager.playSound('gameOver');
        
        // ゲームオーバー時のみ地雷セルに赤い背景を適用
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1 && this.revealed[row][col]) {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        cell.classList.add('mine-exploded');
                    }
                }
            }
        }
    }
    
    onGameWon() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = 'リスタート';
        }
        
        // ゲームクリアの効果音
        this.soundManager.playSound('gameWon');
        
        // 勝利時に全ての地雷を表示（旗が立っていない場所のみ）
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1 && !this.flagged[row][col]) {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        cell.classList.add('revealed');
                        cell.classList.add('mine');
                        cell.classList.add('mine-won'); // 勝利時の地雷表示
                        cell.textContent = '💣';
                    }
                }
            }
        }
        this.showClearModal();
    }
    
    updateTimer() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = String(this.timer).padStart(3, '0');
        }
    }
    
    // コアのタイマー更新フックをオーバーライド
    onTimerUpdate(time) {
        this.timer = time;
        this.updateTimer();
    }
    
    // 以下、UI関連のメソッドを追加
    
    toggleFlag(row, col) {
        // 既に開いているマスには何もしない
        if (this.revealed[row][col]) return;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.flagged[row][col]) {
            // 旗を外す効果音
            console.log('Playing flagRemove sound');
            this.soundManager.playSound('flagRemove');
            
            this.flagged[row][col] = false;
            this.questioned[row][col] = true;
            cell.classList.remove('flagged');
            cell.classList.add('questioned');
            cell.textContent = '?';
            this.updateMineCount();
        } else if (this.questioned[row][col]) {
            // ?を外す効果音
            console.log('Playing flagRemove sound (question)');
            this.soundManager.playSound('flagRemove');
            
            this.questioned[row][col] = false;
            cell.classList.remove('questioned');
            cell.textContent = '';
        } else {
            // 旗を立てる効果音
            console.log('Playing flagPlace sound');
            this.soundManager.playSound('flagPlace');
            
            this.flagged[row][col] = true;
            cell.classList.add('flagged');
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
            // コード開示時は連鎖フラグを有効にして音の重複を防ぐ
            this.isChainReveal = true;
            this.revealCount = 0;
            
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
            
            // コード開示完了後にフラグとカウントをリセット
            setTimeout(() => {
                this.isChainReveal = false;
                this.revealCount = 0;
            }, 100);
        }
    }
    
    updateMineCount() {
        let flaggedCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.flagged[row][col]) flaggedCount++;
            }
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
                // 既に地雷が表示されている場合は更新しない
                if (!cell.textContent || cell.textContent !== '💣') {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                    // ゲームオーバー時のみ赤い背景を適用
                    if (this.gameOver) {
                        cell.classList.add('mine-exploded');
                    }
                }
            } else if (this.board[row][col] > 0) {
                cell.textContent = this.board[row][col];
                cell.setAttribute('data-count', this.board[row][col]);
                cell.classList.add(`number-${this.board[row][col]}`);
            }
        }
    }
    
    // ズーム機能
    zoomIn() {
        // アニメーション中またはクールダウン中は無視
        if (this.zoomTransitioning || this.buttonCooldown) return;
        
        if (this.zoomLevel < this.maxZoom) {
            // デバウンス処理
            if (this.zoomDebounceTimer) {
                clearTimeout(this.zoomDebounceTimer);
            }
            
            this.zoomDebounceTimer = setTimeout(() => {
                this.setButtonCooldown();
                this.zoomTransitioning = true;
                this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
                this.updateZoom();
                
                // トランジション完了後にフラグをリセット
                setTimeout(() => {
                    this.zoomTransitioning = false;
                }, 200); // CSSトランジション時間に合わせる
            }, 50); // 50ms のデバウンス
        }
    }
    
    zoomOut() {
        // アニメーション中またはクールダウン中は無視
        if (this.zoomTransitioning || this.buttonCooldown) return;
        
        if (this.zoomLevel > this.minZoom) {
            // デバウンス処理
            if (this.zoomDebounceTimer) {
                clearTimeout(this.zoomDebounceTimer);
            }
            
            this.zoomDebounceTimer = setTimeout(() => {
                this.setButtonCooldown();
                this.zoomTransitioning = true;
                this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
                this.updateZoom();
                
                // トランジション完了後にフラグをリセット
                setTimeout(() => {
                    this.zoomTransitioning = false;
                }, 200); // CSSトランジション時間に合わせる
            }, 50); // 50ms のデバウンス
        }
    }
    
    setButtonCooldown() {
        this.buttonCooldown = true;
        setTimeout(() => {
            this.buttonCooldown = false;
        }, this.buttonCooldownTime);
    }
    
    updateZoom() {
        const boardElement = document.getElementById('game-board');
        if (boardElement) {
            // GPUアクセラレーションのヒントを追加
            boardElement.style.willChange = 'transform';
            boardElement.style.transform = `scale(${this.zoomLevel})`;
            boardElement.style.transformOrigin = 'top left';
            
            // アニメーション完了後にwill-changeを削除（パフォーマンス最適化）
            setTimeout(() => {
                if (!this.zoomTransitioning) {
                    boardElement.style.willChange = 'auto';
                }
            }, 300);
        }
    }
    
    // フォントサイズ機能
    increaseFontSize() {
        if (this.buttonCooldown) return;
        
        if (this.currentFontSize < this.maxFontSize) {
            this.setButtonCooldown();
            this.currentFontSize = Math.min(this.currentFontSize + this.fontSizeStep, this.maxFontSize);
            this.updateFontSize();
            this.saveFontSizeSetting();
        }
    }
    
    decreaseFontSize() {
        if (this.buttonCooldown) return;
        
        if (this.currentFontSize > this.minFontSize) {
            this.setButtonCooldown();
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
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            const icon = themeBtn.querySelector('.theme-icon');
            const text = themeBtn.querySelector('.theme-text');
            if (newTheme === 'dark') {
                // Moon icon
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
                text.textContent = 'ダークモード';
            } else {
                // Sun icon  
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
                text.textContent = 'ライトモード';
            }
        }
        
        localStorage.setItem('minesweeper-theme', newTheme);
    }
    
    loadThemeSetting() {
        const theme = localStorage.getItem('minesweeper-theme') || 'dark';
        document.body.setAttribute('data-theme', theme);
        
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            const icon = themeBtn.querySelector('.theme-icon');
            const text = themeBtn.querySelector('.theme-text');
            if (theme === 'dark') {
                // Moon icon
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
                text.textContent = 'ダークモード';
            } else {
                // Sun icon
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
                text.textContent = 'ライトモード';
            }
        }
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
    
    // 音響設定関連のメソッド
    toggleSound() {
        this.soundManager.recordUserInteraction();
        this.soundManager.toggle();
        this.updateSoundUI();
        this.soundManager.saveSettings();
    }
    
    updateSoundUI() {
        const btn = document.getElementById('sound-toggle-btn');
        if (btn) {
            const icon = btn.querySelector('.sound-icon');
            const text = btn.querySelector('.sound-text');
            if (this.soundManager.isEnabled()) {
                // 音有効時のアイコン
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10H4a2 2 0 00-2 2v0a2 2 0 002 2h2l4 4V6l-4 4z"></path>';
                text.textContent = 'ON';
            } else {
                // 音無効時のアイコン
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15.414a2 2 0 001.414.586h1.414L12 19.414 12 4.586 8.414 8H7a2 2 0 00-2 2v1.414zm0 0L8 17l-2-2zM14 12a5 5 0 000 0zm0 0a5 5 0 000 0zm2.5-5a9 9 0 000 10"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 12L20 8M20 16l-4-4"></path>';
                text.textContent = 'OFF';
            }
        }
    }
    
    increaseVolume() {
        this.soundManager.recordUserInteraction();
        const currentVolume = this.soundManager.getVolume();
        const newVolume = Math.min(1.0, currentVolume + 0.1);
        this.soundManager.setVolume(newVolume);
        this.updateVolumeUI();
        this.soundManager.saveSettings();
        
        // ボリューム変更の確認音
        this.soundManager.playSound('cellClick');
    }
    
    decreaseVolume() {
        this.soundManager.recordUserInteraction();
        const currentVolume = this.soundManager.getVolume();
        const newVolume = Math.max(0.0, currentVolume - 0.1);
        this.soundManager.setVolume(newVolume);
        this.updateVolumeUI();
        this.soundManager.saveSettings();
        
        // ボリューム変更の確認音
        if (newVolume > 0) {
            this.soundManager.playSound('cellClick');
        }
    }
    
    updateVolumeUI() {
        const display = document.getElementById('volume-display');
        if (display) {
            const volume = Math.round(this.soundManager.getVolume() * 100);
            display.textContent = `${volume}%`;
        }
    }
    
    loadSoundSettings() {
        this.soundManager.loadSettings();
        this.updateSoundUI();
        this.updateVolumeUI();
    }
    
    // モーダル関連
    openSettings() {
        // 設定画面を開く前に音響UI状態を更新
        this.updateSoundUI();
        this.updateVolumeUI();
        
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('show');
            // 背景のスクロールを無効化
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        }
    }
    
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
            // 背景のスクロールを復活
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
    }
    
    openHelp() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.add('show');
            
            // モバイル版なので常にモバイル向けの説明を表示
            const mobileHelp = document.getElementById('mobile-help');
            const pcHelp = document.getElementById('pc-help');
            
            if (mobileHelp) mobileHelp.style.display = 'block';
            if (pcHelp) pcHelp.style.display = 'none';
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
            const minutes = Math.floor(this.timer / 60);
            const seconds = this.timer % 60;
            const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
            message.textContent = `クリアタイム: ${timeText}`;
        }
        
        const nextBtn = document.getElementById('next-difficulty-btn');
        const replayBtn = document.getElementById('replay-difficulty-btn');
        
        // 次の難易度を決定
        const difficultyOrder = ['easy', 'medium', 'hard', 'hiddeneasy', 'hiddenmedium', 'hiddenhard', 'extreme'];
        const currentIndex = difficultyOrder.indexOf(this.currentDifficulty);
        
        if (currentIndex !== -1 && currentIndex < difficultyOrder.length - 1) {
            // 次の難易度がある場合
            const nextDifficulty = difficultyOrder[currentIndex + 1];
            const difficultyNames = {
                'easy': '初級',
                'medium': '中級',
                'hard': '上級',
                'hiddeneasy': '裏初級',
                'hiddenmedium': '裏中級',
                'hiddenhard': '裏上級',
                'extreme': '極悪'
            };
            
            if (nextBtn) {
                nextBtn.style.display = 'block';
                nextBtn.innerHTML = `次の難易度へ<br>(${difficultyNames[nextDifficulty]})`;
                // タッチデバイス用とマウス用のイベントハンドラ
                const nextHandler = () => {
                    this.currentDifficulty = nextDifficulty;
                    const select = document.getElementById('difficulty-select');
                    if (select) {
                        select.value = nextDifficulty;
                    }
                    this.newGame();
                    modal.classList.remove('show');
                };
                
                if (this.isTouchDevice) {
                    nextBtn.ontouchstart = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        nextHandler();
                    };
                } else {
                    nextBtn.onclick = nextHandler;
                }
            }
        } else {
            // 最高難易度の場合
            if (nextBtn) {
                nextBtn.style.display = 'none';
            }
        }
        
        if (replayBtn) {
            const replayHandler = () => {
                modal.classList.remove('show');
                this.newGame();
            };
            
            if (this.isTouchDevice) {
                replayBtn.ontouchstart = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    replayHandler();
                };
            } else {
                replayBtn.onclick = replayHandler;
            }
        }
        
        modal.classList.add('show');
    }
    
    // コアのinitVisibilityHandlersをオーバーライドして、モバイル固有の処理を追加
    initVisibilityHandlers() {
        super.initVisibilityHandlers();
        
        // モバイル固有の処理を追加
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // 長押しタイマーをクリア
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }
                    this.isLongPress = false;
                    this.isDragging = false;
                    this.multiTouchDetected = false;
                } else {
                    // タッチ状態をリセット
                    this.isLongPress = false;
                    this.isDragging = false;
                    this.multiTouchDetected = false;
                    this.touchCount = 0;
                }
            });
            
            // iOSのページ復帰時の問題対策
            window.addEventListener('pageshow', (event) => {
                if (event.persisted) {
                    // bfcacheから復元された場合
                    this.isLongPress = false;
                    this.isDragging = false;
                    this.multiTouchDetected = false;
                    this.touchCount = 0;
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }
                }
            });
        }
    }
    
    // コアのrevealCellメソッドをオーバーライドして、UI更新を追加
    revealCell(row, col) {
        // 既に開示済みなら何もしない
        if (this.revealed[row][col]) {
            return;
        }
        
        const wasRevealed = this.revealed[row][col];
        
        super.revealCell(row, col);
        this.updateCell(row, col);
        
        // セルクリックの効果音制御
        if (!this.gameOver && this.board[row][col] !== -1 && !wasRevealed) {
            if (this.isChainReveal) {
                // 連鎖開示中は最初の1回のみ音を再生
                this.revealCount++;
                if (this.revealCount === 1) {
                    console.log('Playing cellClick sound (chain reveal)');
                    this.soundManager.playSound('cellClick');
                }
            } else {
                // 通常のクリックは即座に再生
                console.log('Playing cellClick sound (normal click)');
                this.soundManager.playSound('cellClick');
            }
        }
        
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
    
    // コアのrevealAdjacentCellsメソッドをオーバーライドして連鎖フラグを制御
    revealAdjacentCells(row, col) {
        this.isChainReveal = true;
        this.revealCount = 0;
        
        super.revealAdjacentCells(row, col);
        
        // 連鎖開示完了後にフラグとカウントをリセット
        setTimeout(() => {
            this.isChainReveal = false;
            this.revealCount = 0;
        }, 100);
    }
    
    // コアのrevealAllMinesメソッドをオーバーライドして、UI更新を追加
    revealAllMines() {
        super.revealAllMines();
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!cell) continue;
                
                if (this.board[row][col] === -1) {
                    if (this.flagged[row][col]) {
                        // 正しく旗が立てられていた地雷は◯で表示
                        cell.classList.add('revealed');
                        cell.classList.add('flagged');
                        cell.textContent = '○';
                        cell.style.color = '#00ff00'; // 緑色
                    } else {
                        // 旗が立てられていない地雷は爆弾を表示
                        this.updateCell(row, col);
                    }
                } else if (this.flagged[row][col]) {
                    // 地雷でない場所に旗が立っていた場合は×印を表示
                    cell.classList.add('revealed');
                    cell.classList.add('wrong-flag');
                    cell.textContent = '❌';
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
    game.loadSoundSettings();
});