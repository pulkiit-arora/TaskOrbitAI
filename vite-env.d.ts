/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BUILD_TIME: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
