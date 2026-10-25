/**
 * Web Audio API Buzzer synthesizer for the clip-on smart cane module.
 * Provides distinct acoustic feedback corresponding to the tactile vibration patterns.
 */

class SmartCaneAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.4;
  private lastOverheadBeepTime: number = 0;
  private lastDropoffBeepTime: number = 0;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initContext();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Overhead hazard: High-frequency staccato chirp (880 Hz).
   * Pulse rate scales with proximity (faster when closer).
   */
  public triggerOverheadBeep(distanceM: number) {
    if (this.isMuted || !this.volume) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Minimum period between beeps: closer = faster (down to 120ms)
    const minInterval = Math.max(0.12, Math.min(0.6, distanceM * 0.22));

    if (now - this.lastOverheadBeepTime < minInterval) {
      return;
    }
    this.lastOverheadBeepTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle'; // Crisp, pleasant alert tone
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1046, now + 0.06); // quick chirp up to C6

      // Envelope
      const peakVol = this.volume * 0.28;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(peakVol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // AudioContext failed silently
    }
  }

  /**
   * Drop-off hazard: Low-frequency urgent dual thump/buzz (350 Hz & 260 Hz).
   */
  public triggerDropoffBeep() {
    if (this.isMuted || !this.volume) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const minInterval = 0.45; // Double-thump pattern period

    if (now - this.lastDropoffBeepTime < minInterval) {
      return;
    }
    this.lastDropoffBeepTime = now;

    try {
      // First thump
      this.playThump(now, 380, 0.08);
      // Second thump 140ms later
      this.playThump(now + 0.14, 300, 0.09);
    } catch {
      // AudioContext failed silently
    }
  }

  private playThump(startTime: number, freq: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + duration);

    const peakVol = this.volume * 0.35;
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakVol, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }
}

export const caneAudio = new SmartCaneAudio();
