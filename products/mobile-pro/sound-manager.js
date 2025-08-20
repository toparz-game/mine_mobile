// SoundManager: スマートフォン向け音響管理システム
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.audioElements = new Map(); // HTMLAudioElementのキャッシュ
        this.masterVolume = 1.0; // マスターボリューム (0-1)
        this.enabled = true; // 音響のON/OFF
        this.initialized = false; // 初期化フラグ
        this.userInteracted = false; // ユーザー操作フラグ
        this.soundQueue = new Map(); // 音の重複防止用キュー
        this.debounceTimers = new Map(); // デバウンス用タイマー
        this.lastPlayTime = new Map(); // 最後に再生した時刻を記録
        this.minInterval = 50; // 最小再生間隔（ミリ秒）
        
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
                type: 'audio_file',
                file: 'sounds/suiteki.mp3',
                duration: null, // 元の音の長さをそのまま使用
                fadeOut: 0, // フェードアウトなし
                volume: 1.0 // 音量を最大に
            },
            flagPlace: {
                type: 'audio_file',
                file: 'sounds/hata.mp3',
                duration: null, // 元の音の長さをそのまま使用
                fadeOut: 0, // フェードアウトなし
                volume: 1.0 // 音量を最大に
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
    
    // 効果音を再生（重複防止機能付き）
    async playSound(soundName, options = {}) {
        console.log(`[SoundManager] playSound called: ${soundName}, enabled: ${this.enabled}, soundExists: ${!!this.sounds[soundName]}`);
        
        if (!this.enabled || !this.sounds[soundName]) {
            console.log(`[SoundManager] Skipping sound: ${soundName} (enabled: ${this.enabled}, exists: ${!!this.sounds[soundName]})`);
            return;
        }
        
        const debounceMs = options.debounce || 0;
        const forcePlay = options.force || false;
        
        // 最小間隔チェック（強制再生でない場合のみ）
        if (!forcePlay) {
            const now = Date.now();
            const lastTime = this.lastPlayTime.get(soundName) || 0;
            if (now - lastTime < this.minInterval) {
                return;
            }
            this.lastPlayTime.set(soundName, now);
        }
        
        // デバウンス処理
        if (debounceMs > 0) {
            if (this.debounceTimers.has(soundName)) {
                clearTimeout(this.debounceTimers.get(soundName));
            }
            
            this.debounceTimers.set(soundName, setTimeout(() => {
                this.playSound(soundName, { force: true });
                this.debounceTimers.delete(soundName);
            }, debounceMs));
            return;
        }
        
        // AudioContextが初期化されていない場合は初期化
        if (!this.initialized) {
            const success = await this.initializeAudioContext();
            if (!success) return;
        }
        
        try {
            const soundConfig = this.sounds[soundName];
            console.log(`[SoundManager] Playing sound: ${soundName}, type: ${soundConfig.type}, file: ${soundConfig.file || 'none'}`);
            
            switch (soundConfig.type) {
                case 'beep':
                    this.playBeep(soundConfig);
                    break;
                case 'satisfying_click':
                    this.playSatisfyingClick(soundConfig);
                    break;
                case 'audio_file':
                    this.playAudioFile(soundConfig);
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
    
    // 連続した同じ音の再生を制御
    async playDebouncedSound(soundName, debounceMs = 100) {
        return this.playSound(soundName, { debounce: debounceMs });
    }
    
    // 音の重複を完全に停止（緊急停止用）
    stopAllSounds() {
        // 全てのデバウンスタイマーをクリア
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        
        // 最後の再生時刻をリセット
        this.lastPlayTime.clear();
    }
    
    // HTMLAudioElementを取得またはキャッシュ（複数インスタンス対応）
    getAudioElement(filePath) {
        // 再生中でない音声要素を探す
        if (this.audioElements.has(filePath)) {
            const audioList = this.audioElements.get(filePath);
            for (const audio of audioList) {
                if (audio.paused || audio.ended) {
                    return audio;
                }
            }
            
            // 全て再生中の場合、新しいインスタンスを作成
            const newAudio = new Audio(filePath);
            newAudio.preload = 'auto';
            newAudio.volume = 0;
            audioList.push(newAudio);
            return newAudio;
        }
        
        // 初回の場合
        const audio = new Audio(filePath);
        audio.preload = 'auto';
        audio.volume = 0;
        this.audioElements.set(filePath, [audio]);
        return audio;
    }
    
    // 音声ファイルを再生（加工オプション付き）
    playAudioFile(config) {
        try {
            console.log(`[SoundManager] Loading audio file: ${config.file}`);
            const audio = this.getAudioElement(config.file);
            
            // 音を中断せず、常に最初から再生
            audio.currentTime = 0;
            
            const volume = config.volume * this.masterVolume;
            console.log(`[SoundManager] Setting volume: ${volume}, file: ${config.file}`);
            
            // 音量設定
            audio.volume = volume;
            
            // 再生開始
            console.log(`[SoundManager] Starting playback: ${config.file}`);
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Audio play failed:', error);
                });
            }
            
            // 加工が指定されている場合のみ処理
            if (config.duration !== null && config.duration !== undefined) {
                const duration = config.duration;
                const fadeOutTime = config.fadeOut || 0;
                
                if (fadeOutTime > 0) {
                    // フェードアウト処理
                    setTimeout(() => {
                        const fadeSteps = 10;
                        const fadeInterval = (fadeOutTime * 1000) / fadeSteps;
                        let currentStep = 0;
                        
                        const fadeTimer = setInterval(() => {
                            currentStep++;
                            audio.volume = volume * (1 - currentStep / fadeSteps);
                            
                            if (currentStep >= fadeSteps) {
                                clearInterval(fadeTimer);
                                audio.pause();
                                audio.currentTime = 0;
                                audio.volume = volume;
                            }
                        }, fadeInterval);
                        
                    }, Math.max(0, (duration - fadeOutTime) * 1000));
                } else {
                    // フェードなしで停止
                    setTimeout(() => {
                        audio.pause();
                        audio.currentTime = 0;
                    }, duration * 1000);
                }
            }
            // config.duration が null の場合は自然に最後まで再生
            
        } catch (error) {
            console.warn(`Failed to play audio file: ${config.file}`, error);
        }
    }
    
    // 爽快感のあるクリック音を再生（倍音とADSRエンベロープ付き）
    playSatisfyingClick(config) {
        const startTime = this.audioContext.currentTime;
        const volume = config.volume * this.masterVolume;
        
        // 複数の倍音を重ねて豊かな音色を作る
        config.harmonics.forEach((harmonic, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 倍音の周波数を設定
            const frequency = config.fundamentalFreq * harmonic;
            oscillator.frequency.setValueAtTime(frequency, startTime);
            
            // 倍音ごとに異なる波形を使用（音色の複雑さ）
            const waveTypes = ['sine', 'triangle', 'sawtooth', 'square'];
            oscillator.type = waveTypes[index % waveTypes.length];
            
            // 高次倍音ほど音量を下げる（自然な音色）
            const harmonicVolume = volume / (harmonic * 1.5);
            
            // ADSR エンベロープを適用
            const attackTime = startTime + config.attack;
            const decayTime = attackTime + config.decay;
            const releaseTime = decayTime + config.release;
            
            gainNode.gain.setValueAtTime(0, startTime);
            // Attack: 急激に音量上昇（爽快感）
            gainNode.gain.linearRampToValueAtTime(harmonicVolume, attackTime);
            // Decay: 素早く減衰
            gainNode.gain.exponentialRampToValueAtTime(harmonicVolume * config.sustain, decayTime);
            // Release: 素早く無音へ（しつこくない）
            gainNode.gain.exponentialRampToValueAtTime(0.001, releaseTime);
            
            oscillator.start(startTime);
            oscillator.stop(releaseTime);
        });
        
        // 高周波のアタック音を追加（シューティングゲーム的な鋭さ）
        const attackOsc = this.audioContext.createOscillator();
        const attackGain = this.audioContext.createGain();
        
        attackOsc.connect(attackGain);
        attackGain.connect(this.audioContext.destination);
        
        // 高周波でノイズ的なアタック音
        attackOsc.frequency.setValueAtTime(config.fundamentalFreq * 8, startTime);
        attackOsc.type = 'sawtooth';
        
        const attackVolume = volume * 0.3;
        attackGain.gain.setValueAtTime(attackVolume, startTime);
        attackGain.gain.exponentialRampToValueAtTime(0.001, startTime + config.attack * 2);
        
        attackOsc.start(startTime);
        attackOsc.stop(startTime + config.attack * 3);
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