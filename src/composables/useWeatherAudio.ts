// @ts-nocheck
import { ref, watch, onUnmounted } from 'vue';
import birdSongUrl from '@/assets/sounds/bird-song.mp3'
import heavyRainUrl from '@/assets/sounds/heavy-rain.mp3'
import lightningOneUrl from '@/assets/sounds/lightning-1.mp3'
import lightningTwoUrl from '@/assets/sounds/lightning-2.ogg'
import smallRainUrl from '@/assets/sounds/small-rain.mp3'
type WeatherType = string;
type WeatherConfig = Record<string, any>;

// ── Procedural Audio Generators ─────────────────────────────────

let sharedNoiseBuffer: AudioBuffer | null = null;
let sharedNoiseCtx: AudioContext | null = null;

function getSharedNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedNoiseBuffer && sharedNoiseCtx === ctx) return sharedNoiseBuffer;
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  sharedNoiseBuffer = buffer;
  sharedNoiseCtx = ctx;
  return buffer;
}

function createFilteredNoise(
  ctx: AudioContext,
  type: BiquadFilterType,
  frequency: number,
  Q: number
): { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } {
  const source = ctx.createBufferSource();
  source.buffer = getSharedNoiseBuffer(ctx);
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = Q;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  source.connect(filter);
  filter.connect(gain);

  return { source, filter, gain };
}

function buildThunderCrackBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * duration);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let hpState = 0;
    let prevWhite = 0;
    let lowState = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;

      hpState = 0.985 * (hpState + white - prevWhite);
      prevWhite = white;

      const impulseChance = t < 0.012 ? 0.34 : t < 0.05 ? 0.12 : t < 0.10 ? 0.04 : 0.0;
      const impulse = Math.random() < impulseChance ? (Math.random() * 2 - 1) * 2.2 : 0;

      const hissEnv = Math.exp(-t * 55);
      const hiss = hpState * hissEnv * 1.6;

      lowState = lowState + 0.012 * (white - lowState);
      const low = lowState * Math.exp(-t * 16) * 0.35;

      const channelOffset = ch === 0 ? 1.0 : 0.92 + Math.random() * 0.16;
      const out = (impulse + hiss + low) * channelOffset;
      d[i] = Math.tanh(out * 1.15);
    }
  }
  return buf;
}

function buildLightningSnapBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * duration);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;

      const edge = white - prev * 0.98;
      prev = white;

      const env = Math.exp(-t * 145);

      const spike = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 2.0 * Math.exp(-t * 120) : 0;

      const out = (edge * 2.3 + spike) * env;
      d[i] = Math.tanh(out * 1.9);
    }
  }

  return buf;
}

function buildSubBassBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * duration);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);

  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const freq = 80 * Math.exp(-t * 0.8) + 25;
    phase += (2 * Math.PI * freq) / sr;
    const envelope = Math.exp(-t * 1.2);
    d[i] = (Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.2 + Math.sin(phase * 0.5) * 0.3)
      * envelope * Math.tanh(envelope * 2);
  }
  return buf;
}

function buildRumbleBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * duration);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let brown = 0;
    const drift = 0.015 + Math.random() * 0.01;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;
      brown = (brown + drift * white) / (1 + drift);

      const mod1 = 0.5 + 0.5 * Math.sin(t * 2.3 + ch);
      const mod2 = 0.5 + 0.5 * Math.sin(t * 0.7 + ch * 3);
      const modulation = mod1 * mod2;

      const envelope = Math.pow(Math.max(0, 1 - t / duration), 1.5);
      d[i] = brown * 35 * envelope * modulation;
    }
  }
  return buf;
}

const distortionCurveCache = new Map<number, Float32Array>();

