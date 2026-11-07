import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pt.flowtask.app',
  appName: 'FlowTask',
  // O Capacitor copia o conteúdo de "dist" (o build do Vite) para dentro do APK.
  webDir: 'dist',
  android: {
    // A app carrega os ficheiros locais, mas fala com a Supabase pela rede.
    allowMixedContent: false,
  },
  server: {
    // Mantém a app a usar ficheiros locais (mais rápido e funciona offline na abertura).
    androidScheme: 'https',
  },
  plugins: {
    // Ecrã de abertura: desvanece suavemente em vez de desaparecer de repente.
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#f2f2f7',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    // A barra de estado acompanha o tema da app (claro/escuro).
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f2f2f7',
      overlaysWebView: true,
    },
  },
}

export default config
