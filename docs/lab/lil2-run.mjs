import {Markdown, GFM, MATH, KATEX} from './lil2-full.mjs'
import {createElement, renderToString} from './vendor.mjs'
export const run = md => renderToString(createElement(Markdown, {plugins: [GFM, MATH, KATEX]}, md))
