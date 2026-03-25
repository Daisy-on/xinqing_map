declare global {
  interface BMapGLMap {
    centerAndZoom(point: BMapGLPoint, zoom: number): void
    addControl(control: unknown): void
    enableScrollWheelZoom(enabled: boolean): void
    clearOverlays(): void
  }

  interface BMapGLPoint {}

  interface BMapGLNamespace {
    Map: new (container: string | HTMLElement) => BMapGLMap
    Point: new (lng: number, lat: number) => BMapGLPoint
    NavigationControl: new () => unknown
    ScaleControl: new () => unknown
  }

  interface Window {
    BMapGL?: BMapGLNamespace
  }
}

export {}
