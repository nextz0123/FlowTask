import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './admin.css'
import './ios.css'
import './polish.css'
import App from './App.tsx'
import { isNativeApp, setupNativePushHandlers } from './lib/native-push'
import { enableTapFeedback, setupNativeChrome } from './lib/native-ui'

// Notificações nativas (só dentro do APK Android).
// No browser este código não faz nada.
if (isNativeApp()) {
  void setupNativePushHandlers()
  // Aparência e sensações próprias de app nativa:
  // barra de estado, ecrã de abertura e vibração nos botões.
  void setupNativeChrome()
  enableTapFeedback()
} else {
  // Atualização automática da app (PWA).
  // Quando há uma versão nova publicada, recarrega sozinha — sem o utilizador
  // ter de limpar a cache ou desinstalar a app.
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // A versão nova já está disponível: aplica e recarrega.
      window.location.reload()
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Verifica se há atualizações a cada 60 segundos e ao voltar à app.
      setInterval(() => void registration.update(), 60_000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
