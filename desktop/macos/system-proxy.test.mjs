import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSystemProxy, withSystemProxy} from './app/system-proxy.mjs';

test('浏览器使用的 macOS HTTP CONNECT 代理会传给 Node 后台，并排除本机服务', () => {
  const source = {PATH:'/bin', NO_PROXY:'example.invalid'};
  const system = parseSystemProxy('HTTPEnable : 1\nHTTPProxy : 127.0.0.1\nHTTPPort : 7897\nHTTPSEnable : 1\nHTTPSProxy : 127.0.0.1\nHTTPSPort : 7897');
  const env = withSystemProxy(source, 'darwin', () => system);
  assert.equal(env.HTTPS_PROXY, 'http://127.0.0.1:7897');
  assert.equal(env.HTTP_PROXY, 'http://127.0.0.1:7897');
  assert.equal(env.NODE_USE_ENV_PROXY, '1');
  assert.equal(env.NO_PROXY, 'example.invalid,localhost,127.0.0.1,::1');
  assert.deepEqual(source, {PATH:'/bin', NO_PROXY:'example.invalid'});
});

test('显式代理或关闭选项优先，非 Mac 不读取系统设置', () => {
  const read = () => {throw Error('must not read');};
  assert.equal(withSystemProxy({https_proxy:'http://user-proxy:8080'}, 'darwin', read).https_proxy, 'http://user-proxy:8080');
  assert.deepEqual(withSystemProxy({NODE_USE_ENV_PROXY:'0'}, 'darwin', read), {NODE_USE_ENV_PROXY:'0'});
  assert.deepEqual(withSystemProxy({}, 'win32', read), {});
});

test('关闭、损坏、含认证信息或越界端口的系统代理不会写入后台环境', () => {
  for (const text of ['HTTPSEnable : 0\nHTTPSProxy : host\nHTTPSPort : 7897',
    'HTTPSEnable : 1\nHTTPSProxy : user:password@host\nHTTPSPort : 7897',
    'HTTPSEnable : 1\nHTTPSProxy : host\nHTTPSPort : 99999']) assert.deepEqual(parseSystemProxy(text), {});
  assert.equal(parseSystemProxy('HTTPSEnable : 1\nHTTPSProxy : ::1\nHTTPSPort : 8080').HTTPS_PROXY, 'http://[::1]:8080');
});
