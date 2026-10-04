// node bench/chat/build.mjs: the chat benchmark's browser modules, from this repo's own dependencies, into bench/chat/site/:
// one React 19 (vendor.mjs: react, react-dom client and server, the JSX runtime) shared by both libraries, KaTeX
// (katex.mjs), react-markdown 10.1.0 with remark-gfm, remark-math and rehype-katex (upstream.mjs), and this
// package's browser build of the /full flavor (lil2.mjs).
import {build} from 'esbuild'
import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises'
const here = new URL('.', import.meta.url).pathname, out = `${here}site/`
await mkdir(out, {recursive: true})
const shared = {name: 'shared', setup(b) {
  b.onResolve({filter: /^(react|react\/jsx-runtime|react-dom|react-dom\/client)$/}, () => ({path: './vendor.mjs', external: true}))
  b.onResolve({filter: /^katex$/}, () => ({path: './katex.mjs', external: true}))
}}
const common = {bundle: true, format: 'esm', platform: 'browser', minify: true, legalComments: 'none', define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning'}
await build({...common, stdin: {contents: `export {Fragment, createElement, memo, useEffect, useState} from 'react'; export {jsx, jsxs} from 'react/jsx-runtime'; export {createRoot} from 'react-dom/client'; export {flushSync} from 'react-dom'`, resolveDir: here}, outfile: `${out}vendor.mjs`})
await build({...common, stdin: {contents: `export {default} from 'katex'; export * from 'katex'`, resolveDir: here}, outfile: `${out}katex.mjs`})
await build({...common, plugins: [shared], stdin: {contents: `export {default as Markdown} from 'react-markdown'; export {default as remarkGfm} from 'remark-gfm'; export {default as remarkMath} from 'remark-math'; export {default as rehypeKatex} from 'rehype-katex'`, resolveDir: here}, outfile: `${out}upstream.mjs`})
const full = await readFile(new URL('../../dist/browser/full.js', import.meta.url), 'utf8')
await writeFile(`${out}lil2.mjs`, full.replace(/from"react\/jsx-runtime"/g, 'from"./vendor.mjs"').replace(/from"katex"/g, 'from"./katex.mjs"'))
for (const file of ['chat.js', 'conversation.js', 'chat.html']) await copyFile(`${here}${file}`, `${out}${file}`)
console.log('bench/chat/site: vendor.mjs, katex.mjs, upstream.mjs, lil2.mjs')
