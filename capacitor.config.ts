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
}

export default config