function makeDistortionCurve(amount: number): Float32Array {
  const key = Math.round(amount * 100);
  const cached = distortionCurveCache.get(key);
  if (cached) return cached;

  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.max(-1, Math.min(1, Math.tanh(x * amount * 4) * (1 + 0.2 * Math.abs(x))));
  }
  distortionCurveCache.set(key, curve);
  return curve;
}

interface ThunderBufferCache {
  ctx: AudioContext;
  snap: AudioBuffer[];
  arcTail: AudioBuffer;
  bass: AudioBuffer[];
  rumble: AudioBuffer[];
}
let thunderCache: ThunderBufferCache | null = null;

function getThunderBuffers(ctx: AudioContext): ThunderBufferCache {
  if (thunderCache && thunderCache.ctx === ctx) return thunderCache;
  thunderCache = {
    ctx,
    snap: [
      buildLightningSnapBuffer(ctx, 0.032),
      buildLightningSnapBuffer(ctx, 0.022),
      buildLightningSnapBuffer(ctx, 0.018),
    ],
    arcTail: buildThunderCrackBuffer(ctx, 0.11),
    bass: [
      buildSubBassBuffer(ctx, 2.5),
      buildSubBassBuffer(ctx, 1.8),
    ],
    rumble: [
      buildRumbleBuffer(ctx, 5.0),
      buildRumbleBuffer(ctx, 7.0),
    ],
  };
  return thunderCache;
}

