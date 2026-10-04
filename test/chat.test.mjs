// A streamed chat in real browsers: react-markdown (with remark-gfm, remark-math, rehype-katex) and this package's
// /full flavor render the same conversation into the DOM through React, update by update, as a chat app streams a
// reply. The streaming message's DOM must be identical after every update, in Chromium and Firefox.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname, join, normalize} from 'node:path'
import {test} from 'node:test'
import * as playwright from 'playwright-core'

execFileSync('node', [new URL('../bench/chat/build.mjs', import.meta.url).pathname], {stdio: 'ignore'})
const site = new URL('../bench/chat/site/', import.meta.url).pathname
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript'}
const server = createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  if (path === '/') path = '/chat.html'
  try { const body = await readFile(join(site, path)); res.writeHead(200, {'content-type': types[extname(path)] ?? 'application/octet-stream'}); res.end(body) } catch { res.writeHead(404); res.end() }
}).listen(0)
const origin = `http://127.0.0.1:${server.address().port}`
const turns = 6

for (const name of ['chromium', 'firefox']) {
  test(`streamed chat in ${name}: every update renders the same DOM as react-markdown`, async () => {
    const browser = await playwright[name].launch()
    try {
      const prints = {}
      for (const lane of ['react-markdown', 'lil2']) {
        const page = await browser.newPage(), errors = []
        page.on('pageerror', e => errors.push(String(e)))
        await page.goto(`${origin}/`)
        await page.waitForFunction(() => window.chat)
        await page.evaluate(([lane, turns]) => window.chat.setup(lane, {turns}), [lane, turns])
        prints[lane] = []
        for (let i = 0; i < turns; i++) prints[lane].push(...(await page.evaluate(i => window.chat.turn(i, {fingerprint: true}), i)).prints)
        assert.deepEqual(errors, [], lane)
        await page.close()
      }
      assert.ok(prints.lil2.length > 1000, `${prints.lil2.length} updates`)
      assert.deepEqual(prints.lil2, prints['react-markdown'])
    } finally {
      await browser.close()
    }
  })
}
test.after(() => server.close())
