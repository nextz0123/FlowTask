/**
 * Versão da app.
 *
 * Regra: sempre que houver uma alteração visível, sobe a versão.
 *   - PATCH (1.0.1): correções pequenas
 *   - MINOR (1.1.0): funcionalidades novas
 *   - MAJOR (2.0.0): mudanças grandes
 *
 * Este valor aparece no ecrã do Login e no fundo da app,
 * e é enviado para o APK (android/app/build.gradle → versionName).
 */
export const APP_VERSION = '1.1.0'

/** Data desta versão (formato legível). */
export const APP_VERSION_DATE = '7 de novembro de 2026'

/** Nome para mostrar em conjunto com a versão. */
export const APP_NAME = 'FlowTask'

/** Linha pronta a mostrar: "FlowTask v1.1.0" */
export const APP_VERSION_LABEL = `${APP_NAME} v${APP_VERSION}`