function playThunder(ctx: AudioContext, destination: AudioNode, volume: number) {
  const now = ctx.currentTime;
  const v = Math.min(volume * 1.8, 1.5);
  const cache = getThunderBuffers(ctx);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 6;
  comp.ratio.value = 12;
  comp.attack.value = 0.001;
  comp.release.value = 0.08;
  comp.connect(destination);

  const echoDelay = ctx.createDelay(2.0);
  echoDelay.delayTime.value = 0.18 + Math.random() * 0.15;
  const echoFilter = ctx.createBiquadFilter();
  echoFilter.type = 'lowpass';
  echoFilter.frequency.value = 600;
  echoFilter.Q.value = 0.5;
  const echoGain = ctx.createGain();
  echoGain.gain.value = 0.35;
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.5;
  echoDelay.connect(echoFilter);
  echoFilter.connect(echoGain);
  echoGain.connect(echoDelay);
  echoGain.connect(echoOut);
  echoOut.connect(comp);
  echoOut.gain.setValueAtTime(0.5, now);
  echoOut.gain.exponentialRampToValueAtTime(0.001, now + 5);

  const echoDelay2 = ctx.createDelay(3.0);
  echoDelay2.delayTime.value = 0.4 + Math.random() * 0.3;
  const echoFilter2 = ctx.createBiquadFilter();
  echoFilter2.type = 'lowpass';
  echoFilter2.frequency.value = 300;
  const echoGain2 = ctx.createGain();
  echoGain2.gain.value = 0.25;
  const echoOut2 = ctx.createGain();
  echoOut2.gain.value = 0.3;
  echoDelay2.connect(echoFilter2);
  echoFilter2.connect(echoGain2);
  echoGain2.connect(echoDelay2);
  echoGain2.connect(echoOut2);
  echoOut2.connect(comp);
  echoOut2.gain.setValueAtTime(0.3, now);
  echoOut2.gain.exponentialRampToValueAtTime(0.001, now + 7);

  const playBuf = (
    buffer: AudioBuffer,
    startAt: number,
    vol: number,
    opts: {
      distAmount?: number;
      pan?: number;
      sendEcho1?: number;
      sendEcho2?: number;
      lpFreq?: number;
      hpFreq?: number;
      bpFreq?: number;
      bpQ?: number;
      bpSweepTo?: number;
      bpSweepTime?: number;
    } = {}
  ) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    let chain: AudioNode = src;

    if (opts.hpFreq) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = opts.hpFreq;
      hp.Q.value = 0.7;
      chain.connect(hp);
      chain = hp;
    }

    if (opts.bpFreq) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = opts.bpFreq;
      bp.Q.value = opts.bpQ ?? 1.2;
      if (opts.bpSweepTo && opts.bpSweepTime && opts.bpSweepTo > 0) {
        bp.frequency.setValueAtTime(opts.bpFreq, startAt);
        bp.frequency.exponentialRampToValueAtTime(opts.bpSweepTo, startAt + opts.bpSweepTime);
      }
      chain.connect(bp);
      chain = bp;
    }

    if (opts.lpFreq) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = opts.lpFreq;
      lp.Q.value = 0.7;
      chain.connect(lp);
      chain = lp;
    }

    if (opts.distAmount && opts.distAmount > 0) {
      const ws = ctx.createWaveShaper();
      ws.curve = makeDistortionCurve(opts.distAmount);
      ws.oversample = '4x';
      chain.connect(ws);
      chain = ws;
    }

    const gain = ctx.createGain();
    gain.gain.value = vol;
    chain.connect(gain);
    chain = gain;

    if (opts.pan !== undefined) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
      chain.connect(panner);
      chain = panner;
    }

    chain.connect(comp);

    if (opts.sendEcho1) {
      const send1 = ctx.createGain();
      send1.gain.value = opts.sendEcho1;
      chain.connect(send1);
      send1.connect(echoDelay);
    }
    if (opts.sendEcho2) {
      const send2 = ctx.createGain();
      send2.gain.value = opts.sendEcho2;
      chain.connect(send2);
      send2.connect(echoDelay2);
    }

    src.start(startAt);
    src.stop(startAt + buffer.duration);
    src.onended = () => { try { src.disconnect(); } catch { /* already disconnected */ } };
  };

  const snapBuf = cache.snap[0];
  const arcTailBuf = cache.arcTail;
  const mainPan = (Math.random() - 0.5) * 0.5;
  playBuf(snapBuf, now, v * 1.2, {
    hpFreq: 1800,
    bpFreq: 4800,
    bpQ: 2.2,
    bpSweepTo: 2600,
    bpSweepTime: 0.024,
    distAmount: 0.45,
    pan: mainPan,
    sendEcho1: 0.08,
    sendEcho2: 0.03,
  });
  playBuf(arcTailBuf, now + 0.003, v * 0.42, {
    hpFreq: 900,
    bpFreq: 2600,
    bpQ: 1.1,
    pan: mainPan,
    sendEcho1: 0.06,
  });

  const bassBuf = cache.bass[0];
  playBuf(bassBuf, now + 0.005, v * 1.2, {
    lpFreq: 120,
    sendEcho1: 0.3,
  });

  const rs1Time = now + 0.045 + Math.random() * 0.06;
  const rs1Buf = cache.snap[1];
  playBuf(rs1Buf, rs1Time, v * 0.68, {
    hpFreq: 1700,
    bpFreq: 4300,
    bpQ: 1.8,
    bpSweepTo: 2400,
    bpSweepTime: 0.02,
    distAmount: 0.35,
    pan: mainPan + (Math.random() - 0.5) * 0.6,
    sendEcho1: 0.06,
    sendEcho2: 0.02,
  });

  const rs2Time = rs1Time + 0.03 + Math.random() * 0.07;
  const rs2Buf = cache.snap[2];
  playBuf(rs2Buf, rs2Time, v * 0.4, {
    hpFreq: 1600,
    bpFreq: 3900,
    bpQ: 1.5,
    bpSweepTo: 2200,
    bpSweepTime: 0.016,
    distAmount: 0.25,
    pan: -mainPan + (Math.random() - 0.5) * 0.4,
    sendEcho1: 0.04,
    sendEcho2: 0.02,
  });

  const rumbleBuf = cache.rumble[0];
  playBuf(rumbleBuf, now + 0.08, v * 0.55, {
    lpFreq: 250,
    sendEcho2: 0.4,
  });

  const bass2Buf = cache.bass[1];
  playBuf(bass2Buf, rs1Time + 0.01, v * 0.7, {
    lpFreq: 90,
  });

  const distRumbleBuf = cache.rumble[1];
  playBuf(distRumbleBuf, now + 0.5 + Math.random() * 0.5, v * 0.25, {
    lpFreq: 150,
    pan: (Math.random() - 0.5) * 0.8,
  });
}

