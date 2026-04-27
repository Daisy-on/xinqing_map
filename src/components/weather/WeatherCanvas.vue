<template>
  <canvas
    ref="canvasRef"
    class="weather-canvas"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;"
  />
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';

interface WeatherConfig {
  speed?: number;
  wind?: number;
  intensity?: number;
  temperature?: number;
  time?: number;
  particleCount?: number;
  thunder?: boolean;
  hailCount?: number;
  fogDensity?: number;
  sandDensity?: number;
}

interface Props {
  weather: string;
  config?: WeatherConfig;
}

const props = withDefaults(defineProps<Props>(), {
  weather: 'sunny',
  config: () => ({
    speed: 1,
    wind: 0,
    intensity: 1,
    temperature: 20,
    time: 12,
    particleCount: 100,
    thunder: false,
    hailCount: 30,
    fogDensity: 0.5,
    sandDensity: 0.6,
  }),
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const requestRef = ref<number>(0);
const configRef = ref<WeatherConfig>(props.config || {});
let initParticlesFn: (() => void) | null = null;

let width = typeof window !== 'undefined' ? window.innerWidth : 800;
let height = typeof window !== 'undefined' ? window.innerHeight : 600;
let groundLevel = height - 4;

// 雪花类
class SnowFlake {
  x: number;
  y: number;
  radius: number;
  baseSpeed: number;
  baseWind: number;
  angle: number;
  opacity: number;

  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * 3 + 1;
    this.baseSpeed = Math.random() * 1.5 + 0.5;
    this.baseWind = (Math.random() - 0.5) * 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.6 + 0.2;
  }

  update(snowPile: SnowPile | null) {
    const { speed: speedMult = 1, wind: windConfig = 0 } = configRef.value;
    const currentSpeed = this.baseSpeed * speedMult;
    const currentWind = this.baseWind + windConfig;

    this.y += currentSpeed;
    this.x += currentWind + Math.sin(this.angle) * 0.5;
    this.angle += 0.05;

    const hitGround = this.y > groundLevel && this.y < groundLevel + 5;

    if (snowPile && hitGround) {
      snowPile.add(this.x);
      this.reset();
    } else if (this.y > height) {
      this.reset();
    }
  }

  reset() {
    this.y = -10;
    this.x = Math.random() * width;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 积雪管理类
class SnowPile {
  flakes: { x: number; y: number; size: number; life: number }[] = [];

  add(x: number) {
    if (this.flakes.length > 500) {
      this.flakes.shift();
    }
    this.flakes.push({
      x: x,
      y: groundLevel + 2,
      size: Math.random() * 4 + 3,
      life: 1.0,
    });
  }

  update() {
    const { temperature = 0 } = configRef.value;

    let meltRate = 0.002;
    if (temperature !== undefined) {
      if (temperature > 0) {
        meltRate = 0.002 + temperature * 0.002;
      } else {
        meltRate = 0.0001;
      }
    }

    for (let i = this.flakes.length - 1; i >= 0; i--) {
      this.flakes[i].life -= meltRate;
      if (this.flakes[i].life <= 0) {
        this.flakes.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.flakes.length === 0) return;

    const { temperature = 0 } = configRef.value;
    const isDeepFreeze = temperature !== undefined && temperature <= -5;
    const baseColor = isDeepFreeze
      ? 'rgba(200, 235, 255, 0.95)'
      : 'rgba(255, 255, 255, 0.9)';

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    for (const f of this.flakes) {
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.size * f.life, Math.PI, 0);
    }
    ctx.fill();

    if (isDeepFreeze) {
      const startWhiteAt = 90;
      const fullWhiteAt = 220;
      const count = this.flakes.length;
      if (count > startWhiteAt) {
        const t = Math.min(
          1,
          Math.max(0, (count - startWhiteAt) / (fullWhiteAt - startWhiteAt))
        );
        const topLayerRatio = 0.1 + t * 0.35;
        const topLayerCount = Math.max(12, Math.floor(count * topLayerRatio));
        const startIndex = Math.max(0, count - topLayerCount);
        const alpha = 0.2 + t * 0.7;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        for (let i = startIndex; i < count; i++) {
          const f = this.flakes[i];
          ctx.moveTo(f.x, f.y);
          ctx.arc(f.x, f.y, f.size * f.life * 0.9, Math.PI, 0);
        }
        ctx.fill();
      }
    }
  }
}

// 监听配置变化
watch(() => props.config, (newConfig) => {
  configRef.value = { ...configRef.value, ...newConfig };
}, { deep: true });

// 监听天气变化并重新初始化粒子
watch(() => props.weather, () => {
  if (initParticlesFn) {
    initParticlesFn();
  }
}, { immediate: true });

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 初始化画布
  canvas.width = width;
  canvas.height = height;

  // 粒子池初始化（雨滴溅射粒子）
  const SPLASH_POOL_SIZE = 256;
  const splashPool = {
    x: new Float32Array(SPLASH_POOL_SIZE),
    y: new Float32Array(SPLASH_POOL_SIZE),
    vx: new Float32Array(SPLASH_POOL_SIZE),
    vy: new Float32Array(SPLASH_POOL_SIZE),
    life: new Float32Array(SPLASH_POOL_SIZE),
    count: 0,
    spawn(sx: number, sy: number) {
      if (this.count >= SPLASH_POOL_SIZE) return;
      const i = this.count++;
      this.x[i] = sx;
      this.y[i] = sy;
      this.vx[i] = (Math.random() - 0.5) * 4;
      this.vy[i] = -(Math.random() * 3 + 2);
      this.life[i] = 1.0;
    },
    update() {
      const gravity = 0.2;
      let i = 0;
      while (i < this.count) {
        this.vy[i] += gravity;
        this.x[i] += this.vx[i];
        this.y[i] += this.vy[i];
        this.life[i] -= 0.05;
        if (this.life[i] <= 0) {
          const last = this.count - 1;
          if (i < last) {
            this.x[i] = this.x[last];
            this.y[i] = this.y[last];
            this.vx[i] = this.vx[last];
            this.vy[i] = this.vy[last];
            this.life[i] = this.life[last];
          }
          this.count--;
        } else {
          i++;
        }
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      if (this.count === 0) return;
      ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.beginPath();
      for (let i = 0; i < this.count; i++) {
        ctx.rect(this.x[i] - 1, this.y[i] - 1, 2, 2);
      }
      ctx.fill();
    },
    clear() {
      this.count = 0;
    },
  };

  // 雨滴粒子系统
  const MAX_RAIN = 600;
  const BIN_COUNT = 3;
  const binThresholds: [number, number][] = [
    [0, 0.2],
    [0.2, 0.35],
    [0.35, 0.6],
  ];
  const binFillStyles = binThresholds.map(
    ([lo, hi]) => `rgba(180, 200, 235, ${((lo + hi) / 2).toFixed(2)})`
  );
  const binIndices: Int16Array[] = Array.from({ length: BIN_COUNT }, () => new Int16Array(MAX_RAIN));
  const binSizes = new Int32Array(BIN_COUNT);

  const rainData = {
    x: new Float32Array(MAX_RAIN),
    y: new Float32Array(MAX_RAIN),
    baseSpeed: new Float32Array(MAX_RAIN),
    length: new Float32Array(MAX_RAIN),
    opacity: new Float32Array(MAX_RAIN),
    count: 0,
    init(i: number) {
      this.x[i] = Math.random() * width;
      this.y[i] = Math.random() * height;
      this.baseSpeed[i] = Math.random() * 15 + 15;
      this.length[i] = Math.random() * 20 + 20;
      this.opacity[i] = Math.random() * 0.4 + 0.1;
      this._assignBin(i);
    },
    _assignBin(i: number) {
      const o = this.opacity[i];
      for (let b = 0; b < BIN_COUNT; b++) {
        if (o >= binThresholds[b][0] && o < binThresholds[b][1]) {
          binIndices[b][binSizes[b]++] = i;
          return;
        }
      }
      binIndices[BIN_COUNT - 1][binSizes[BIN_COUNT - 1]++] = i;
    },
    setCount(n: number) {
      const target = Math.min(n, MAX_RAIN);
      while (this.count < target) {
        this.init(this.count);
        this.count++;
      }
      if (this.count > target) {
        this.count = target;
        this._rebuildBins();
      }
    },
    _rebuildBins() {
      for (let b = 0; b < BIN_COUNT; b++) binSizes[b] = 0;
      for (let i = 0; i < this.count; i++) {
        const o = this.opacity[i];
        for (let b = 0; b < BIN_COUNT; b++) {
          if (o >= binThresholds[b][0] && o < binThresholds[b][1]) {
            binIndices[b][binSizes[b]++] = i;
            break;
          }
        }
      }
    },
    updateAll(windVal: number, speedMult: number) {
      for (let i = 0; i < this.count; i++) {
        const spd = this.baseSpeed[i] * speedMult;
        this.y[i] += spd;
        this.x[i] += windVal;

        if (this.y[i] > groundLevel && this.y[i] < groundLevel + spd) {
          if (splashPool.count < SPLASH_POOL_SIZE - 8) {
            const splashCount = Math.floor(Math.random() * 2) + 1;
            for (let s = 0; s < splashCount; s++) {
              splashPool.spawn(this.x[i], groundLevel);
            }
          }
          this.y[i] = -this.length[i];
          this.x[i] = Math.random() * width;
        } else if (this.y[i] > height || this.x[i] > width + 100 || this.x[i] < -100) {
          this.y[i] = -this.length[i];
          if (windVal > 0) {
            this.x[i] = Math.random() * (width + 200) - 200;
          } else {
            this.x[i] = Math.random() * (width + 200);
          }
        }
      }
    },
    drawAll(ctx: CanvasRenderingContext2D, windVal: number) {
      if (this.count === 0) return;
      const windOffset = windVal * 2;
      const topHalfWidth = 0.3;
      const bottomHalfWidth = 1.2;
      for (let b = 0; b < BIN_COUNT; b++) {
        const size = binSizes[b];
        if (size === 0) continue;
        ctx.fillStyle = binFillStyles[b];
        ctx.beginPath();
        const idx = binIndices[b];
        for (let j = 0; j < size; j++) {
          const i = idx[j];
          const tx = this.x[i];
          const ty = this.y[i];
          const bx = tx + windOffset;
          const by = ty + this.length[i];
          ctx.moveTo(tx - topHalfWidth, ty);
          ctx.lineTo(tx + topHalfWidth, ty);
          ctx.lineTo(bx + bottomHalfWidth, by);
          ctx.lineTo(bx - bottomHalfWidth, by);
        }
        ctx.fill();
      }
    },
    clear() {
      this.count = 0;
      for (let b = 0; b < BIN_COUNT; b++) binSizes[b] = 0;
    },
  };

  // 冰雹系统
  const MAX_HAIL = 150;
  const HAIL_VERTS = 6;
  const hailRotation = new Float32Array(MAX_HAIL);
  const hailRotSpeed = new Float32Array(MAX_HAIL);
  const HAIL_TEX_COUNT = 6;
  const HAIL_TEX_BASE_SIZE = 8;
  const hailTextures: HTMLCanvasElement[] = [];

  for (let t = 0; t < HAIL_TEX_COUNT; t++) {
    const texSize = HAIL_TEX_BASE_SIZE + t * 3;
    const tc = document.createElement('canvas');
    tc.width = texSize * 2 + 4;
    tc.height = texSize * 2 + 4;
    const tctx = tc.getContext('2d')!;
    const cx = tc.width / 2,
      cy = tc.height / 2;
    tctx.beginPath();
    for (let v = 0; v < HAIL_VERTS; v++) {
      const angle = (v / HAIL_VERTS) * Math.PI * 2;
      const r = texSize * (0.7 + Math.random() * 0.3);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (v === 0) {
        tctx.moveTo(px, py);
      } else {
        tctx.lineTo(px, py);
      }
    }
    tctx.closePath();
    const grad = tctx.createRadialGradient(
      cx - texSize * 0.2,
      cy - texSize * 0.2,
      texSize * 0.1,
      cx,
      cy,
      texSize
    );
    grad.addColorStop(0, 'rgba(240, 248, 255, 0.85)');
    grad.addColorStop(0.4, 'rgba(200, 220, 245, 0.65)');
    grad.addColorStop(1, 'rgba(160, 190, 220, 0.35)');
    tctx.fillStyle = grad;
    tctx.fill();
    tctx.strokeStyle = 'rgba(180, 210, 240, 0.3)';
    tctx.lineWidth = 0.5;
    tctx.stroke();
    tctx.beginPath();
    tctx.ellipse(cx - texSize * 0.15, cy - texSize * 0.2, texSize * 0.25, texSize * 0.15, -0.3, 0, Math.PI * 2);
    tctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    tctx.fill();
    hailTextures.push(tc);
  }

  const hailTexIdx = new Uint8Array(MAX_HAIL);

  function initHailShape(i: number) {
    hailRotation[i] = Math.random() * Math.PI * 2;
    hailRotSpeed[i] = (Math.random() - 0.5) * 0.08;
    hailTexIdx[i] = Math.floor(Math.random() * HAIL_TEX_COUNT);
  }

  const hailData = {
    x: new Float32Array(MAX_HAIL),
    y: new Float32Array(MAX_HAIL),
    speed: new Float32Array(MAX_HAIL),
    size: new Float32Array(MAX_HAIL),
    count: 0,
    init(i: number, spreadY = true) {
      this.x[i] = Math.random() * (width + 200) - 100;
      this.y[i] = spreadY ? Math.random() * (height + 300) - 300 : -(Math.random() * 300 + 20);
      this.speed[i] = Math.random() * 6 + 14;
      this.size[i] = Math.random() * 5 + 4;
      initHailShape(i);
    },
    setCount(n: number) {
      const target = Math.min(n, MAX_HAIL);
      while (this.count < target) {
        this.init(this.count, true);
        this.count++;
      }
      if (this.count > target) this.count = target;
    },
    updateAll(windVal: number, speedMult: number) {
      for (let i = 0; i < this.count; i++) {
        this.speed[i] += 0.18;
        this.y[i] += this.speed[i] * speedMult;
        this.x[i] += windVal * 0.3;
        hailRotation[i] += hailRotSpeed[i] * speedMult;
        if (this.y[i] > groundLevel) {
          this.y[i] = -(Math.random() * 300 + 20);
          this.x[i] = Math.random() * (width + 200) - 100;
          this.speed[i] = Math.random() * 6 + 14;
          this.size[i] = Math.random() * 5 + 4;
          initHailShape(i);
        }
      }
    },
    drawAll(ctx: CanvasRenderingContext2D) {
      if (this.count === 0) return;
      for (let i = 0; i < this.count; i++) {
        const tex = hailTextures[hailTexIdx[i]];
        const sz = this.size[i];
        const scale = sz / (HAIL_TEX_BASE_SIZE + hailTexIdx[i] * 3);
        const hw = (tex.width * scale) / 2;
        const hh = (tex.height * scale) / 2;
        ctx.save();
        ctx.translate(this.x[i], this.y[i]);
        ctx.rotate(hailRotation[i]);
        ctx.drawImage(tex, -hw, -hh, hw * 2, hh * 2);
        ctx.restore();
      }
    },
    clear() {
      this.count = 0;
    },
  };

  // 冰雹反弹粒子
  const HAIL_BOUNCE_POOL = 120;
  const hailBounce = {
    x: new Float32Array(HAIL_BOUNCE_POOL),
    y: new Float32Array(HAIL_BOUNCE_POOL),
    vx: new Float32Array(HAIL_BOUNCE_POOL),
    vy: new Float32Array(HAIL_BOUNCE_POOL),
    life: new Float32Array(HAIL_BOUNCE_POOL),
    size: new Float32Array(HAIL_BOUNCE_POOL),
    count: 0,
    spawn(sx: number, sy: number, parentSize: number) {
      const n = Math.floor(Math.random() * 3) + 2;
      for (let f = 0; f < n; f++) {
        if (this.count >= HAIL_BOUNCE_POOL) return;
        const i = this.count++;
        this.x[i] = sx + (Math.random() - 0.5) * parentSize;
        this.y[i] = sy;
        this.vx[i] = (Math.random() - 0.5) * 8;
        this.vy[i] = -(Math.random() * 6 + 3);
        this.life[i] = 1.0;
        this.size[i] = parentSize * (Math.random() * 0.35 + 0.15);
      }
    },
    update() {
      let i = 0;
      while (i < this.count) {
        this.vy[i] += 0.3;
        this.x[i] += this.vx[i];
        this.y[i] += this.vy[i];
        this.life[i] -= 0.04;
        if (this.life[i] <= 0 || this.y[i] > groundLevel + 10) {
          const last = this.count - 1;
          if (i < last) {
            this.x[i] = this.x[last];
            this.y[i] = this.y[last];
            this.vx[i] = this.vx[last];
            this.vy[i] = this.vy[last];
            this.life[i] = this.life[last];
            this.size[i] = this.size[last];
          }
          this.count--;
        } else {
          i++;
        }
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      if (this.count === 0) return;
      ctx.fillStyle = 'rgba(210, 230, 255, 0.4)';
      ctx.beginPath();
      for (let i = 0; i < this.count; i++) {
        const sz = this.size[i] * (0.5 + this.life[i] * 0.5);
        ctx.moveTo(this.x[i], this.y[i] - sz);
        ctx.lineTo(this.x[i] + sz * 0.7, this.y[i] + sz * 0.3);
        ctx.lineTo(this.x[i] - sz * 0.5, this.y[i] + sz * 0.6);
        ctx.closePath();
      }
      ctx.fill();
    },
    clear() {
      this.count = 0;
    },
  };

  // 地面积冰系统
  const ICE_TEX_SHAPES = 3;
  const ICE_TEX_SIZES = 3;
  const ICE_TEX_BASE = 6;
  const iceTextures: HTMLCanvasElement[] = [];
  
  for (let shape = 0; shape < ICE_TEX_SHAPES; shape++) {
    for (let sizeIdx = 0; sizeIdx < ICE_TEX_SIZES; sizeIdx++) {
      const sz = ICE_TEX_BASE + sizeIdx * 3;
      const tc = document.createElement('canvas');
      tc.width = sz * 2 + 4;
      tc.height = sz * 2 + 4;
      const tctx = tc.getContext('2d')!;
      const cx = tc.width / 2,
        cy = tc.height / 2;
      const grad = tctx.createRadialGradient(cx - sz * 0.1, cy - sz * 0.1, 0, cx, cy, sz);
      grad.addColorStop(0, 'rgba(230, 245, 255, 0.75)');
      grad.addColorStop(0.6, 'rgba(195, 220, 245, 0.55)');
      grad.addColorStop(1, 'rgba(170, 200, 230, 0.25)');
      tctx.fillStyle = grad;
      tctx.beginPath();
      if (shape === 0) {
        tctx.moveTo(cx, cy - sz);
        tctx.lineTo(cx + sz * 0.8, cy - sz * 0.2);
        tctx.lineTo(cx + sz * 0.5, cy + sz * 0.7);
        tctx.lineTo(cx - sz * 0.6, cy + sz * 0.5);
        tctx.lineTo(cx - sz * 0.7, cy - sz * 0.3);
      } else if (shape === 1) {
        tctx.ellipse(cx, cy, sz * 0.9, sz * 0.6, 0, 0, Math.PI * 2);
      } else {
        tctx.moveTo(cx, cy - sz * 0.8);
        tctx.lineTo(cx + sz * 0.9, cy + sz * 0.5);
        tctx.lineTo(cx - sz * 0.7, cy + sz * 0.6);
      }
      tctx.closePath();
      tctx.fill();
      tctx.strokeStyle = 'rgba(200, 225, 250, 0.2)';
      tctx.lineWidth = 0.5;
      tctx.stroke();
      tctx.beginPath();
      tctx.ellipse(cx - sz * 0.15, cy - sz * 0.15, sz * 0.2, sz * 0.12, -0.5, 0, Math.PI * 2);
      tctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      tctx.fill();
      iceTextures.push(tc);
    }
  }

  const GROUND_ICE_POOL = 500;
  const groundIce = {
    x: new Float32Array(GROUND_ICE_POOL),
    y: new Float32Array(GROUND_ICE_POOL),
    size: new Float32Array(GROUND_ICE_POOL),
    life: new Float32Array(GROUND_ICE_POOL),
    rotation: new Float32Array(GROUND_ICE_POOL),
    texIdx: new Uint8Array(GROUND_ICE_POOL),
    count: 0,
    spawn(sx: number, sy: number, parentSize: number) {
      const n = Math.floor(Math.random() * 3) + 2;
      for (let f = 0; f < n; f++) {
        const shape = Math.floor(Math.random() * ICE_TEX_SHAPES);
        const sizeVariant = Math.floor(Math.random() * ICE_TEX_SIZES);
        const tIdx = shape * ICE_TEX_SIZES + sizeVariant;
        if (this.count >= GROUND_ICE_POOL) {
          let minLife = 2,
            minIdx = 0;
          for (let j = 0; j < this.count; j++) {
            if (this.life[j] < minLife) {
              minLife = this.life[j];
              minIdx = j;
            }
          }
          const i = minIdx;
          this.x[i] = sx + (Math.random() - 0.5) * parentSize * 3;
          this.y[i] = sy - Math.random() * 3;
          this.size[i] = parentSize * (Math.random() * 0.5 + 0.4);
          this.life[i] = 1.0;
          this.rotation[i] = Math.random() * Math.PI * 2;
          this.texIdx[i] = tIdx;
        } else {
          const i = this.count++;
          this.x[i] = sx + (Math.random() - 0.5) * parentSize * 3;
          this.y[i] = sy - Math.random() * 3;
          this.size[i] = parentSize * (Math.random() * 0.5 + 0.4);
          this.life[i] = 1.0;
          this.rotation[i] = Math.random() * Math.PI * 2;
          this.texIdx[i] = tIdx;
        }
      }
    },
    update(rainAmount: number) {
      const baseMelt = 0.0002;
      const rainMelt = rainAmount * 0.0002;
      const meltRate = baseMelt + rainMelt;
      let i = 0;
      while (i < this.count) {
        this.life[i] -= meltRate;
        if (this.life[i] <= 0) {
          const last = this.count - 1;
          if (i < last) {
            this.x[i] = this.x[last];
            this.y[i] = this.y[last];
            this.size[i] = this.size[last];
            this.life[i] = this.life[last];
            this.rotation[i] = this.rotation[last];
            this.texIdx[i] = this.texIdx[last];
          }
          this.count--;
        } else {
          i++;
        }
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      if (this.count === 0) return;
      for (let i = 0; i < this.count; i++) {
        const tex = iceTextures[this.texIdx[i]];
        const sz = this.size[i] * (0.6 + this.life[i] * 0.4);
        const scale = sz / (ICE_TEX_BASE + (this.texIdx[i] % ICE_TEX_SIZES) * 3);
        const alpha = Math.min(this.life[i] * 0.8, 0.65);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x[i], this.y[i]);
        ctx.rotate(this.rotation[i]);
        const hw = (tex.width * scale) / 2;
        const hh = (tex.height * scale) / 2;
        ctx.drawImage(tex, -hw, -hh, hw * 2, hh * 2);
        ctx.restore();
      }
    },
    clear() {
      this.count = 0;
    },
  };

  // 雾气系统
  const FOG_TEX_SIZE = 128;
  const fogTexCanvas = document.createElement('canvas');
  fogTexCanvas.width = FOG_TEX_SIZE;
  fogTexCanvas.height = FOG_TEX_SIZE;
  const fogTexCtx = fogTexCanvas.getContext('2d')!;
  {
    const cx = FOG_TEX_SIZE / 2;
    const g = fogTexCtx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(225, 235, 240, 1)');
    g.addColorStop(0.4, 'rgba(215, 225, 235, 0.8)');
    g.addColorStop(0.7, 'rgba(205, 220, 235, 0.3)');
    g.addColorStop(1, 'rgba(205, 220, 235, 0)');
    fogTexCtx.fillStyle = g;
    fogTexCtx.fillRect(0, 0, FOG_TEX_SIZE, FOG_TEX_SIZE);
  }

  class FogPuff {
    x: number;
    y: number;
    radius: number;
    baseRadius: number;
    speed: number;
    opacity: number;
    oscillationOffset: number;

    constructor() {
      const minDim = Math.min(width, height);
      this.x = Math.random() * (width + 400) - 200;
      this.y = Math.random() * (height + 200) - 100;
      const zFactor = Math.random();
      this.baseRadius = Math.min(minDim * (0.2 + zFactor * 0.5), 400);
      this.radius = this.baseRadius;
      const driftDir = Math.random() > 0.5 ? 1 : -1;
      this.speed = (0.2 + zFactor * 0.5) * driftDir;
      this.opacity = 0.05 + Math.random() * 0.12;
      this.oscillationOffset = Math.random() * Math.PI * 2;
    }
  }

  function updateFogs(fogArr: FogPuff[], now: number, windVal: number) {
    for (let i = 0; i < fogArr.length; i++) {
      const f = fogArr[i];
      f.x += f.speed + windVal * 3.0;
      f.y += Math.sin(now * 0.0008 + f.oscillationOffset) * 0.15;
      const boundary = f.radius + 100;
      if (f.x > width + boundary) {
        f.x = -boundary;
        f.y = Math.random() * height;
      } else if (f.x < -boundary) {
        f.x = width + boundary;
        f.y = Math.random() * height;
      }
    }
  }

  function drawFogs(fogArr: FogPuff[], density: number) {
    for (let i = 0; i < fogArr.length; i++) {
      const f = fogArr[i];
      const finalOpacity = f.opacity * (0.6 + density * 0.8);
      if (finalOpacity <= 0.01) continue;
      const diam = f.radius * 2;
      if (f.x + f.radius < 0 || f.x - f.radius > width || f.y + f.radius < 0 || f.y - f.radius > height) continue;
      ctx.globalAlpha = finalOpacity;
      ctx.drawImage(fogTexCanvas, f.x - f.radius, f.y - f.radius, diam, diam);
    }
    ctx.globalAlpha = 1;
  }

  // 沙尘暴系统
  const GRAIN_SHAPES = 12;
  const grainVertices: number[][][] = [];
  for (let s = 0; s < GRAIN_SHAPES; s++) {
    const sides = 3 + Math.floor(Math.random() * 4);
    const verts: number[][] = [];
    for (let v = 0; v < sides; v++) {
      const angle = (v / sides) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist = 0.5 + Math.random() * 0.5;
      verts.push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
    }
    grainVertices.push(verts);
  }

  const MAX_SAND = 350;
  const sandData = {
    x: new Float32Array(MAX_SAND),
    y: new Float32Array(MAX_SAND),
    speed: new Float32Array(MAX_SAND),
    size: new Float32Array(MAX_SAND),
    opacity: new Float32Array(MAX_SAND),
    wobble: new Float32Array(MAX_SAND),
    wobbleAmp: new Float32Array(MAX_SAND),
    rotation: new Float32Array(MAX_SAND),
    rotSpeed: new Float32Array(MAX_SAND),
    shapeIdx: new Uint8Array(MAX_SAND),
    colorShift: new Float32Array(MAX_SAND),
    count: 0,
    init(i: number) {
      this.x[i] = Math.random() * (width + 400) - 200;
      this.y[i] = Math.random() * height;
      this.speed[i] = Math.random() * 5 + 2;
      this.size[i] = Math.random() * 2.5 + 1;
      this.opacity[i] = Math.random() * 0.4 + 0.15;
      this.wobble[i] = Math.random() * Math.PI * 2;
      this.wobbleAmp[i] = Math.random() * 0.8 + 0.2;
      this.rotation[i] = Math.random() * Math.PI * 2;
      this.rotSpeed[i] = (Math.random() - 0.5) * 0.08;
      this.shapeIdx[i] = Math.floor(Math.random() * GRAIN_SHAPES);
      this.colorShift[i] = Math.random();
    },
    setCount(n: number) {
      const target = Math.min(n, MAX_SAND);
      while (this.count < target) {
        this.init(this.count);
        this.count++;
      }
      if (this.count > target) this.count = target;
    },
    updateAll(windVal: number, speedMult: number, now: number) {
      const dir = windVal >= 0 ? 1 : -1;
      const absWind = Math.abs(windVal);
      for (let i = 0; i < this.count; i++) {
        this.x[i] += (this.speed[i] + absWind * 2) * speedMult * dir;
        this.y[i] += Math.sin(now * 0.0006 + this.wobble[i]) * this.wobbleAmp[i];
        this.rotation[i] += this.rotSpeed[i] * speedMult;
        if ((dir > 0 && this.x[i] > width + 100) || (dir < 0 && this.x[i] < -100)) {
          this.x[i] = dir > 0 ? -50 - Math.random() * 200 : width + 50 + Math.random() * 200;
          this.y[i] = Math.random() * height;
          this.speed[i] = Math.random() * 5 + 2;
        }
        if (this.y[i] < -10) this.y[i] = height + 5;
        if (this.y[i] > height + 10) this.y[i] = -5;
      }
    },
    drawAll(ctx: CanvasRenderingContext2D) {
      if (this.count === 0) return;
      const colors = [
        [180, 155, 100],
        [160, 135, 85],
        [195, 170, 120],
      ];
      for (let c = 0; c < 3; c++) {
        const [r, g, b] = colors[c];
        ctx.save();
        for (let i = 0; i < this.count; i++) {
          if (Math.floor(this.colorShift[i] * 3) !== c) continue;
          const sz = this.size[i];
          const verts = grainVertices[this.shapeIdx[i]];
          ctx.globalAlpha = this.opacity[i];
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.save();
          ctx.translate(this.x[i], this.y[i]);
          ctx.rotate(this.rotation[i]);
          ctx.beginPath();
          ctx.moveTo(verts[0][0] * sz, verts[0][1] * sz);
          for (let v = 1; v < verts.length; v++) {
            ctx.lineTo(verts[v][0] * sz, verts[v][1] * sz);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    },
    clear() {
      this.count = 0;
    },
  };

  const MAX_DEBRIS = 25;
  const debrisData = {
    x: new Float32Array(MAX_DEBRIS),
    y: new Float32Array(MAX_DEBRIS),
    speed: new Float32Array(MAX_DEBRIS),
    size: new Float32Array(MAX_DEBRIS),
    rotation: new Float32Array(MAX_DEBRIS),
    rotSpeed: new Float32Array(MAX_DEBRIS),
    wobble: new Float32Array(MAX_DEBRIS),
    wobbleAmp: new Float32Array(MAX_DEBRIS),
    type: new Uint8Array(MAX_DEBRIS),
    opacity: new Float32Array(MAX_DEBRIS),
    count: 0,
    init(i: number) {
      this.x[i] = Math.random() * (width + 600) - 300;
      this.y[i] = Math.random() * height;
      this.speed[i] = Math.random() * 3 + 3;
      this.size[i] = Math.random() * 8 + 4;
      this.rotation[i] = Math.random() * Math.PI * 2;
      this.rotSpeed[i] = (Math.random() - 0.5) * 0.15;
      this.wobble[i] = Math.random() * Math.PI * 2;
      this.wobbleAmp[i] = Math.random() * 2 + 1;
      this.type[i] = Math.floor(Math.random() * 5);
      this.opacity[i] = Math.random() * 0.3 + 0.2;
    },
    setCount(n: number) {
      const target = Math.min(n, MAX_DEBRIS);
      while (this.count < target) {
        this.init(this.count);
        this.count++;
      }
      if (this.count > target) this.count = target;
    },
    updateAll(windVal: number, speedMult: number, now: number) {
      const dir = windVal >= 0 ? 1 : -1;
      const absWind = Math.abs(windVal);
      for (let i = 0; i < this.count; i++) {
        this.x[i] += (this.speed[i] + absWind * 1.5) * speedMult * dir;
        this.y[i] += Math.sin(now * 0.0004 + this.wobble[i]) * this.wobbleAmp[i];
        this.rotation[i] += this.rotSpeed[i] * speedMult;
        if ((dir > 0 && this.x[i] > width + 150) || (dir < 0 && this.x[i] < -150)) {
          this.x[i] = dir > 0 ? -80 - Math.random() * 300 : width + 80 + Math.random() * 300;
          this.y[i] = Math.random() * height;
          this.speed[i] = Math.random() * 3 + 3;
          this.type[i] = Math.floor(Math.random() * 5);
        }
        if (this.y[i] < -30) this.y[i] = height + 20;
        if (this.y[i] > height + 30) this.y[i] = -20;
      }
    },
    drawAll(ctx: CanvasRenderingContext2D) {
      for (let i = 0; i < this.count; i++) {
        const sz = this.size[i];
        ctx.save();
        ctx.globalAlpha = this.opacity[i];
        ctx.translate(this.x[i], this.y[i]);
        ctx.rotate(this.rotation[i]);
        const t = this.type[i];
        if (t === 0) {
          ctx.strokeStyle = 'rgb(100, 75, 40)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-sz * 1.5, 0);
          ctx.lineTo(sz * 1.5, 0);
          ctx.moveTo(sz * 0.3, 0);
          ctx.lineTo(sz * 0.8, -sz * 0.5);
          ctx.moveTo(-sz * 0.4, 0);
          ctx.lineTo(-sz * 0.7, sz * 0.4);
          ctx.stroke();
        } else if (t === 1) {
          ctx.fillStyle = 'rgb(130, 110, 60)';
          ctx.beginPath();
          ctx.moveTo(0, -sz * 0.6);
          ctx.quadraticCurveTo(sz * 0.8, -sz * 0.2, sz * 0.3, sz * 0.5);
          ctx.quadraticCurveTo(0, sz * 0.3, -sz * 0.3, sz * 0.5);
          ctx.quadraticCurveTo(-sz * 0.8, -sz * 0.2, 0, -sz * 0.6);
          ctx.fill();
          ctx.strokeStyle = 'rgb(100, 85, 45)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(0, -sz * 0.5);
          ctx.lineTo(0, sz * 0.4);
          ctx.stroke();
        } else if (t === 2) {
          ctx.fillStyle = 'rgb(120, 100, 75)';
          ctx.beginPath();
          ctx.moveTo(-sz * 0.3, -sz * 0.4);
          ctx.lineTo(sz * 0.4, -sz * 0.3);
          ctx.lineTo(sz * 0.5, sz * 0.2);
          ctx.lineTo(sz * 0.1, sz * 0.4);
          ctx.lineTo(-sz * 0.4, sz * 0.3);
          ctx.lineTo(-sz * 0.5, -sz * 0.1);
          ctx.closePath();
          ctx.fill();
        } else if (t === 3) {
          ctx.fillStyle = 'rgba(170, 160, 140, 0.6)';
          ctx.beginPath();
          const flutter = Math.sin(this.rotation[i] * 3) * sz * 0.2;
          ctx.moveTo(-sz * 0.6, -sz * 0.3 + flutter);
          ctx.lineTo(sz * 0.5, -sz * 0.4);
          ctx.quadraticCurveTo(sz * 0.7, 0, sz * 0.4, sz * 0.3);
          ctx.lineTo(-sz * 0.5, sz * 0.2 - flutter);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgb(140, 115, 75)';
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sz * 0.25, sz * 0.15, sz * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-sz * 0.2, -sz * 0.1, sz * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    clear() {
      this.count = 0;
    },
  };

  const GROUND_SAND_POOL = 60;
  const groundSand = {
    x: new Float32Array(GROUND_SAND_POOL),
    y: new Float32Array(GROUND_SAND_POOL),
    vx: new Float32Array(GROUND_SAND_POOL),
    size: new Float32Array(GROUND_SAND_POOL),
    life: new Float32Array(GROUND_SAND_POOL),
    count: 0,
    spawn(windVal: number) {
      if (this.count >= GROUND_SAND_POOL) return;
      const i = this.count++;
      this.x[i] = Math.random() * width;
      this.y[i] = groundLevel - Math.random() * 10;
      this.vx[i] = (windVal >= 0 ? 1 : -1) * (Math.random() * 3 + 1);
      this.size[i] = Math.random() * 8 + 4;
      this.life[i] = 1.0;
    },
    update() {
      let i = 0;
      while (i < this.count) {
        this.x[i] += this.vx[i];
        this.y[i] -= 0.2;
        this.life[i] -= 0.02;
        if (this.life[i] <= 0) {
          const last = this.count - 1;
          if (i < last) {
            this.x[i] = this.x[last];
            this.y[i] = this.y[last];
            this.vx[i] = this.vx[last];
            this.size[i] = this.size[last];
            this.life[i] = this.life[last];
          }
          this.count--;
        } else {
          i++;
        }
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      if (this.count === 0) return;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = 'rgb(160, 130, 80)';
      ctx.beginPath();
      for (let i = 0; i < this.count; i++) {
        const r = this.size[i] * this.life[i];
        ctx.moveTo(this.x[i] + r, this.y[i]);
        ctx.arc(this.x[i], this.y[i], r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    clear() {
      this.count = 0;
    },
  };

  // 闪电系统
  class Lightning {
    life: number;
    x: number;
    segments: { x: number; y: number }[][];
    alpha: number;

    constructor() {
      this.x = Math.random() * width;
      this.life = 15 + Math.random() * 10;
      this.alpha = 1;
      this.segments = [];
      this.createBolt(this.x, 0, height, 100, 0);
    }

    createBolt(startX: number, startY: number, maxY: number, maxOffset: number, depth: number) {
      let currentX = startX;
      let currentY = startY;
      const path: { x: number; y: number }[] = [{ x: currentX, y: currentY }];
      let branchCount = 0;

      while (currentY < maxY) {
        const stepY = Math.random() * 40 + 20;
        currentY += stepY;
        const offset = (Math.random() - 0.5) * maxOffset;
        currentX += offset;
        path.push({ x: currentX, y: currentY });

        if (depth === 0 && Math.random() < 0.12 && maxY - currentY > 150 && branchCount < 3) {
          const branchHeight = currentY + Math.random() * 250 + 100;
          this.createBolt(currentX, currentY, branchHeight, maxOffset * 0.6, depth + 1);
          branchCount++;
        }
      }
      this.segments.push(path);
    }

    update() {
      this.life--;
    }

    draw(ctx: CanvasRenderingContext2D) {
      if (this.life <= 0) return;
      const flicker = Math.random();
      if (flicker > 0.8) return;
      let drawAlpha = this.alpha;
      if (this.life < 10) drawAlpha = this.life / 10;

      ctx.strokeStyle = `rgba(180, 210, 255, ${drawAlpha * 0.3})`;
      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        ctx.lineWidth = i === 0 ? 8 : 4;
        ctx.beginPath();
        for (let j = 0; j < seg.length; j++) {
          const p = seg[j];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(230, 245, 255, ${drawAlpha})`;
      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        ctx.lineWidth = i === 0 ? 2.5 : 1.0;
        ctx.beginPath();
        for (let j = 0; j < seg.length; j++) {
          const p = seg[j];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }
  }

  // 动画状态
  let snows: SnowFlake[] = [];
  let snowPile: SnowPile | null = null;
  let lightnings: Lightning[] = [];
  let fogs: FogPuff[] = [];
  let nextLightningAt = 0;
  let flashOpacity = 0;
  let lightningCount = 0;

  const getNextLightningDelayMs = () => {
    const extraDelay = Math.min(lightningCount * 2000, 20000);
    lightningCount++;
    return 6000 + extraDelay + Math.random() * 8000;
  };

  // 晴天镜头光晕数据
  const halos: {
    distance: number;
    size: number;
    opacity: number;
    color: string;
    offsetY: number;
  }[] = [];

  const initParticles = () => {
    rainData.clear();
    splashPool.clear();
    hailData.clear();
    hailBounce.clear();
    groundIce.clear();
    sandData.clear();
    debrisData.clear();
    groundSand.clear();
    snows = [];
    snowPile = null;
    lightnings = [];
    fogs = [];
    halos.length = 0;
    flashOpacity = 0;
    lightningCount = 0;

    const { particleCount = 100, hailCount = 30 } = configRef.value;
    const weather = props.weather;

    if (weather === 'rainy') {
      rainData.setCount(particleCount);
      nextLightningAt = performance.now() + getNextLightningDelayMs();
    } else if (weather === 'snowy') {
      snowPile = new SnowPile();
      for (let i = 0; i < particleCount; i++) {
        snows.push(new SnowFlake());
      }
    } else if (weather === 'foggy') {
      const fogCount = 10;
      for (let i = 0; i < fogCount; i++) {
        fogs.push(new FogPuff());
      }
    } else if (weather === 'hail') {
      rainData.setCount(Math.min(particleCount, 30));
      hailData.setCount(hailCount);
      nextLightningAt = performance.now() + getNextLightningDelayMs();
    } else if (weather === 'sandstorm') {
      sandData.setCount(Math.floor(particleCount * 1.5));
      debrisData.setCount(Math.min(Math.floor(particleCount * 0.12), MAX_DEBRIS));
    } else if (weather === 'sunny') {
      // 初始化更精细的镜头光晕元素
      const counts = 6;
      for (let i = 0; i < counts; i++) {
        halos.push({
          distance: 0.2 + i * 0.25 + (Math.random() - 0.5) * 0.1,
          size: 20 + Math.random() * 60 + (i === 1 ? 80 : 0),
          opacity: 0.02 + Math.random() * 0.04,
          color: i % 3 === 0 ? '255, 253, 235' : (i % 3 === 1 ? '255, 249, 196' : '230, 245, 255'),
          offsetY: (Math.random() - 0.5) * 40
        });
      }
    }
  };

  initParticlesFn = initParticles;
  initParticles();

  // 动画循环
  let fpsFrameCount = 0;
  let fpsLastTime = performance.now();
  let thunderTriggerOnce = false;

  const animate = () => {
    ctx.clearRect(0, 0, width, height);
    const now = performance.now();

    fpsFrameCount++;

    const { intensity = 1, time = 12, thunder = false, wind: windVal = 0, speed: speedMult = 1 } = configRef.value;

    // 计算暗度
    let darkness = 0;
    if (time < 6 || time > 18) {
      if (time < 6) {
        darkness = 0.85 * (1 - time / 6);
      } else {
        darkness = 0.85 * ((time - 18) / 6);
      }
    } else {
      darkness = 0;
    }

    if (props.weather !== 'sunny') {
      darkness *= 0.6;
    }

    if (darkness > 0.01) {
      ctx.fillStyle = `rgba(5, 5, 20, ${darkness})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 闪光
    if (flashOpacity > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
      ctx.fillRect(0, 0, width, height);
      flashOpacity -= 0.05;
      if (flashOpacity < 0) flashOpacity = 0;
    }

    // 天气渲染
    if (props.weather === 'rainy') {
      rainData.setCount(configRef.value.particleCount || 100);
      rainData.updateAll(windVal, speedMult);
      rainData.drawAll(ctx, windVal);
      splashPool.update();
      splashPool.draw(ctx);

      // 雷声
      if (thunder) {
        if (thunderTriggerOnce) {
          flashOpacity = 0.6 + Math.random() * 0.4;
          lightnings.push(new Lightning());
          nextLightningAt = now + getNextLightningDelayMs();
          thunderTriggerOnce = false;
        }
        if (now >= nextLightningAt) {
          flashOpacity = 0.6 + Math.random() * 0.4;
          lightnings.push(new Lightning());
          nextLightningAt = now + getNextLightningDelayMs();
        }
      } else {
        thunderTriggerOnce = false;
      }

      for (let i = lightnings.length - 1; i >= 0; i--) {
        const l = lightnings[i];
        l.update();
        l.draw(ctx);
        if (l.life <= 0) lightnings.splice(i, 1);
      }
    } else if (props.weather === 'snowy') {
      const particleCount = configRef.value.particleCount || 100;
      if (snows.length < particleCount) {
        for (let i = 0; i < particleCount - snows.length; i++) {
          snows.push(new SnowFlake());
        }
      } else if (snows.length > particleCount) {
        snows.splice(0, snows.length - particleCount);
      }

      snows.forEach((flake) => {
        flake.update(snowPile);
        flake.draw(ctx);
      });

      if (snowPile) {
        snowPile.update();
        snowPile.draw(ctx);
      }
    } else if (props.weather === 'foggy') {
      const fogDensity = configRef.value.fogDensity || 0.5;
      if (fogDensity > 0.05) {
        ctx.globalAlpha = fogDensity * 0.5;
        ctx.fillStyle = 'rgb(180, 195, 210)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }
      updateFogs(fogs, now, windVal);
      drawFogs(fogs, fogDensity);
    } else if (props.weather === 'hail') {
      const particleCount = configRef.value.particleCount || 100;
      const hailCount = configRef.value.hailCount || 30;
      const rainCount = Math.max(0, Math.min(30, particleCount));

      if (thunder) {
        if (thunderTriggerOnce) {
          flashOpacity = 0.6 + Math.random() * 0.4;
          lightnings.push(new Lightning());
          nextLightningAt = now + getNextLightningDelayMs();
          thunderTriggerOnce = false;
        }
        if (now >= nextLightningAt) {
          flashOpacity = 0.6 + Math.random() * 0.4;
          lightnings.push(new Lightning());
          nextLightningAt = now + getNextLightningDelayMs();
        }
      } else {
        thunderTriggerOnce = false;
      }

      for (let i = lightnings.length - 1; i >= 0; i--) {
        const l = lightnings[i];
        l.update();
        l.draw(ctx);
        if (l.life <= 0) lightnings.splice(i, 1);
      }

      if (rainCount > 0) {
        rainData.setCount(rainCount);
        rainData.updateAll(windVal, speedMult * 0.6);
        rainData.drawAll(ctx, windVal);
        splashPool.update();
        splashPool.draw(ctx);
      } else {
        rainData.setCount(0);
      }

      groundIce.update(rainCount);
      groundIce.draw(ctx);

      hailData.setCount(Math.min(hailCount, MAX_HAIL));
      hailData.updateAll(windVal, speedMult);
      hailData.drawAll(ctx);

      hailBounce.update();
      hailBounce.draw(ctx);
    } else if (props.weather === 'sandstorm') {
      const particleCount = configRef.value.particleCount || 100;
      const sandDensity = configRef.value.sandDensity || 0.6;

      const tintAlpha = sandDensity * 0.25;
      if (tintAlpha > 0.01) {
        ctx.fillStyle = `rgba(180, 140, 70, ${tintAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      sandData.setCount(Math.floor(particleCount * 1.5));
      sandData.updateAll(windVal, 1, now);
      sandData.drawAll(ctx);

      debrisData.setCount(Math.min(Math.floor(particleCount * 0.12), MAX_DEBRIS));
      debrisData.updateAll(windVal, 1, now);
      debrisData.drawAll(ctx);

      if (Math.random() < 0.05) {
        groundSand.spawn(windVal);
      }
      groundSand.update();
      groundSand.draw(ctx);

      if (sandDensity >= 0.3) {
        const bandStrength = (sandDensity - 0.3) / 0.7;
        const bandAlpha = 0.12 + bandStrength * 0.35;
        const topH = 80 + bandStrength * 120;
        const topGrad = ctx.createLinearGradient(0, 0, 0, topH);
        topGrad.addColorStop(0, `rgba(120, 90, 40, ${bandAlpha})`);
        topGrad.addColorStop(0.2, `rgba(130, 100, 48, ${bandAlpha * 0.7})`);
        topGrad.addColorStop(0.5, `rgba(140, 110, 55, ${bandAlpha * 0.3})`);
        topGrad.addColorStop(0.8, `rgba(145, 115, 60, ${bandAlpha * 0.08})`);
        topGrad.addColorStop(1, 'rgba(145, 115, 60, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, width, topH);

        const botH = 80 + bandStrength * 120;
        const bottomGrad = ctx.createLinearGradient(0, height - botH, 0, height);
        bottomGrad.addColorStop(0, 'rgba(155, 120, 55, 0)');
        bottomGrad.addColorStop(0.2, `rgba(155, 120, 55, ${bandAlpha * 0.08})`);
        bottomGrad.addColorStop(0.5, `rgba(150, 115, 50, ${bandAlpha * 0.3})`);
        bottomGrad.addColorStop(0.8, `rgba(145, 108, 42, ${bandAlpha * 0.7})`);
        bottomGrad.addColorStop(1, `rgba(140, 100, 35, ${bandAlpha})`);
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, height - botH, width, botH);
      }
    } else if (props.weather === 'sunny') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      const sourceX = width * 0.7;
      const sourceY = -100;
      const centerY = height / 2;
      const centerX = width / 2;
      
      // 1. 绘制太阳光束（已有）
      const beamCount = 3;
      const baseAngle = Math.PI / 5 + windVal * 0.1;
      
      for (let i = 0; i < beamCount; i++) {
        const offset = Math.sin(now * 0.0005 + i * 2) * 0.15;
        const angle = baseAngle + offset;
        const alpha = 0.04 + Math.sin(now * 0.0008 + i) * 0.03;
        
        const cx = sourceX + Math.sin(now * 0.0003 + i) * 150 - i * width * 0.2;
        const cy = sourceY;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        
        const beamWidth = 150 + i * 80;
        const beamGrad = ctx.createLinearGradient(-beamWidth, 0, beamWidth, 0);
        beamGrad.addColorStop(0, 'rgba(255, 250, 220, 0)');
        beamGrad.addColorStop(0.5, `rgba(255, 245, 200, ${alpha})`);
        beamGrad.addColorStop(1, 'rgba(255, 250, 220, 0)');
        
        ctx.fillStyle = beamGrad;
        ctx.fillRect(-beamWidth * 1.5, 0, beamWidth * 3, height * 2.5);
        ctx.restore();
      }

      // 2. 绘制镜头光晕（新增）
      halos.forEach((halo, idx) => {
        // 计算太阳到中心连线上的位置
        const dx = (centerX - sourceX) * halo.distance;
        const dy = (centerY - sourceY) * halo.distance;
        
        // 加入轻微呼吸动效
        const driftX = Math.sin(now * 0.0004 + idx) * 15;
        const driftY = Math.cos(now * 0.0005 + idx) * 15 + Math.sin(now * 0.0008) * 10;
        
        const hx = sourceX + dx + driftX;
        const hy = sourceY + dy + driftY + halo.offsetY;
        
        const breathing = Math.sin(now * 0.001 + idx) * 0.15 + 0.85;
        const currentSize = halo.size * breathing;
        const currentOpacity = halo.opacity * breathing;
        
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, currentSize);
        grad.addColorStop(0.0, `rgba(${halo.color}, ${currentOpacity})`);
        grad.addColorStop(0.6, `rgba(${halo.color}, ${currentOpacity * 0.4})`);
        grad.addColorStop(1.0, `rgba(${halo.color}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, currentSize, 0, Math.PI * 2);
        ctx.fill();

        // 某些光晕可选的锐利光环
        if (idx === 1 || idx === 3) {
            ctx.strokeStyle = `rgba(${halo.color}, ${currentOpacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(hx, hy, currentSize * 0.95, 0, Math.PI * 2);
            ctx.stroke();
        }
      });
      
      ctx.restore();
    }

    requestRef.value = requestAnimationFrame(animate);
  };

  requestRef.value = requestAnimationFrame(animate);

  const handleResize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    groundLevel = height - 4;
    canvas.width = width;
    canvas.height = height;
  };

  window.addEventListener('resize', handleResize);

  onBeforeUnmount(() => {
    if (requestRef.value) {
      cancelAnimationFrame(requestRef.value);
    }
    window.removeEventListener('resize', handleResize);
  });
});
</script>

<style scoped></style>