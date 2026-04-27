let scriptPromise: Promise<BMapGLNamespace> | null = null;

// AI辅助生成：Kimi-K2.5, 2026-3-25
export function loadBaiduMapGL(ak: string): Promise<BMapGLNamespace> {
  if (scriptPromise) {
    return scriptPromise as Promise<BMapGLNamespace>;
  }

  if (window.BMapGL) {
    return Promise.resolve(window.BMapGL);
  }

  scriptPromise = new Promise((resolve, reject) => {
    window._initBaiduMapGL = () => {
      resolve(window.BMapGL!);
      delete window._initBaiduMapGL;
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${ak}&callback=_initBaiduMapGL`;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('百度地图脚本加载失败，请检查网络或 AK 配置'));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}