// ── Ambient Layer Definitions ──────────────────────────────────

interface AmbientLayer {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  started: boolean;
}

interface AmbientSet {
  layers: AmbientLayer[];
  panner: StereoPannerNode;
}

function createRainAmbient(ctx: AudioContext, dest: AudioNode): AmbientSet {
  const panner = ctx.createStereoPanner();
  panner.connect(dest);

  const body = createFilteredNoise(ctx, 'bandpass', 3000, 0.8);
  body.gain.connect(panner);

  const rumble = createFilteredNoise(ctx, 'lowpass', 400, 0.6);
  rumble.gain.connect(panner);

  return {
    layers: [
      { ...body, started: false },
      { ...rumble, started: false },
    ],
    panner,
  };
}

function createWindAmbient(ctx: AudioContext, dest: AudioNode): AmbientSet {
  const panner = ctx.createStereoPanner();
  panner.connect(dest);

  const main = createFilteredNoise(ctx, 'bandpass', 600, 2);
  main.gain.connect(panner);

  const whistle = createFilteredNoise(ctx, 'bandpass', 2000, 5);
  whistle.gain.connect(panner);

  return {
    layers: [
      { ...main, started: false },
      { ...whistle, started: false },
    ],
    panner,
  };
}

function createSnowAmbient(ctx: AudioContext, dest: AudioNode): AmbientSet {
  const panner = ctx.createStereoPanner();
  panner.connect(dest);

  const soft = createFilteredNoise(ctx, 'lowpass', 800, 0.3);
  soft.gain.connect(panner);

  return {
    layers: [{ ...soft, started: false }],
    panner,
  };
}

interface LoopSampleAmbient {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  panner: StereoPannerNode;
  started: boolean;
}

function createSandstormAmbient(ctx: AudioContext, dest: AudioNode): LoopSampleAmbient {
  const panner = ctx.createStereoPanner();
  panner.connect(dest);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(panner);
  return { source: null, gain, panner, started: false };
}

function createHailAmbient(ctx: AudioContext, dest: AudioNode): LoopSampleAmbient {
  const panner = ctx.createStereoPanner();
  panner.connect(dest);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(panner);
  return { source: null, gain, panner, started: false };
}

// ── Main Vue 3 Composable ──────────────────────────────────────

interface SampleCacheEntry {
  ctx: AudioContext
  buffer: AudioBuffer | null
  loading: Promise<AudioBuffer | null> | null
}

interface AmbientPlayback {
  key: string
  source: AudioBufferSourceNode
  gain: GainNode
  panner: StereoPannerNode
  stopTimer: ReturnType<typeof setTimeout> | null
}

const sampleCache = new Map<string, SampleCacheEntry>()

