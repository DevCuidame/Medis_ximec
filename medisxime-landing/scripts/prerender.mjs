// Post-build step: boots the built SPA in headless Chrome, scrolls it so every
// framer-motion `useInView` section fires, then bakes the resulting DOM back
// into dist/index.html. This is what lets crawlers that don't execute JS
// (GPTBot, ClaudeBot, PerplexityBot, and most other AI answer engines) see the
// real page content instead of an empty <div id="root">.
import { preview } from 'vite'
import puppeteer from 'puppeteer'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

async function main() {
  const server = await preview({
    root,
    preview: { port: 4321, strictPort: true, host: '127.0.0.1' },
  })
  const url = server.resolvedUrls.local[0]

  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(url, { waitUntil: 'networkidle0' })

    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const step = 400
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await sleep(70)
      }
      window.scrollTo(0, 0)
      await sleep(600)
    })

    const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML)
    const outPath = resolve(root, 'dist', 'index.html')
    writeFileSync(outPath, html, 'utf-8')
    console.log(`[prerender] wrote ${(html.length / 1024).toFixed(1)} KB -> dist/index.html`)
  } finally {
    await browser.close()
    await new Promise((resolveClose) => server.httpServer.close(resolveClose))
  }
}

main().catch((err) => {
  console.error('[prerender] failed:', err)
  process.exit(1)
})
