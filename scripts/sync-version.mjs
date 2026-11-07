// ============================================================
//  Sincroniza a versão da app por todos os ficheiros.
//
//  A fonte da verdade é src/lib/version.ts (APP_VERSION).
//  Este script propaga-a para:
//    - package.json            (version)
//    - android/app/build.gradle (versionName + versionCode)
//
//  Correr:  node scripts/sync-version.mjs
//  (o "pnpm cap:sync" corre isto automaticamente antes do build)
// ============================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ---------- Lê a versão de src/lib/version.ts ---------- */

const versionFile = join(root, 'src', 'lib', 'version.ts')
const versionSrc = readFileSync(versionFile, 'utf8')

const match = versionSrc.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)
if (!match) {
  console.error('❌ Não encontrei APP_VERSION em src/lib/version.ts')
  process.exit(1)
}

const version = match[1]
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`❌ Versão inválida: "${version}" — usa o formato 1.2.3`)
  process.exit(1)
}

/* ---------- versionCode ----------
   O Android exige um inteiro que só pode subir.
   Regra: major*10000 + minor*100 + patch
   Ex.: 1.1.0 -> 10100 · 1.2.0 -> 10200 · 2.0.0 -> 20000
*/

const [major, minor, patch] = version.split('.').map(Number)
const versionCode = major * 10000 + minor * 100 + patch

console.log(`Versão: ${version}  (versionCode ${versionCode})`)

/* ---------- package.json ---------- */

const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
let changed = 0

if (pkg.version !== version) {
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log(`✅ package.json → ${version}`)
  changed++
} else {
  console.log('•  package.json já estava certo')
}

/* ---------- android/app/build.gradle ---------- */

const gradlePath = join(root, 'android', 'app', 'build.gradle')

try {
  const gradle = readFileSync(gradlePath, 'utf8')

  const next = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`)

  if (next !== gradle) {
    writeFileSync(gradlePath, next, 'utf8')
    console.log(`✅ android/app/build.gradle → ${version} (${versionCode})`)
    changed++
  } else {
    console.log('•  android/app/build.gradle já estava certo')
  }
} catch {
  console.log('•  android/app/build.gradle não existe (ainda) — ignorado')
}

console.log(changed > 0 ? '\n🎉 Versão sincronizada.' : '\n🎉 Tudo já estava sincronizado.')
