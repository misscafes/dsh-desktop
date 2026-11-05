import {execFileSync} from 'node:child_process';

/** macOS 的 HTTPS 代理仍是 HTTP CONNECT；只接收明确的主机与有效端口。 */
export function parseSystemProxy(text) {
  const fields = Object.fromEntries(String(text).split('\n').flatMap(line => {
    const match = /^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }));
  const result = {};
  for (const protocol of ['HTTP', 'HTTPS']) {
    if (fields[protocol + 'Enable'] !== '1') continue;
    const host = fields[protocol + 'Proxy'];
    const port = Number(fields[protocol + 'Port']);
    if (!host || !/^[A-Za-z0-9.:[\]_-]+$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) continue;
    try {
      const address = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
      const url = new URL(`http://${address}:${port}`);
      result[protocol + '_PROXY'] = url.href.replace(/\/$/, '');
    } catch {}
  }
  return result;
}

export function readSystemProxy() {
  try { return parseSystemProxy(execFileSync('/usr/sbin/scutil', ['--proxy'], {encoding: 'utf8', timeout: 1500})); }
  catch { return {}; }
}

/** 仅构造后台子进程环境；保留用户显式代理设置，不改系统代理或全局环境。 */
export function withSystemProxy(source, platform = process.platform, read = readSystemProxy) {
  const env = {...source};
  if (env.NODE_USE_ENV_PROXY === '0') return env;
  const configured = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].some(name => env[name]);
  if (!configured && platform === 'darwin') Object.assign(env, read());
  if (['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].some(name => env[name])) {
    env.NODE_USE_ENV_PROXY ??= '1';
    const exceptions = (env.NO_PROXY ?? env.no_proxy ?? '').split(',').map(value => value.trim()).filter(Boolean);
    env.NO_PROXY = [...new Set([...exceptions, 'localhost', '127.0.0.1', '::1'])].join(',');
  }
  return env;
}
