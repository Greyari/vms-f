import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const idPath = path.join(rootDir, 'src', 'i18n', 'locales', 'id.json')
const enPath = path.join(rootDir, 'src', 'i18n', 'locales', 'en.json')

if (!fs.existsSync(idPath) || !fs.existsSync(enPath)) {
  console.error('Error: Locale files not found!')
  process.exit(1)
}

const id = JSON.parse(fs.readFileSync(idPath, 'utf8'))
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))

function getFlatKeys(obj, prefix = '') {
  let keys = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getFlatKeys(v, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

const idKeys = new Set(getFlatKeys(id))
const enKeys = new Set(getFlatKeys(en))

console.log(`\n=========================================`)
console.log(`--- [i18n CHECK: KEY PARITY AUDIT] ---`)
console.log(`=========================================`)
console.log(`Total ID keys: ${idKeys.size}`)
console.log(`Total EN keys: ${enKeys.size}`)

const missingInEn = [...idKeys].filter((k) => !enKeys.has(k))
const missingInId = [...enKeys].filter((k) => !idKeys.has(k))

let hasError = false

if (missingInEn.length > 0) {
  console.error(`\n❌ Keys in id.json but missing in en.json (${missingInEn.length}):`)
  missingInEn.slice(0, 20).forEach((k) => console.error(`  - ${k}`))
  if (missingInEn.length > 20) console.error(`  ... and ${missingInEn.length - 20} more`)
  hasError = true
}

if (missingInId.length > 0) {
  console.error(`\n❌ Keys in en.json but missing in id.json (${missingInId.length}):`)
  missingInId.slice(0, 20).forEach((k) => console.error(`  - ${k}`))
  if (missingInId.length > 20) console.error(`  ... and ${missingInId.length - 20} more`)
  hasError = true
}

if (!hasError) {
  console.log(`✅ [OK] id.json and en.json key parity is 100% matched!`)
}

console.log(`\n=========================================`)
console.log(`--- [i18n CHECK: CODEBASE SCAN] ---`)
console.log(`=========================================`)

function getFiles(dir, exts = ['.ts', '.tsx']) {
  let files = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === 'dist' || item.name === '.git') continue
      files = files.concat(getFiles(full, exts))
    } else if (item.isFile() && exts.some((ext) => item.name.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

const srcDir = path.join(rootDir, 'src')
const srcFiles = getFiles(srcDir)
console.log(`Scanning ${srcFiles.length} source files in src/ ...`)

const usedKeys = new Map() // key -> Set(file paths)
const tCallRegex = /\bt\(\s*["'`]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)["'`]/g

for (const file of srcFiles) {
  const code = fs.readFileSync(file, 'utf8')
  let m
  while ((m = tCallRegex.exec(code)) !== null) {
    const key = m[1]
    if (!usedKeys.has(key)) {
      usedKeys.set(key, new Set())
    }
    const relFile = path.relative(rootDir, file)
    usedKeys.get(key).add(relFile)
  }
}

console.log(`Detected ${usedKeys.size} distinct static translation key calls.`)

const missingDefinedKeys = []
for (const [key, files] of usedKeys.entries()) {
  if (!idKeys.has(key)) {
    missingDefinedKeys.push({ key, files: [...files] })
  }
}

if (missingDefinedKeys.length > 0) {
  console.error(`\n❌ Keys used in code but missing in locale files (${missingDefinedKeys.length}):`)
  for (const item of missingDefinedKeys) {
    console.error(`  - ${item.key} (used in: ${item.files.join(', ')})`)
  }
  hasError = true
} else {
  console.log(`✅ [OK] All static translation keys called in code are defined in locale files!`)
}

console.log(`\n=========================================`)
console.log(`--- [i18n CHECK: UNUSED KEYS REPORT] ---`)
console.log(`=========================================`)

const unusedKeys = [...idKeys].filter((k) => !usedKeys.has(k))
console.log(`ℹ️ Unused keys in locales (available for dynamic use/enums): ${unusedKeys.length} keys.`)

if (hasError) {
  console.error(`\n💥 i18n:check failed with errors. Please fix missing keys above.`)
  process.exit(1)
} else {
  console.log(`\n🎉 i18n:check completed successfully with ZERO errors!`)
  process.exit(0)
}
