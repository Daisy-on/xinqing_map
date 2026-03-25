declare global {
  interface BMapGLLngLat {
    lng: number
    lat: number
  }

  interface BMapGLClickEvent {
    point?: BMapGLLngLat
    latlng?: BMapGLLngLat
  }

  interface BMapGLMarker {}
  interface BMapGLPolyline {}
  interface BMapGLPolygon {}

  interface BMapGLMap {
    centerAndZoom(point: BMapGLPoint, zoom: number): void
    panTo(point: BMapGLPoint): void
    getZoom(): number
    setMinZoom(zoom: number): void
    setMaxZoom(zoom: number): void
    addControl(control: unknown): void
    enableScrollWheelZoom(enabled: boolean): void
    disableDragging(): void
    enableDragging(): void
    addOverlay(overlay: unknown): void
    removeOverlay(overlay: unknown): void
    clearOverlays(): void
    addEventListener(type: string, handler: (event: any) => void): void
    removeEventListener(type: string, handler: (event: any) => void): void
    setDisplayOptions(options: {
      poi?: boolean
      poiText?: boolean
      poiIcon?: boolean
      building?: boolean
    }): void
    pointToPixel(point: BMapGLPoint): { x: number; y: number }
    getCenter(): { lng: number; lat: number }
  }

  interface BMapGLPoint {}

  interface BMapGLNamespace {
    Map: new (container: string | HTMLElement, options?: Record<string, unknown>) => BMapGLMap
    Point: new (lng: number, lat: number) => BMapGLPoint
    Marker: new (point: BMapGLPoint) => BMapGLMarker
    Polyline: new (points: BMapGLPoint[], options?: Record<string, unknown>) => BMapGLPolyline
    Polygon: new (points: BMapGLPoint[] | BMapGLPoint[][], options?: Record<string, unknown>) => BMapGLPolygon
    NavigationControl: new () => unknown
    ScaleControl: new () => unknown
  }

  interface Window {
    BMapGL?: BMapGLNamespace
  }
}

export {}
