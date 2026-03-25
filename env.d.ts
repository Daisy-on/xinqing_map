/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BMAP_AK: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
