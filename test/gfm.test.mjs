// lil2-react-markdown/gfm renders like react-markdown with remark-gfm, across options.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import Upstream from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {jsx} from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'
import {gfmCorpus} from './gfm-corpus.mjs'
const {Markdown, GFM} = await import(new URL(process.env.LIL2_GFM ?? '../.dev/dist/gfm.js', import.meta.url))
const C = await import(new URL(process.env.LIL2_CONSTANTS ?? '../.dev/dist/constants.js', import.meta.url))
const T = {tag: 4, tagNames: 17}

const optionSets = [
  [{remarkPlugins: [remarkGfm]}, {plugins: [GFM]}],
  [{remarkPlugins: [[remarkGfm, {singleTilde: false}]]}, {plugins: [GFM], singleTilde: false}],
  [{remarkPlugins: [remarkGfm], skipHtml: true}, {plugins: [GFM], skipHtml: true}],
  [{remarkPlugins: [remarkGfm], disallowedElements: ['del', 'input', 'th'], unwrapDisallowed: true}, {plugins: [GFM], disallowedElements: [C.TAG_DEL, C.TAG_INPUT, C.TAG_TH], unwrapDisallowed: true}],
  [{remarkPlugins: [remarkGfm], urlTransform: (url, key, node) => key + ':' + node.tagName + ':' + url},
   {plugins: [GFM], urlTransform: (url, key, node, tree) => C.propNames[key] + ':' + tree[T.tagNames][tree[T.tag][node]] + ':' + url}],
  [{remarkPlugins: [remarkGfm], components: {td: props => jsx('td', {...props, node: undefined, 'data-cell': 1})}},
   {plugins: [GFM], components: [C.TAG_TD, props => jsx('td', {...props, node: undefined, tree: undefined, 'data-cell': 1})]}],
  [{}, {}]
]

for (const [i, [options, lil2Options]] of optionSets.entries()) {
  test(`gfm renders like react-markdown + remark-gfm (option set ${i})`, () => {
    const failures = []
    for (const c of gfmCorpus()) {
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
        failures.push({name: c.name, markdown: c.markdown.slice(0, 120), expected: expected.slice(Math.max(0, at - 60), at + 120), actual: actual.slice(Math.max(0, at - 60), at + 120)})
      }
    }
    if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 3)}, null, 1))
    assert.equal(failures.length, 0)
  })
}

test('the core rejects a plugin it does not carry', async () => {
  const core = await import(new URL(process.env.LIL2_ARTIFACT ?? '../.dev/dist/react-markdown.js', import.meta.url))
  assert.throws(() => renderToStaticMarkup(jsx(core.Markdown, {plugins: [GFM], children: 'a'})))
})
