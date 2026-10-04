// The GFM corpus: every example of the GFM spec (cmark-gfm test/spec.txt, which includes the CommonMark
// examples and the GFM extensions) and cmark-gfm's extensions.txt, GFM edge cases, plus the CommonMark corpus.
import {readFileSync} from 'node:fs'
import {corpus as commonmark} from './corpus.mjs'

function examples(file) {
  const text = readFileSync(new URL(file, import.meta.url), 'utf8')
  const fence = '`'.repeat(32)
  const cases = []
  const re = new RegExp('^' + fence + ' example([^\\n]*)\\n([\\s\\S]*?)^\\.\\n([\\s\\S]*?)^' + fence + '$', 'gm')
  let match
  while ((match = re.exec(text))) cases.push({name: `${file} ${cases.length + 1}${match[1]}`, markdown: match[2].replace(/→/g, '\t')})
  return cases
}

const edges = [
  '| a | b |\n| - | :-: |\n| 1 | 2 |\n| 3 |',
  '| a |\n|:-|\n| `b \\| c` |',
  'a | b\n--|--:\nc | d\ne',
  '|a|\n|-|\n>b',
  '* [ ] one\n* [x] two\n  * [X] three\n\n- [ ]\n- [x]\tx',
  '1. [x] task\n\n   para',
  '~a~ ~~b~~ ~~~c~~~ ~d',
  'Hi[^1] and[^note].\n\n[^1]: One.\n[^note]: Two\n\n    indented\n\n[^unused]: x',
  '[^a]\n[^a]\n\n[^a]: x [^b]\n\n[^b]: y',
  'www.example.com/a_b(c) https://x.y/z?q=1. a@b.co, mailto:me@x.y xmpp:a@b.c/d',
  'http://a.b_c.d http://a.b.c_ www.a.b_c',
  '![^x] [^x][] [x][^x]\n\n[^x]: note',
  '| a |\n| --- |\n| [^n] |\n\n[^n]: in table',
  '* [x]  \n  more',
  'a ~~b\nc~~ d',
]

export function gfmCorpus() {
  return [...examples('gfm-spec.txt'), ...examples('gfm-extensions.txt'), ...edges.map((markdown, i) => ({name: `edge ${i + 1}`, markdown})), ...commonmark()]
}
