import type { Rarity } from '../../shared/types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public volume = 0.42;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainVal = 0.25,
    delay = 0
  ) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal * this.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, gainVal = 0.18, highpass = 600, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.45));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  public playSlash() {
    this.playNoise(0.11, 0.28, 1200);
    this.playTone(320, 110, 0.12, 'sawtooth', 0.18);
  }

  public playMagic() {
    this.playTone(540, 260, 0.16, 'sine', 0.22);
    this.playTone(810, 1220, 0.14, 'triangle', 0.14, 0.02);
  }

  public playArrow() {
    this.playNoise(0.08, 0.2, 2400);
    this.playTone(900, 420, 0.09, 'triangle', 0.18);
  }

  public playHeal() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this.playTone(n, n * 1.02, 0.26, 'sine', 0.18, i * 0.055));
  }

  public playShield() {
    this.playTone(340, 680, 0.22, 'triangle', 0.22);
    this.playTone(510, 1020, 0.28, 'sine', 0.18, 0.05);
  }

  public playCrit() {
    this.playTone(160, 45, 0.16, 'sawtooth', 0.34);
    this.playTone(880, 1320, 0.14, 'square', 0.14, 0.02);
    this.playNoise(0.12, 0.32, 900);
  }

  public playMeteorImpact() {
    this.playTone(130, 32, 0.38, 'sawtooth', 0.4);
    this.playNoise(0.32, 0.36, 220);
  }

  public playLootDrop(rarity: Rarity) {
    switch (rarity) {
      case 'zwykly':
        this.playTone(440, 460, 0.12, 'sine', 0.14);
        break;
      case 'normalny':
        this.playTone(523, 659, 0.18, 'triangle', 0.18);
        break;
      case 'mityczny':
        this.playTone(587, 587, 0.22, 'triangle', 0.22, 0);
        this.playTone(880, 890, 0.3, 'sine', 0.22, 0.08);
        break;
      case 'legendarny':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) =>
          this.playTone(f, f * 1.01, 0.38, 'triangle', 0.24, idx * 0.07)
        );
        break;
      case 'boski':
        // Majestic celestial cosmic chord!
        [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) =>
          this.playTone(f, f * 1.015, 0.95, idx % 2 === 0 ? 'triangle' : 'sine', 0.25, idx * 0.065)
        );
        this.playTone(110, 55, 0.6, 'sawtooth', 0.22, 0.02);
        break;
      case 'niesmiertelny':
        // Transcendent Immortal fanfare!
        [293.66, 440.0, 587.33, 739.99, 880.0, 1174.66, 1479.98, 1760.0].forEach((f, idx) =>
          this.playTone(f, f * 1.02, 1.15, idx % 2 === 0 ? 'triangle' : 'sine', 0.27, idx * 0.055)
        );
        this.playTone(146.83, 73.42, 0.75, 'sawtooth', 0.24, 0.02);
        break;
    }
  }

  public playAnvilTension(targetLevel: number) {
    const base = 220 + targetLevel * 28;
    const steps = targetLevel >= 7 ? 4 : 2;
    for (let i = 0; i < steps; i++) {
      this.playTone(base + i * 55, base + (i + 1) * 65, 0.13, 'triangle', 0.16, i * 0.12);
    }
  }

  public playAnvilStrike(newLevel: number) {
    // Crisp metallic blacksmith clang!
    this.playNoise(0.16, 0.34, 1800);
    this.playTone(1180, 820, 0.35, 'square', 0.2);
    this.playTone(2150, 1740, 0.42, 'sine', 0.24);
    this.playTone(210, 75, 0.2, 'sawtooth', 0.28);
    if (newLevel >= 7) {
      // Magical glow ignition chime for +7..+13!
      [659.25, 880, 1174.66, 1567.98].forEach((f, i) =>
        this.playTone(f, f * 1.03, 0.45, 'sine', 0.2, 0.12 + i * 0.06)
      );
    }
  }

  public playPuzzleTick() {
    this.playTone(620, 740, 0.1, 'triangle', 0.2);
  }

  public playPuzzleFail() {
    this.playTone(230, 145, 0.24, 'sawtooth', 0.22);
    this.playTone(170, 110, 0.28, 'triangle', 0.2, 0.08);
  }

  public playPuzzleSolve() {
    [440, 554.37, 659.25, 880].forEach((f, i) =>
      this.playTone(f, f, 0.28, 'triangle', 0.22, i * 0.08)
    );
  }

  public playSecretOpen() {
    this.playTone(140, 70, 0.35, 'sawtooth', 0.28);
    this.playNoise(0.28, 0.28, 400);
    [523, 659, 987].forEach((f, i) => this.playTone(f, f, 0.28, 'sine', 0.18, 0.15 + i * 0.08));
  }

  public playLevelUp() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this.playTone(f, f * 1.01, 0.36, 'triangle', 0.24, i * 0.075)
    );
  }

  public playRuneUpgrade() {
    [330, 440, 659, 880, 1318].forEach((f, i) =>
      this.playTone(f, f * 1.02, 0.42, 'sine', 0.22, i * 0.07)
    );
  }

  public playBossRoar() {
    this.playTone(135, 48, 0.65, 'sawtooth', 0.32);
    this.playTone(95, 38, 0.72, 'square', 0.22, 0.05);
    this.playNoise(0.45, 0.25, 180, 0.04);
  }

  public playPerfectDodge() {
    this.playTone(620, 1240, 0.16, 'sine', 0.22);
    this.playTone(930, 1560, 0.22, 'triangle', 0.2, 0.05);
  }

  public playGoblinLaugh() {
    [740, 880, 698, 987, 830, 1108].forEach((f, i) =>
      this.playTone(f, f * 1.06, 0.085, 'triangle', 0.22, i * 0.065)
    );
  }
}

export const soundEngine = new SoundEngine();
