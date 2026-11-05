import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, chmod, stat, symlink, lstat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {normalizeReleasePermissions} from './release-permissions.mjs';

test('root 安装后的插件可供普通用户读取，执行位保留且不跟随外部链接', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-permissions-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const app = path.join(root, 'DSH.app'), plugin = path.join(app, 'runtime/dsh-providers-hub');
  await mkdir(plugin, {recursive: true, mode: 0o700});
  await chmod(plugin, 0o700);
  await writeFile(path.join(plugin, 'package.json'), '{}', {mode: 0o600});
  await writeFile(path.join(app, 'node'), 'executable', {mode: 0o700});
  const outside = path.join(root, 'outside');
  await writeFile(outside, 'private', {mode: 0o600});
  await symlink(outside, path.join(app, 'external'));
  await normalizeReleasePermissions(app);
  assert.equal((await stat(plugin)).mode & 0o777, 0o755);
  assert.equal((await stat(path.join(plugin, 'package.json'))).mode & 0o777, 0o644);
  assert.equal((await stat(path.join(app, 'node'))).mode & 0o777, 0o755);
  assert.ok((await lstat(path.join(app, 'external'))).isSymbolicLink());
  assert.equal((await stat(outside)).mode & 0o777, 0o600);
});
