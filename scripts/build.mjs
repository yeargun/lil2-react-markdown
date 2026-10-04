// node scripts/build.mjs [--dev] : production into dist/, or an unsearched build into .dev/.
import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
const compiler = process.env.LILSCRIPT_COMPILER ?? '/home/azureuser/lilscript-work/remark-fix/lilscript-8ff44f'
if (!existsSync(compiler)) throw new Error('Set LILSCRIPT_COMPILER to the pinned LilScript compiler')
const dev = process.argv.includes('--dev')
execFileSync(compiler, ['--config', 'lilscript.toml', '--target', 'js-module', '--mode', dev ? 'development' : 'production', '--out-dir', dev ? '.dev' : '.', '--cache', 'off', '--jobs', '1'], {stdio: ['ignore', 'ignore', 'inherit']})
