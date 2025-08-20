// SoundManager: スマートフォン向け音響管理システム
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.masterVolume = 0.3; // マスターボリューム (0-1)
        this.enabled = true; // 音響のON/OFF
        this.initialized = false; // 初期化フラグ
        this.userInteracted = false; // ユーザー操作フラグ
        
        this.initializeSounds();
    }
    
    // AudioContextを初期化（ユーザー操作後に呼び出し）
    async initializeAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // スマートフォンでの自動再生ポリシー対応
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                this.initialized = true;
                console.log('AudioContext initialized successfully');
                return true;
            } catch (error) {
                console.warn('AudioContext initialization failed:', error);
                return false;
            }
        }
        return true;
    }
    
    // 音響定義を初期化
    initializeSounds() {
        // 各効果音の定義（Web Audio APIで合成）
        this.sounds = {
            cellClick: {
                type: 'beep',
                frequency: 800,
                duration: 0.1,
                volume: 0.5
            },
            flagPlace: {
                type: 'chord',
                frequencies: [660, 880, 1320], // E5, A5, E6
                duration: 0.15,
                volume: 0.6
            },
            flagRemove: {
                type: 'chord',
                frequencies: [1320, 880, 660], // 逆順
                duration: 0.1,
                volume: 0.4
            },
            gameWon: {
                type: 'melody',
                notes: [
                    { frequency: 523, duration: 0.2 }, // C5
                    { frequency: 659, duration: 0.2 }, // E5
                    { frequency: 784, duration: 0.2 }, // G5
                    { frequency: 1047, duration: 0.4 } // C6
                ],
                volume: 0.8
            },
            gameOver: {
                type: 'descending',
                startFreq: 440,
                endFreq: 220,
                duration: 0.8,
                volume: 0.7
            },
            newGame: {
                type: 'ascending',
                startFreq: 330,
                endFreq: 660,
                duration: 0.3,
                volume: 0.5
            }
        };
    }
    
    // ユーザー操作を記録（自動再生ポリシー対応）
    recordUserInteraction() {
        if (!this.userInteracted) {
            this.userInteracted = true;
            this.initializeAudioContext();
        }
    }
    
    // 効果音を再生
    async playSound(soundName) {
        if (!this.enabled || !this.sounds[soundName]) {
            return;
        }
        
        // AudioContextが初期化されていない場合は初期化
        if (!this.initialized) {
            const success = await this.initializeAudioContext();
            if (!success) return;
        }
        
        try {
            const soundConfig = this.sounds[soundName];
            
            switch (soundConfig.type) {
                case 'beep':
                    this.playBeep(soundConfig);
                    break;
                case 'chord':
                    this.playChord(soundConfig);
                    break;
                case 'melody':
                    this.playMelody(soundConfig);
                    break;
                case 'ascending':
                case 'descending':
                    this.playGlide(soundConfig);
                    break;
            }
        } catch (error) {
            console.warn(`Sound playback failed for ${soundName}:`, error);
        }
    }
    
    // 単音ビープ音を再生
    playBeep(config) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        const volume = config.volume * this.masterVolume;
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }
    
    // 和音を再生
    playChord(config) {
        config.frequencies.forEach((frequency, index) => {
            setTimeout(() => {
                this.playBeep({
                    frequency: frequency,
                    duration: config.duration,
                    volume: config.volume * (1 - index * 0.1) // 後続音を少し小さく
                });
            }, index * 20); // 20ms間隔でずらして再生
        });
    }
    
    // メロディーを再生
    playMelody(config) {
        let currentTime = 0;
        config.notes.forEach(note => {
            setTimeout(() => {
                this.playBeep({
                    frequency: note.frequency,
                    duration: note.duration,
                    volume: config.volume
                });
            }, currentTime * 1000);
            currentTime += note.duration;
        });
    }
    
    // グライド音（周波数変化）を再生
    playGlide(config) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        
        const startTime = this.audioContext.currentTime;
        const endTime = startTime + config.duration;
        
        oscillator.frequency.setValueAtTime(config.startFreq, startTime);
        oscillator.frequency.linearRampToValueAtTime(config.endFreq, endTime);
        
        const volume = config.volume * this.masterVolume;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime - 0.05);
        
        oscillator.start(startTime);
        oscillator.stop(endTime);
    }
    
    // 音響のON/OFF切り替え
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    // 音響を有効にする
    enable() {
        this.enabled = true;
    }
    
    // 音響を無効にする
    disable() {
        this.enabled = false;
    }
    
    // 有効状態を取得
    isEnabled() {
        return this.enabled;
    }
    
    // マスターボリュームを設定
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    // マスターボリュームを取得
    getVolume() {
        return this.masterVolume;
    }
    
    // 設定をローカルストレージに保存
    saveSettings() {
        localStorage.setItem('minesweeper-sound-enabled', this.enabled);
        localStorage.setItem('minesweeper-sound-volume', this.masterVolume);
    }
    
    // 設定をローカルストレージから読み込み
    loadSettings() {
        const savedEnabled = localStorage.getItem('minesweeper-sound-enabled');
        if (savedEnabled !== null) {
            this.enabled = savedEnabled === 'true';
        }
        
        const savedVolume = localStorage.getItem('minesweeper-sound-volume');
        if (savedVolume !== null) {
            this.masterVolume = parseFloat(savedVolume);
        }
    }
    
    // AudioContextのクリーンアップ
    cleanup() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.initialized = false;
    }
}