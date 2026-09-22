/**
 * Lapis 5: Web Audio API Countdown & Beep Synthesizer (PRD §9.3)
 * Precise scheduling via AudioContext.currentTime.
 * Unlocks AudioContext on user gesture ("Ready" tap).
 * Includes vibration fallback for muted/silent devices.
 */

export class AudioCountdownSynthesizer {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    // Lazy initialized on first user gesture
  }

  /**
   * Unlock audio context during user interaction ("Ready" click)
   */
  public async unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Play silent short buffer to ensure iOS audio session is live
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);

      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Play single tick beep (3, 2, 1 countdown)
   * Pitch: 440 Hz (A4), short 80ms sine burst
   */
  public playTick(): void {
    this.playTone(440, 0.08, 'sine');
    this.triggerVibrate(50);
  }

  /**
   * Play capture shutter sound at T=0
   * Pitch: 880 Hz (A5), followed by shutter click
   */
  public playShutter(): void {
    this.playTone(880, 0.14, 'triangle');
    this.triggerVibrate([80, 40, 80]);
  }

  private playTone(freq: number, durationSec: number, type: OscillatorType = 'sine'): void {
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + durationSec);
    } catch {}
  }

  private triggerVibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }
}
