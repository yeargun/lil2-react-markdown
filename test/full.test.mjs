// lil2-react-markdown/full renders like react-markdown with remark-gfm, remark-math and rehype-katex.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import Upstream from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkBreaks from 'remark-breaks'
import {jsx} from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'
import {formulas} from './formulas.mjs'
import {gfmCorpus} from './gfm-corpus.mjs'
const {Markdown, GFM, MATH, KATEX, BREAKS} = await import(new URL(process.env.LIL2_FULL ?? '../.dev/dist/full.js', import.meta.url))
console.warn = () => {}

const docs = [
  ...formulas.flatMap((f, i) => [
    {name: `inline ${i + 1}`, markdown: `Before $${f}$ after.`},
    {name: `display ${i + 1}`, markdown: `$$\n${f}\n$$`},
    {name: `fence ${i + 1}`, markdown: '```math\n' + f + '\n```'}
  ]),
  {name: 'math document', markdown: readFileSync(new URL('math-doc.md', import.meta.url), 'utf8')},
  {name: 'invalid style (trust)', markdown: 'Styled $\\htmlStyle{a}{x}$ and $\\htmlStyle{color:red}{y}$ and $\\htmlStyle{b:;c}{z}$.'},
  {name: 'gfm and math', markdown: '| a | $b$ |\n| - | - |\n| ~~c~~ | $$d$$ |\n\n- [x] $e$\n\nwww.x.com $f$[^1]\n\n[^1]: $g$'},
  ...gfmCorpus().filter((_, i) => i % 7 === 0)
]

const optionSets = [
  [{remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [rehypeKatex]}, {plugins: [GFM, MATH, KATEX]}],
  [{remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex]}, {plugins: [MATH, KATEX]}],
  [{remarkPlugins: [remarkMath]}, {plugins: [MATH]}],
  [{remarkPlugins: [[remarkMath, {singleDollarTextMath: false}]], rehypePlugins: [[rehypeKatex, {output: 'mathml'}]]}, {plugins: [MATH, KATEX], singleDollarTextMath: false, katex: {output: 'mathml'}}],
  [{remarkPlugins: [remarkMath], rehypePlugins: [[rehypeKatex, {trust: true, errorColor: '#00f'}]]}, {plugins: [MATH, KATEX], katex: {trust: true, errorColor: '#00f'}}],
  [{rehypePlugins: [rehypeKatex]}, {plugins: [KATEX]}],
  [{remarkPlugins: [remarkGfm, remarkBreaks, remarkMath], rehypePlugins: [rehypeKatex]}, {plugins: [GFM, BREAKS, MATH, KATEX]}],
  [{remarkPlugins: [remarkBreaks]}, {plugins: [BREAKS]}],
]

for (const [i, [options, lil2Options]] of optionSets.entries()) {
  test(`full renders like react-markdown + plugins (option set ${i})`, () => {
    const failures = []
    for (const c of docs) {
      const expected = renderToStaticMarkup(jsx(Upstream, {...options, children: c.markdown}))
      let actual
      try {
        actual = renderToStaticMarkup(jsx(Markdown, {...lil2Options, children: c.markdown}))
      } catch (error) {
        actual = 'THREW ' + error.stack.split('\n').slice(0, 3).join(' | ')
      }
      if (actual !== expected) {
        let at = 0
        while (actual[at] === expected[at]) at++
        failures.push({name: c.name, markdown: c.markdown.slice(0, 120), expected: expected.slice(Math.max(0, at - 80), at + 120), actual: actual.slice(Math.max(0, at - 80), at + 120)})
      }
    }
    if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 3)}, null, 1))
    assert.equal(failures.length, 0)
  })
}
