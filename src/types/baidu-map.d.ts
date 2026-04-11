declare global {
  interface BMapGLLngLat {
    lng: number
    lat: number
  }

  interface BMapGLPanes {
    labelPane: HTMLElement
  }

  interface BMapGLOverlay {
    initialize(map: BMapGLMap): HTMLElement
    draw(): void
  }

  interface BMapGLOverlayConstructor {
    new (): BMapGLOverlay
    getZIndex(lat: number): number
  }

  interface BMapGLPolygon {}

  interface BMapGLMap {
    centerAndZoom(point: BMapGLPoint, zoom: number): void
    panTo(point: BMapGLPoint): void
    getZoom(): number
    setMinZoom(zoom: number): void
    setMaxZoom(zoom: number): void
    setMapStyleV2(config: { styleJson: Array<Record<string, unknown>> }): void
    addControl(control: unknown): void
    enableScrollWheelZoom(enabled: boolean): void
    addOverlay(overlay: unknown): void
    removeOverlay(overlay: unknown): void
    addEventListener(type: string, handler: (event: unknown) => void): void
    removeEventListener(type: string, handler: (event: unknown) => void): void
    pointToPixel(point: BMapGLPoint): { x: number; y: number }
    pointToOverlayPixel(point: BMapGLPoint): { x: number; y: number }
    getCenter(): BMapGLLngLat
    getPanes(): BMapGLPanes
    clearOverlays(): void
  }

  interface BMapGLPoint {}

  interface BMapGLNamespace {
    Map: new (container: string | HTMLElement, options?: Record<string, unknown>) => BMapGLMap
    Point: new (lng: number, lat: number) => BMapGLPoint
    Polygon: new (points: BMapGLPoint[] | BMapGLPoint[][], options?: Record<string, unknown>) => BMapGLPolygon
    Overlay: BMapGLOverlayConstructor
    NavigationControl: new () => unknown
    ScaleControl: new () => unknown
  }

  interface Window {
    BMapGL?: BMapGLNamespace
  }
}

export {}
