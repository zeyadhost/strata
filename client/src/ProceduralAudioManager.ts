import type { GameSettings } from "./settings";
import { TileType } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type MusicTrackKey = "xnor" | "sorcery" | "haul";

interface MusicState {
  depth: number;
  surfaceTile: TileType | null;
}

interface ManagedTrack {
  audio: HTMLAudioElement;
  baseVolume: number;
  currentMix: number;
  targetMix: number;
}

const LOOP_FADE_PER_SECOND = 0.2;
const ONE_SHOT_FADE_PER_SECOND = 0.35;

export class ProceduralAudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicUnlocked = false;
  private musicTracks: Partial<Record<MusicTrackKey, ManagedTrack>> = {};
  private activeOneShotTrack: MusicTrackKey | null = null;
  private sorceryArmed = true;
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
    this.musicUnlocked = true;
    this.ensureMusicTracks();
    this.syncMix();
  }

  updateMusic(state: MusicState, deltaMs: number) {
    this.ensureMusicTracks();

    if (state.depth <= 50) {
      this.sorceryArmed = true;
    }

    const desiredLoopTrack = this.getDesiredLoopTrack(state);
    if (this.activeOneShotTrack === null && desiredLoopTrack === "xnor" && state.depth > 50 && this.sorceryArmed) {
      this.startSorceryOneShot();
      this.sorceryArmed = false;
    }

    this.applyDesiredTrackMixes(desiredLoopTrack);
    this.stepMusicMixes(deltaMs / 1000);
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
    for (const track of Object.values(this.musicTracks)) {
      if (!track) continue;
      track.audio.pause();
      track.audio.currentTime = 0;
      track.audio.src = "";
    }

    this.musicTracks = {};
    this.activeOneShotTrack = null;
    this.musicUnlocked = false;

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

  private syncMix() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume / 100;
    }

    if (this.ambienceGain) {
      this.ambienceGain.gain.value = 0;
    }

    if (this.sfxGain) {
      this.sfxGain.gain.value = 1;
    }

    this.syncMusicVolumes();
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

  private ensureMusicTracks() {
    if (this.musicTracks.xnor && this.musicTracks.sorcery && this.musicTracks.haul) {
      return;
    }

    this.musicTracks.xnor ??= this.createMusicTrack("/music/xnor.ogg", true, 0.72);
    this.musicTracks.sorcery ??= this.createMusicTrack("/music/sorcery.ogg", false, 0.88);
    this.musicTracks.haul ??= this.createMusicTrack("/music/haul.ogg", true, 0.62);
    this.syncMusicVolumes();
  }

  private createMusicTrack(src: string, loop: boolean, baseVolume: number): ManagedTrack {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.preload = "auto";
    audio.volume = 0;
    return {
      audio,
      baseVolume,
      currentMix: 0,
      targetMix: 0,
    };
  }

  private getDesiredLoopTrack(state: MusicState): MusicTrackKey | null {
    if (state.surfaceTile === TileType.GRASS || state.surfaceTile === TileType.DIRT) {
      return "haul";
    }

    if (state.depth > 40) {
      return "xnor";
    }

    return null;
  }

  private startSorceryOneShot() {
    const sorcery = this.musicTracks.sorcery;
    if (!sorcery) return;

    this.activeOneShotTrack = "sorcery";
    sorcery.audio.currentTime = 0;
    sorcery.targetMix = 1;
    sorcery.audio.onended = () => {
      sorcery.currentMix = 0;
      sorcery.targetMix = 0;
      sorcery.audio.currentTime = 0;
      this.activeOneShotTrack = null;
      this.syncMusicVolumes();
    };
    this.ensureTrackPlayback("sorcery");
  }

  private applyDesiredTrackMixes(desiredLoopTrack: MusicTrackKey | null) {
    for (const [key, track] of Object.entries(this.musicTracks) as Array<[MusicTrackKey, ManagedTrack | undefined]>) {
      if (!track) continue;

      if (key === "sorcery") {
        if (this.activeOneShotTrack !== "sorcery") {
          track.targetMix = 0;
        }
        continue;
      }

      track.targetMix = this.activeOneShotTrack === null && key === desiredLoopTrack ? 1 : 0;
    }
  }

  private stepMusicMixes(deltaSeconds: number) {
    const loopStep = deltaSeconds * LOOP_FADE_PER_SECOND;
    const oneShotStep = deltaSeconds * ONE_SHOT_FADE_PER_SECOND;

    for (const [key, track] of Object.entries(this.musicTracks) as Array<[MusicTrackKey, ManagedTrack | undefined]>) {
      if (!track) continue;

      const fadeStep = key === "sorcery" ? oneShotStep : loopStep;
      if (track.targetMix > track.currentMix) {
        track.currentMix = Math.min(track.targetMix, track.currentMix + fadeStep);
      } else if (track.targetMix < track.currentMix) {
        track.currentMix = Math.max(track.targetMix, track.currentMix - fadeStep);
      }

      if (track.currentMix > 0.001 && track.targetMix > 0) {
        this.ensureTrackPlayback(key);
      }

      if (track.currentMix <= 0.001 && track.targetMix === 0 && !track.audio.paused) {
        track.audio.pause();
        if (key !== "sorcery") {
          track.audio.currentTime = 0;
        }
      }
    }

    this.syncMusicVolumes();
  }

  private ensureTrackPlayback(key: MusicTrackKey) {
    if (!this.musicUnlocked) return;

    const track = this.musicTracks[key];
    if (!track || !track.audio.paused) return;

    void track.audio.play().catch(() => undefined);
  }

  private syncMusicVolumes() {
    const musicLevel = (this.settings.masterVolume / 100) * (this.settings.ambienceVolume / 100);
    for (const track of Object.values(this.musicTracks)) {
      if (!track) continue;
      track.audio.volume = clamp(track.baseVolume * track.currentMix * musicLevel, 0, 1);
    }
  }
}