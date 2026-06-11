class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  private playTone(
    freqs: number[],
    durations: number[],
    type: OscillatorType = "sine",
    volume: number = 0.1
  ) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      let startTime = now;

      freqs.forEach((freq, index) => {
        if (!this.ctx) return;
        const duration = durations[index] || 0.1;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // Exponential decay for clean sound
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);

        startTime += duration * 0.8; // Slide or sequence them slightly overlapping
      });
    } catch (e) {
      console.warn("Audio Context failed to play sound", e);
    }
  }

  public playMove() {
    this.playTone([160], [0.06], "square", 0.08);
  }

  public playRotate() {
    this.playTone([240, 320], [0.04, 0.04], "sine", 0.08);
  }

  public playHold() {
    this.playTone([180, 270, 360], [0.05, 0.05, 0.05], "sawtooth", 0.05);
  }

  public playLand() {
    this.playTone([100], [0.1], "triangle", 0.15);
  }

  public playLineClear() {
    this.playTone([523.25, 659.25, 783.99], [0.1, 0.1, 0.15], "triangle", 0.12);
  }

  public playTetris() {
    this.playTone(
      [523.25, 659.25, 783.99, 1046.50],
      [0.08, 0.08, 0.08, 0.3],
      "square",
      0.1
    );
  }

  public playLevelUp() {
    this.playTone([440, 554, 659, 880], [0.06, 0.06, 0.06, 0.25], "sine", 0.12);
  }

  public playStart() {
    // Upbeat intro scales
    this.playTone([261.63, 329.63, 392.00, 523.25, 659.25], [0.07, 0.07, 0.07, 0.07, 0.2], "square", 0.08);
  }

  public playGameOver() {
    this.playTone([392.00, 349.23, 311.13, 261.63], [0.15, 0.15, 0.15, 0.4], "sawtooth", 0.08);
  }
}

export const sound = new SoundManager();
