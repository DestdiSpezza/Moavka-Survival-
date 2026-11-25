import { loadSettings, saveSettings, type Settings } from '../systems/settings';
import { nextStation, noteFreq, STATIONS, stepSeconds } from './music';

export type ShotKind = 'pistol' | 'shotgun' | 'smg';

/**
 * Zvuk celé hry syntezátorem WebAudio: žádné soubory, všechno se generuje.
 * Prohlížeč pustí zvuk až po první akci hráče, proto `unlock()` volá úvodní obrazovka.
 * Když WebAudio chybí, všechno tiše nedělá nic.
 */
class SoundEngine {
  settings: Settings = loadSettings();
  station = 0;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private engine: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private siren: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode } | null = null;
  private radioOn = false;
  private radioTimer: number | null = null;
  private radioStep = 0;
  private radioNext = 0;

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  applyVolumes(): void {
    saveSettings(this.settings);
    if (!this.ctx) return;
    this.master.gain.value = this.settings.master;
    this.musicBus.gain.value = this.settings.music * 0.5;
    this.sfxBus.gain.value = this.settings.sfx;
  }

  // ---------- Stavební kameny ----------

  private noiseBurst(dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass', bus = this.sfxBus): void {
    const ctx = this.ctx;
    if (!ctx || vol <= 0) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  private tone(freq: number, dur: number, vol: number, wave: OscillatorType, at = 0, slideTo?: number, bus = this.sfxBus): void {
    const ctx = this.ctx;
    if (!ctx || vol <= 0) return;
    const o = ctx.createOscillator();
    o.type = wave;
    const t = ctx.currentTime + at;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ---------- Efekty (vol 0–1 podle vzdálenosti) ----------

  shot(kind: ShotKind, vol = 1): void {
    if (kind === 'shotgun') {
      this.noiseBurst(0.35, 0.9 * vol, 1400);
      this.tone(90, 0.25, 0.5 * vol, 'sine', 0, 40);
    } else if (kind === 'smg') {
      this.noiseBurst(0.08, 0.45 * vol, 3000);
    } else {
      this.noiseBurst(0.15, 0.6 * vol, 2500);
      this.tone(160, 0.1, 0.3 * vol, 'square', 0, 60);
    }
  }

  explosion(vol = 1, small = false): void {
    this.noiseBurst(small ? 0.4 : 1.4, (small ? 0.6 : 1) * vol, small ? 1200 : 700);
    this.tone(small ? 120 : 70, small ? 0.3 : 1, 0.8 * vol, 'sine', 0, 25);
  }

  swing(): void {
    this.noiseBurst(0.12, 0.25, 900, 'bandpass');
  }

  hit(vol = 1): void {
    this.tone(110, 0.12, 0.5 * vol, 'square', 0, 50);
    this.noiseBurst(0.06, 0.3 * vol, 800);
  }

  glass(vol = 1): void {
    this.noiseBurst(0.2, 0.4 * vol, 5000, 'highpass');
    this.tone(2400, 0.15, 0.1 * vol, 'triangle', 0.02, 1800);
  }

  horn(vol = 1): void {
    this.tone(392, 0.45, 0.25 * vol, 'square');
    this.tone(494, 0.45, 0.2 * vol, 'square');
  }

  pickup(): void {
    [0, 4, 7, 12].forEach((s, i) => this.tone(noteFreq(s + 3), 0.1, 0.25, 'square', i * 0.05));
  }

  jingle(success: boolean): void {
    const notes = success ? [0, 4, 7, 12, 7, 12] : [7, 6, 5, 4, -5];
    notes.forEach((s, i) => this.tone(noteFreq(s), 0.18, 0.3, success ? 'square' : 'sawtooth', i * 0.13));
  }

  blip(): void {
    this.tone(880, 0.06, 0.25, 'square');
  }

  // ---------- Smyčky: motor a siréna ----------

  /** Motor hráčova auta: null = vypnout, jinak rychlost v px/s. */
  setEngine(speed: number | null, heavy = false): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (speed === null) {
      if (this.engine) {
        this.engine.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        const e = this.engine;
        setTimeout(() => e.osc.stop(), 300);
        this.engine = null;
      }
      return;
    }
    if (!this.engine) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(this.sfxBus);
      osc.start();
      this.engine = { osc, gain, filter };
    }
    const s = Math.abs(speed);
    const base = heavy ? 32 : 45;
    this.engine.osc.frequency.setTargetAtTime(base + s * 0.35, ctx.currentTime, 0.08);
    this.engine.filter.frequency.setTargetAtTime(300 + s * 4, ctx.currentTime, 0.08);
    this.engine.gain.gain.setTargetAtTime(0.06 + Math.min(0.08, s / 2500), ctx.currentTime, 0.1);
  }

  /** Policejní siréna: 0 = vypnout, jinak hlasitost podle vzdálenosti. */
  setSiren(vol: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (vol <= 0.01) {
      if (this.siren) {
        this.siren.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        const s = this.siren;
        setTimeout(() => {
          s.osc.stop();
          s.lfo.stop();
        }, 500);
        this.siren = null;
      }
      return;
    }
    if (!this.siren) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 700;
      // Dvoutónová siréna: nízkofrekvenční oscilátor přepíná výšku tónu.
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 1.6;
      const depth = ctx.createGain();
      depth.gain.value = 130;
      lfo.connect(depth).connect(osc.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(this.sfxBus);
      osc.start();
      lfo.start();
      this.siren = { osc, gain, lfo };
    }
    this.siren.gain.gain.setTargetAtTime(0.05 * vol, ctx.currentTime, 0.2);
  }

  // ---------- Rádio ----------

  get stationName(): string | null {
    return this.radioOn && this.station >= 0 ? STATIONS[this.station].name : null;
  }

  radioStart(): void {
    if (!this.ctx || this.station < 0 || this.radioOn) return;
    this.radioOn = true;
    this.radioStep = 0;
    this.radioNext = this.ctx.currentTime + 0.1;
    this.radioTimer = window.setInterval(() => this.schedule(), 50);
  }

  radioStop(): void {
    this.radioOn = false;
    if (this.radioTimer !== null) window.clearInterval(this.radioTimer);
    this.radioTimer = null;
  }

  /** Další stanice (po poslední vypnuto). Vrátí hlášku moderátora. */
  radioNextStation(): string {
    this.station = nextStation(this.station);
    this.radioStop();
    if (this.station < 0) return 'Rádio vypnuto. Slyšíš jen motor a svědomí.';
    this.radioStart();
    return STATIONS[this.station].dj;
  }

  /** Plánovač: s předstihem naplánuje noty na dalších ~150 ms. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.radioOn || this.station < 0) return;
    const s = STATIONS[this.station];
    const step = stepSeconds(s);
    while (this.radioNext < ctx.currentTime + 0.15) {
      const i = this.radioStep % s.bass.length;
      const at = this.radioNext - ctx.currentTime;
      const bass = s.bass[i];
      const lead = s.lead[i];
      if (bass !== null) this.musicNote(noteFreq(bass), step * 0.9, 0.35, s.bassWave, at, s.distortion);
      if (lead !== null) this.musicNote(noteFreq(lead), step * 0.8, 0.18, s.leadWave, at, 0);
      const d = s.drums[i];
      if (d === 'k') this.drum(at, 'k');
      else if (d === 's') this.drum(at, 's');
      else if (d === 'h') this.drum(at, 'h');
      this.radioNext += step;
      this.radioStep++;
    }
  }

  private musicNote(freq: number, dur: number, vol: number, wave: OscillatorType, at: number, distortion: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + Math.max(0, at);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (distortion > 0) {
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = ((1 + distortion) * x) / (1 + distortion * Math.abs(x));
      }
      shaper.curve = curve;
      o.connect(shaper).connect(g);
    } else {
      o.connect(g);
    }
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private drum(at: number, kind: 'k' | 's' | 'h'): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + Math.max(0, at);
    if (kind === 'k') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + 0.22);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = kind === 's' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 's' ? 1800 : 7000;
    const g = ctx.createGain();
    const dur = kind === 's' ? 0.15 : 0.04;
    g.gain.setValueAtTime(kind === 's' ? 0.4 : 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }

  /** Všechno ztišit (pauza, konec hry). */
  silence(): void {
    this.radioStop();
    this.setEngine(null);
    this.setSiren(0);
  }
}

export const Sound = new SoundEngine();
