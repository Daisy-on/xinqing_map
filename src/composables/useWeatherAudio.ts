// @ts-nocheck
import { ref, watch, onUnmounted } from 'vue';
import birdSongUrl from '@/assets/sounds/bird-song.mp3'
import heavyRainUrl from '@/assets/sounds/heavy-rain.mp3'
import lightningOneUrl from '@/assets/sounds/lightning-1.mp3'
import lightningTwoUrl from '@/assets/sounds/lightning-2.ogg'
import smallRainUrl from '@/assets/sounds/small-rain.mp3'
type WeatherType = string;
type WeatherConfig = Record<string, any>;

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

interface LightningPlayback {
  buffers: AudioBuffer[]
  loading: Promise<void> | null
}

const lightningPlayback: LightningPlayback = {
  buffers: [],
  loading: null,
}

export function useWeatherAudio() {
  const ctxRef = ref<AudioContext | null>(null)
  const masterGainRef = ref<GainNode | null>(null)
  const activeAmbientRef = ref<AmbientPlayback | null>(null)
  const initedRef = ref(false)

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
    if (lightningPlayback.buffers.length > 0) return
    if (lightningPlayback.loading) return lightningPlayback.loading

    lightningPlayback.loading = (async () => {
      const decoded = await Promise.allSettled([
        decodeSample(ctx, lightningOneUrl),
        decodeSample(ctx, lightningTwoUrl),
      ])

      lightningPlayback.buffers = decoded
        .filter((result): result is PromiseFulfilledResult<AudioBuffer | null> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((buffer): buffer is AudioBuffer => !!buffer)
    })()

    try {
      await lightningPlayback.loading
    } finally {
      lightningPlayback.loading = null
    }
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

  const triggerThunder = () => {
    const ctx = ctxRef.value
    const master = masterGainRef.value
    if (!ctx || !master || !enabledRef.value) return

    void (async () => {
      await loadLightningSamples(ctx)

      const buffers = lightningPlayback.buffers
      if (!ctxRef.value || !masterGainRef.value || buffers.length === 0) return

      const source = ctx.createBufferSource()
      source.buffer = buffers[Math.floor(Math.random() * buffers.length)]
      source.playbackRate.value = 0.94 + Math.random() * 0.1

      const gain = ctx.createGain()
      gain.gain.value = Math.min(1, Math.max(0.18, volumeRef.value * 0.9))

      const panner = ctx.createStereoPanner()
      panner.pan.value = (Math.random() - 0.5) * 0.35

      source.connect(gain)
      gain.connect(panner)
      panner.connect(master)
      source.start()
      source.onended = () => {
        try { source.disconnect() } catch { /* already disconnected */ }
      }
    })()
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
    resumeAudio,
    triggerThunder,
    setWeather: (weather: WeatherType) => { weatherRef.value = weather },
    setConfig: (config: WeatherConfig) => { configRef.value = config },
    setEnabled: (enabled: boolean) => { enabledRef.value = enabled },
    setVolume: (volume: number) => { volumeRef.value = volume },
    setPaused: (paused: boolean) => { pausedRef.value = paused },
  }
}