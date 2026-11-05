import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, lstat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {prepareProfile} from './app/backend.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-jethub-upgrade-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const home = path.join(root, 'home'), runtime = path.join(root, 'runtime');
  const profile = path.join(home, 'profiles/web'), modules = path.join(runtime, 'node_modules');
  for (const name of ['@deepseek-ai/dsh', 'dsh-providers-hub']) {
    await mkdir(path.join(modules, name), {recursive: true});
    await writeFile(path.join(modules, name, 'package.json'), JSON.stringify({name, version: name === '@deepseek-ai/dsh' ? '0.2.1-alpha.4' : '0.2.1-rc.2'}));
  }
  await writeFile(path.join(runtime, 'bundle.json'), JSON.stringify({version:'test', plugins:['dsh-providers-hub'], profile:{dsh:{profile:{bundles:['dsh-providers-hub']}}}}));
  await mkdir(path.join(profile, 'node_modules/dsh-codearts-auth'), {recursive: true});
  await writeFile(path.join(profile, 'node_modules/dsh-codearts-auth/old'), 'previous plugin');
  const manifest = {private:true, dependencies:{'dsh-codearts-auth':'file:old',custom:'file:custom'}, dsh:{profile:{bundles:['custom','dsh-codearts-auth']}}};
  const original = JSON.stringify(manifest);
  await writeFile(path.join(profile, 'package.json'), original);
  await mkdir(path.join(home, 'jet-hub'), {recursive:true});
  const accounts = '{"accounts":[{"id":"existing","credentialRef":"EXISTING"}],"panelEntry":"settings"}\n';
  await writeFile(path.join(home, 'jet-hub/state.json'), accounts);
  return {home, runtime, profile, original, accounts};
}

test('真实启动流程将旧别名迁移到新包名，备份旧程序并保持账号与入口偏好', async t => {
  const {home, runtime, profile, accounts} = await fixture(t);
  const first = await prepareProfile(home, runtime);
  const manifest = JSON.parse(await readFile(path.join(profile, 'package.json')));
  assert.deepEqual(manifest.dsh.profile.bundles, ['custom','dsh-providers-hub']);
  assert.equal(manifest.dependencies.custom, 'file:custom');
  assert.equal(Object.hasOwn(manifest.dependencies, 'dsh-codearts-auth'), false);
  assert.ok((await lstat(path.join(profile, 'node_modules/dsh-providers-hub'))).isSymbolicLink());
  await assert.rejects(lstat(path.join(profile, 'node_modules/dsh-codearts-auth')), {code:'ENOENT'});
  assert.equal(await readFile(path.join(first.backup, 'modules/dsh-codearts-auth/old'), 'utf8'), 'previous plugin');
  assert.equal(await readFile(path.join(home, 'jet-hub/state.json'), 'utf8'), accounts);
  const before = await readFile(path.join(profile, 'package.json'), 'utf8');
  await prepareProfile(home, runtime);
  assert.equal(await readFile(path.join(profile, 'package.json'), 'utf8'), before);
});

test('迁移中断会恢复旧链接及原清单，账号不受影响', async t => {
  const {home, runtime, profile, original, accounts} = await fixture(t);
  await assert.rejects(prepareProfile(home, runtime, {beforeCommit() {throw Error('interrupted');}}), /interrupted/);
  assert.equal(await readFile(path.join(profile, 'package.json'), 'utf8'), original);
  assert.equal(await readFile(path.join(profile, 'node_modules/dsh-codearts-auth/old'), 'utf8'), 'previous plugin');
  await assert.rejects(lstat(path.join(profile, 'node_modules/dsh-providers-hub')), {code:'ENOENT'});
  assert.equal(await readFile(path.join(home, 'jet-hub/state.json'), 'utf8'), accounts);
});
