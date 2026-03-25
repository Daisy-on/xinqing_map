declare global {
  interface BMapGLLngLat {
    lng: number
    lat: number
  }

  interface BMapGLPolygon {}

  interface BMapGLMap {
    centerAndZoom(point: BMapGLPoint, zoom: number): void
    panTo(point: BMapGLPoint): void
    getZoom(): number
    setMinZoom(zoom: number): void
    setMaxZoom(zoom: number): void
    addControl(control: unknown): void
    enableScrollWheelZoom(enabled: boolean): void
    addOverlay(overlay: unknown): void
    removeOverlay(overlay: unknown): void
    addEventListener(type: string, handler: (event: unknown) => void): void
    removeEventListener(type: string, handler: (event: unknown) => void): void
    pointToPixel(point: BMapGLPoint): { x: number; y: number }
    getCenter(): BMapGLLngLat
    clearOverlays(): void
  }

  interface BMapGLPoint {}

  interface BMapGLNamespace {
    Map: new (container: string | HTMLElement, options?: Record<string, unknown>) => BMapGLMap
    Point: new (lng: number, lat: number) => BMapGLPoint
    Polygon: new (points: BMapGLPoint[] | BMapGLPoint[][], options?: Record<string, unknown>) => BMapGLPolygon
    NavigationControl: new () => unknown
    ScaleControl: new () => unknown
  }

  interface Window {
    BMapGL?: BMapGLNamespace
  }
}

export {}
