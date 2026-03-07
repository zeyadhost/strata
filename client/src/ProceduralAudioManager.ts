import type { GameSettings } from "./settings";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class ProceduralAudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceStarted = false;
  private ambienceOscillators: OscillatorNode[] = [];
  private ambiencePanners: StereoPannerNode[] = [];
  private settings: GameSettings;

  constructor(initialSettings: GameSettings) {
    this.settings = { ...initialSettings };
  }

  setSettings(settings: GameSettings) {
    this.settings = { ...settings };
    this.syncMix();
  }

  async unlock() {
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }
    this.ensureAmbience();
    this.syncMix();
  }

  playDig(sourceX: number, listenerX: number) {
    if (!this.canPlaySfx()) return;

    const context = this.ensureContext();
    if (context.state !== "running") return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(280, now);
    oscillator.frequency.exponentialRampToValueAtTime(110, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this.getSfxLevel(0.2), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    const cleanup = this.connectVoice(oscillator, gain, sourceX, listenerX);
    this.scheduleCleanup(oscillator, cleanup, now + 0.12);
  }

  playJump(sourceX: number, listenerX: number) {
    if (!this.canPlaySfx()) return;

    const context = this.ensureContext();
    if (context.state !== "running") return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(220, now);
    oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this.getSfxLevel(0.14), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    const cleanup = this.connectVoice(oscillator, gain, sourceX, listenerX);
    this.scheduleCleanup(oscillator, cleanup, now + 0.14);
  }

  playLand(sourceX: number, listenerX: number, fallSpeed: number) {
    if (!this.canPlaySfx()) return;

    const context = this.ensureContext();
    if (context.state !== "running") return;

    const strength = clamp(fallSpeed / 520, 0.2, 1);
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(100, now);
    oscillator.frequency.exponentialRampToValueAtTime(55, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this.getSfxLevel(0.12 * strength), now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    const cleanup = this.connectVoice(oscillator, gain, sourceX, listenerX);
    this.scheduleCleanup(oscillator, cleanup, now + 0.16);
  }

  destroy() {
    for (const oscillator of this.ambienceOscillators) {
      oscillator.stop();
      oscillator.disconnect();
    }

    this.ambienceOscillators = [];
    this.ambiencePanners = [];
    this.ambienceStarted = false;

    if (this.context) {
      void this.context.close();
    }

    this.context = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.sfxGain = null;
  }

  private canPlaySfx() {
    return this.settings.masterVolume > 0 && this.settings.sfxVolume > 0;
  }

  private ensureContext() {
    if (this.context) return this.context;

    const context = new window.AudioContext();
    const masterGain = context.createGain();
    const ambienceGain = context.createGain();
    const sfxGain = context.createGain();

    ambienceGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);

    this.context = context;
    this.masterGain = masterGain;
    this.ambienceGain = ambienceGain;
    this.sfxGain = sfxGain;
    this.syncMix();

    return context;
  }

  private ensureAmbience() {
    if (this.ambienceStarted) return;

    const context = this.ensureContext();
    const ambienceGain = this.ambienceGain;
    if (!ambienceGain) return;

    const leftOscillator = context.createOscillator();
    const rightOscillator = context.createOscillator();
    const leftGain = context.createGain();
    const rightGain = context.createGain();

    leftOscillator.type = "sine";
    leftOscillator.frequency.value = 64;
    rightOscillator.type = "triangle";
    rightOscillator.frequency.value = 96;
    rightOscillator.detune.value = 4;

    leftGain.gain.value = 0.65;
    rightGain.gain.value = 0.35;

    const leftPanner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
    const rightPanner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;

    if (leftPanner) {
      leftPanner.pan.value = -0.22;
      leftOscillator.connect(leftGain);
      leftGain.connect(leftPanner);
      leftPanner.connect(ambienceGain);
      this.ambiencePanners.push(leftPanner);
    } else {
      leftOscillator.connect(leftGain);
      leftGain.connect(ambienceGain);
    }

    if (rightPanner) {
      rightPanner.pan.value = 0.22;
      rightOscillator.connect(rightGain);
      rightGain.connect(rightPanner);
      rightPanner.connect(ambienceGain);
      this.ambiencePanners.push(rightPanner);
    } else {
      rightOscillator.connect(rightGain);
      rightGain.connect(ambienceGain);
    }

    leftOscillator.start();
    rightOscillator.start();

    this.ambienceOscillators.push(leftOscillator, rightOscillator);
    this.ambienceStarted = true;
    this.syncMix();
  }

  private syncMix() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume / 100;
    }

    if (this.ambienceGain) {
      this.ambienceGain.gain.value = (this.settings.ambienceVolume / 100) * 0.08;
    }

    if (this.sfxGain) {
      this.sfxGain.gain.value = 1;
    }

    for (const panner of this.ambiencePanners) {
      const sign = panner.pan.value < 0 ? -1 : 1;
      panner.pan.value = this.settings.outputMode === "stereo" ? 0.22 * sign : 0;
    }
  }

  private getSfxLevel(scale: number) {
    return Math.max(0.0001, (this.settings.sfxVolume / 100) * scale);
  }

  private getPan(sourceX: number, listenerX: number) {
    if (this.settings.outputMode === "mono") return 0;
    return clamp((sourceX - listenerX) / 220, -1, 1);
  }

  private connectVoice(oscillator: OscillatorNode, gain: GainNode, sourceX: number, listenerX: number) {
    const context = this.ensureContext();
    const sfxGain = this.sfxGain;
    if (!sfxGain) return () => undefined;

    oscillator.connect(gain);

    if (typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();
      panner.pan.value = this.getPan(sourceX, listenerX);
      gain.connect(panner);
      panner.connect(sfxGain);
      return () => {
        panner.disconnect();
        gain.disconnect();
        oscillator.disconnect();
      };
    }

    gain.connect(sfxGain);
    return () => {
      gain.disconnect();
      oscillator.disconnect();
    };
  }

  private scheduleCleanup(oscillator: OscillatorNode, cleanup: () => void, stopAt: number) {
    oscillator.start();
    oscillator.stop(stopAt);
    oscillator.onended = cleanup;
  }
}