#!/usr/bin/env node
import { writeFile } from 'fs/promises'
import { join } from 'path'

const BASE = 'https://www.subtitlecat.com'
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }

function srtToVtt(srt) {
  return 'WEBVTT\n\n' + srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .trim()
}

async function search(title, year) {
  const q = encodeURIComponent(`${title} ${year}`)
  const res = await fetch(`${BASE}/index.php?search=${q}`, { headers: HEADERS })
  const html = await res.text()

  const entries = []
  const blockRe = /<a href="(subs\/(\d+)\/([^"]+\.html))"[^>]*>[\s\S]*?<\/a>([\s\S]*?)(?=<a href="subs\/|$)/g
  let m

  while ((m = blockRe.exec(html)) !== null) {
    const [, path, id, filename, block] = m
    const langMatch = block.match(/(\d+)\s+lang/i) || block.match(/lang[^:]*:\s*(\d+)/i)
    const langCount = langMatch ? parseInt(langMatch[1]) : 0
    entries.push({ path, id, filename: filename.replace('.html', ''), langCount })
  }

  if (entries.length === 0) {
    const simpleRe = /href="(subs\/(\d+)\/([^"]+\.html))"/g
    while ((m = simpleRe.exec(html)) !== null) {
      entries.push({ path: m[1], id: m[2], filename: m[3].replace('.html', ''), langCount: 0 })
    }
  }

  return entries
}

async function getFrenchSrtUrl(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: HEADERS })
  const html = await res.text()

  const frRe = /href="([^"]*-fr\.srt)"/i
  const m = frRe.exec(html)
  if (!m) return null

  const url = m[1].startsWith('http') ? m[1] : `${BASE}${m[1].startsWith('/') ? '' : '/'}${m[1]}`
  return url
}

async function downloadSrt(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function main() {
  const [title, year, filmId] = process.argv.slice(2)

  if (!title || !year || !filmId) {
    console.error('Usage: node scripts/dl-subs.mjs "Titre" ANNEE film-id')
    console.error('Ex:    node scripts/dl-subs.mjs "Trafic" 1971 trafic')
    process.exit(1)
  }

  console.log(`Recherche: "${title} ${year}"...`)
  const entries = await search(title, year)

  if (entries.length === 0) {
    console.error('Aucun résultat trouvé sur subtitlecat.com')
    process.exit(1)
  }

  entries.sort((a, b) => b.langCount - a.langCount)

  console.log(`${entries.length} résultat(s) trouvé(s):`)
  entries.slice(0, 5).forEach((e, i) =>
    console.log(`  ${i + 1}. [${e.langCount} langues] ${e.filename}`)
  )

  let frUrl = null
  let chosen = null

  for (const entry of entries) {
    process.stdout.write(`  Vérification "${entry.filename}" (${entry.langCount} langues)... `)
    const url = await getFrenchSrtUrl(entry.path)
    if (!url) { console.log('pas de FR direct'); continue }
    try {
      const res = await fetch(url, { headers: HEADERS, method: 'HEAD' })
      if (!res.ok) { console.log(`FR lien mort (${res.status})`); continue }
      frUrl = url
      chosen = entry
      console.log('FR disponible ✓')
      break
    } catch { console.log('FR lien mort'); continue }
  }

  if (!frUrl) {
    console.error('\nAucun sous-titre français en téléchargement direct trouvé.')
    process.exit(1)
  }

  console.log(`\nSélectionné: ${chosen.filename}`)

  console.log(`Téléchargement: ${frUrl}`)
  const srt = await downloadSrt(frUrl)
  const vtt = srtToVtt(srt)

  const outPath = join(process.cwd(), 'public', 'subs', `${filmId}.fr.vtt`)
  await writeFile(outPath, vtt, 'utf8')
  console.log(`\nSauvegardé: public/subs/${filmId}.fr.vtt`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
