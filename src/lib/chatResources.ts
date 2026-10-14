import fs from "fs"
import path from "path"
import type { ChatDoc } from "@/lib/agronomistChat"

const DIR = path.join(process.cwd(), "chat-resources")
const OK = /\.(md|txt|csv|json)$/i
const SKIP = /(?:^|[/\\])readme\.md$/i
const MAX_FILE = 80_000
const MAX_TOTAL = 40_000

let cache: { at: number; docs: ChatDoc[] } | null = null

function walk(dir: string, acc: ChatDoc[]) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p, acc)
      continue
    }
    if (!OK.test(ent.name) || SKIP.test(p)) continue
    const rel = path.relative(DIR, p).replace(/\\/g, "/")
    const text = fs.readFileSync(p, "utf8").slice(0, MAX_FILE).trim()
    if (text) acc.push({ name: rel, text })
  }
}

export function loadChatResources(): ChatDoc[] {
  const now = Date.now()
  if (cache && now - cache.at < 8_000) return cache.docs
  const acc: ChatDoc[] = []
  walk(DIR, acc)
  let total = 0
  const docs: ChatDoc[] = []
  for (const d of acc) {
    if (total >= MAX_TOTAL) break
    const text = d.text.slice(0, MAX_TOTAL - total)
    total += text.length
    docs.push({ name: d.name, text })
  }
  cache = { at: now, docs }
  return docs
}

export function docsPrompt(docs: ChatDoc[]) {
  if (!docs.length) return "No extra documents are loaded."
  return docs.map((d) => `### ${d.name}\n${d.text}`).join("\n\n")
}
