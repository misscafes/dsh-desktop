/** 维护者复核合并结果后显式执行；普通构建只校验契约，不自动批准源码变化。 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw Error('请传入已复核的完整上游提交');
const file = path.join(root, 'customization-contract.json');
const contract = JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.dshLocalIntegration?.upstreamCommit !== commit) throw Error('上游来源与 package.json 不一致');
function fingerprints(directories) {
  const result = {};
  function walk(relative) {
    const directory = path.join(root, relative);
    for (const entry of fs.readdirSync(directory, {withFileTypes: true}).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
      const name = relative + '/' + entry.name;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) result[name] = createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
      else throw Error('定制程序不能包含符号链接：' + name);
    }
  }
  for (const directory of directories) walk(directory);
  return result;
}
contract.upstreamCommit = commit;
contract.sourceFingerprints = fingerprints(['src', 'plugin-src']);
contract.runtimeFingerprints = fingerprints(['lib']);
fs.writeFileSync(file, JSON.stringify(contract, null, 2) + '\n');
console.log(JSON.stringify({upstreamCommit:commit, sourceFiles:Object.keys(contract.sourceFingerprints).length, runtimeFiles:Object.keys(contract.runtimeFingerprints).length}));
