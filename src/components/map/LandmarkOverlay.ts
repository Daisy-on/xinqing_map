import { createApp, h } from 'vue'
import type { App } from 'vue'
import LandmarkCard from './LandmarkCard.vue'
import type { Location } from '@/types/models'

export interface LandmarkOverlayInstance {
  initialize: (map: BMapGLMap) => HTMLElement
  draw: () => void
  destroy: () => void
}

type OverlayCtor = new (point: BMapGLPoint, location: Location) => LandmarkOverlayInstance

export function createLandmarkOverlayClass(api: BMapGLNamespace): OverlayCtor {
  class LandmarkOverlay extends (api.Overlay as unknown as new () => BMapGLOverlay) {
    private point: BMapGLPoint
    private location: Location
    private map: BMapGLMap | null = null
    private node: HTMLDivElement | null = null
    private app: App | null = null

    constructor(point: BMapGLPoint, location: Location) {
      super()
      this.point = point
      this.location = location
    }

    initialize(map: BMapGLMap): HTMLElement {
      this.map = map
      const node = document.createElement('div')
      node.style.position = 'absolute'
      node.style.pointerEvents = 'none'
      node.style.zIndex = String(api.Overlay.getZIndex(this.location.lat))

      this.app = createApp({
        render: () => h(LandmarkCard, { location: this.location }),
      })
      this.app.mount(node)

      map.getPanes().labelPane.appendChild(node)
      this.node = node
      return node
    }

    draw(): void {
      if (!this.map || !this.node) return
      const pixel = this.map.pointToOverlayPixel(this.point)
      const cardWidth = this.node.offsetWidth || 110
      const cardHeight = this.node.offsetHeight || 40

      this.node.style.left = `${pixel.x - cardWidth / 2}px`
      this.node.style.top = `${pixel.y - cardHeight - 8}px`
    }

    destroy(): void {
      if (this.app) {
        this.app.unmount()
      }
      if (this.node?.parentNode) {
        this.node.parentNode.removeChild(this.node)
      }
      this.app = null
      this.node = null
      this.map = null
    }
  }

  return LandmarkOverlay as unknown as OverlayCtor
}
