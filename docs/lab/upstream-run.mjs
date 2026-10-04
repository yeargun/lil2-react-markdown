import Markdown from './original-browser.mjs'
import {gfm, math, katex} from './plugins-original.mjs'
import {createElement, renderToString} from './vendor.mjs'
export const run = md => renderToString(createElement(Markdown, {remarkPlugins: [gfm, math], rehypePlugins: [katex]}, md))