export function useWeatherAudio() {
  const ctxRef = ref<AudioContext | null>(null)
  const masterGainRef = ref<GainNode | null>(null)
  const activeAmbientRef = ref<AmbientPlayback | null>(null)
  const lightningBuffersRef = ref<AudioBuffer[]>([])
  const loadingLightningRef = ref(false)
  const initedRef = ref(false)
  const thunderTimersRef = ref<Set<ReturnType<typeof setTimeout>>>(new Set())

  const weatherRef = ref<WeatherType>('sunny')
  const configRef = ref<WeatherConfig>({ wind: 0, particleCount: 0, speed: 0 })
  const enabledRef = ref(true)
  const volumeRef = ref(0.5)
  const pausedRef = ref(false)

  const fadeTo = (gain: GainNode, target: number, duration = 0.25) => {
    const ctx = ctxRef.value
    if (!ctx) return
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setTargetAtTime(target, ctx.currentTime, Math.max(0.01, duration / 3))
  }

  const resumeCtx = () => {
    const ctx = ctxRef.value
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // Resume may be blocked before the first user gesture.
      })
    }
  }

  const decodeSample = async (ctx: AudioContext, url: string) => {
    const cached = sampleCache.get(url)
    if (cached?.ctx === ctx && cached.buffer) return cached.buffer
    if (cached?.ctx === ctx && cached.loading) return cached.loading

    const loading = (async () => {
      try {
        const response = await fetch(url)
        if (!response.ok) return null
        const arrayBuffer = await response.arrayBuffer()
        return await ctx.decodeAudioData(arrayBuffer)
      } catch {
        return null
      }
    })()

    sampleCache.set(url, { ctx, buffer: cached?.buffer ?? null, loading })
    const buffer = await loading
    sampleCache.set(url, { ctx, buffer, loading: null })
    return buffer
  }

  const loadLightningSamples = async (ctx: AudioContext) => {
    if (loadingLightningRef.value || lightningBuffersRef.value.length > 0) return
    loadingLightningRef.value = true

    const decoded = await Promise.allSettled([
      decodeSample(ctx, lightningOneUrl),
      decodeSample(ctx, lightningTwoUrl),
    ])

    lightningBuffersRef.value = decoded
      .filter((result): result is PromiseFulfilledResult<AudioBuffer | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((buffer): buffer is AudioBuffer => !!buffer)

    loadingLightningRef.value = false
  }

  const stopActiveAmbient = (immediate = false) => {
    const active = activeAmbientRef.value
    if (!active) return

    if (active.stopTimer) {
      clearTimeout(active.stopTimer)
    }

    if (immediate) {
      try { active.source.stop() } catch { /* already stopped */ }
      try { active.source.disconnect() } catch { /* already disconnected */ }
      activeAmbientRef.value = null
      return
    }

    fadeTo(active.gain, 0, 0.18)
    active.stopTimer = setTimeout(() => {
      try { active.source.stop() } catch { /* already stopped */ }
      try { active.source.disconnect() } catch { /* already disconnected */ }
      activeAmbientRef.value = null
    }, 240)
  }

  const startAmbient = async (key: string, url: string, targetVolume: number) => {
    const ctx = ctxRef.value
    const master = masterGainRef.value
    if (!ctx || !master || !enabledRef.value) return

    const buffer = await decodeSample(ctx, url)
    if (!buffer || !ctxRef.value || !masterGainRef.value || !enabledRef.value) return

    const current = activeAmbientRef.value
    if (current?.key === key) {
      fadeTo(current.gain, targetVolume, 0.35)
      return
    }

    stopActiveAmbient()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.playbackRate.value = 1

    const gain = ctx.createGain()
    gain.gain.value = 0

    const panner = ctx.createStereoPanner()
    panner.pan.value = 0

    source.connect(gain)
    gain.connect(panner)
    panner.connect(master)
    source.start()

    activeAmbientRef.value = {
      key,
      source,
      gain,
      panner,
      stopTimer: null,
    }

    fadeTo(gain, targetVolume, 0.35)
  }

  const updatePauseState = (paused: boolean) => {
    const ctx = ctxRef.value
    if (!ctx) return
    if (paused) {
      if (ctx.state === 'running') void ctx.suspend()
    } else if (ctx.state === 'suspended') {
      void ctx.resume()
    }
  }

  const updateWeatherState = () => {
    if (!initedRef.value || !ctxRef.value || !masterGainRef.value) return

    resumeCtx()

    fadeTo(masterGainRef.value, enabledRef.value ? volumeRef.value : 0, 0.2)
    if (!enabledRef.value) {
      stopActiveAmbient()
      return
    }

    const weather = weatherRef.value
    const config = configRef.value
    const rainFactor = Math.min((config.particleCount || 0) / 500, 1)
    const speedFactor = Math.min((config.speed || 0) / 2, 1)

    if (weather === 'clear_sky' || weather === 'sunny' || weather === 'cloudy') {
      void startAmbient('bird-song', birdSongUrl, 0.16 + (weather === 'cloudy' ? 0.02 : 0))
      return
    }

    if (weather === 'light_rain') {
      void startAmbient('small-rain', smallRainUrl, 0.18 + rainFactor * 0.05 + speedFactor * 0.03)
      return
    }

    if (weather === 'heavy_rain' || weather === 'thunderstorm') {
      void startAmbient('heavy-rain', heavyRainUrl, 0.24 + rainFactor * 0.08 + speedFactor * 0.05)
      return
    }

    stopActiveAmbient()
  }

  const initAudio = () => {
    if (initedRef.value) return
    initedRef.value = true

    const ctx = new AudioContext()
    ctxRef.value = ctx

    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    masterGainRef.value = master

    void Promise.all([
      decodeSample(ctx, birdSongUrl),
      decodeSample(ctx, smallRainUrl),
      decodeSample(ctx, heavyRainUrl),
      loadLightningSamples(ctx),
    ]).then(() => {
      updateWeatherState()
    })
  }

  const resumeAudio = async () => {
    const ctx = ctxRef.value
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // Resume may fail if the browser still considers playback locked.
      }
    }
    updateWeatherState()
  }

  const triggerThunder = () => {
    const ctx = ctxRef.value
    const master = masterGainRef.value
    if (!ctx || !master || !enabledRef.value) return

    const delay = 200 + Math.random() * 1000
    const timerId = setTimeout(() => {
      thunderTimersRef.value.delete(timerId)
      const activeCtx = ctxRef.value
      const activeMaster = masterGainRef.value
      const samples = lightningBuffersRef.value
      if (!activeCtx || !activeMaster || samples.length === 0) return

      const buffer = samples[Math.floor(Math.random() * samples.length)]
      const source = activeCtx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = 0.94 + Math.random() * 0.12

      const gain = activeCtx.createGain()
      gain.gain.value = Math.min(1.2, Math.max(0.2, volumeRef.value * 1.1))

      const panner = activeCtx.createStereoPanner()
      panner.pan.value = (Math.random() - 0.5) * 0.45

      source.connect(gain)
      gain.connect(panner)
      panner.connect(activeMaster)
      source.start()
      source.onended = () => { try { source.disconnect() } catch { /* already disconnected */ } }
    }, delay)

    thunderTimersRef.value.add(timerId)
  }

  watch(pausedRef, (paused) => {
    updatePauseState(paused)
  })

  watch(
    [weatherRef, configRef, enabledRef, volumeRef],
    () => {
      updateWeatherState()
    },
    { deep: true }
  )

  onUnmounted(() => {
    const thunderTimers = thunderTimersRef.value
    for (const id of thunderTimers) clearTimeout(id)
    thunderTimers.clear()

    stopActiveAmbient(true)

    if (ctxRef.value) {
      for (const [url, entry] of sampleCache.entries()) {
        if (entry.ctx === ctxRef.value) {
          sampleCache.delete(url)
        }
      }
      if (ctxRef.value.state !== 'closed') {
        void ctxRef.value.close()
      }
    }
    initedRef.value = false
  })

  return {
    initAudio,
    triggerThunder,
    resumeAudio,
    setWeather: (weather: WeatherType) => { weatherRef.value = weather },
    setConfig: (config: WeatherConfig) => { configRef.value = config },
    setEnabled: (enabled: boolean) => { enabledRef.value = enabled },
    setVolume: (volume: number) => { volumeRef.value = volume },
    setPaused: (paused: boolean) => { pausedRef.value = paused },
  }
}