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

  interface BMapGLMap {
    centerAndZoom(point: BMapGLPoint, zoom: number): void
    addControl(control: unknown): void
    enableScrollWheelZoom(enabled: boolean): void
    addOverlay(overlay: unknown): void
    removeOverlay(overlay: unknown): void
    clearOverlays(): void
    addEventListener(type: 'click', handler: (event: BMapGLClickEvent) => void): void
    removeEventListener(type: 'click', handler: (event: BMapGLClickEvent) => void): void
  }

  interface BMapGLPoint {}

  interface BMapGLNamespace {
    Map: new (container: string | HTMLElement) => BMapGLMap
    Point: new (lng: number, lat: number) => BMapGLPoint
    Marker: new (point: BMapGLPoint) => BMapGLMarker
    NavigationControl: new () => unknown
    ScaleControl: new () => unknown
  }

  interface Window {
    BMapGL?: BMapGLNamespace
  }
}

export {}
