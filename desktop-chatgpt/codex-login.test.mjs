import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyCodexLogin, CODEX_ROUTE} from './codex-login.mjs';

function fixture() {
  const records = new Map(), providers = {}, handlers = new Map(), cleanup = [];
  const secret = 'synthetic-grant-never-expose';
  const services = {
    credentials: {readRecord: async key => records.get(key), deleteRecord: async key => records.delete(key)},
    settings: {
      describe: () => [{ns:'llm-pi-ai', value:{providers}, user:{providers}}],
      mutate: async (_ns, operations) => {for (const op of operations) {
        if (op.op === 'set') providers[op.path[1]] = op.value;
        else delete providers[op.path[1]];
      }},
    },
    authorization: {describe: () => ({}), begin: async ({key, signal, interaction}) => {
      interaction.notify({url:'https://auth.openai.com/oauth/authorize?state=synthetic'});
      await interaction.prompt({kind:'text', signal});
      if (signal.aborted) return {status:'cancelled'};
      records.set(key, {kind:'grant', payload:{access:secret}});
      return {status:'authorized'};
    }},
  };
  const ctx = {
    get: name => services[name],
    effect: callback => cleanup.push(callback()),
    connection: {rpc:{handle: (route, handler, options) => handlers.set(route, {handler, options})}},
    llm: {listModels: async provider => [{provider, id:'fixture-model', name:'Synthetic model'}]},
  };
  const result = applyCodexLogin(ctx);
  return {...result, records, providers, handlers, cleanup, secret};
}
const settled = async () => {for(let i=0;i<8;i++) await new Promise(resolve => setImmediate(resolve));};

test('Codex RPC 只供本机调用，登录完成后发布模型渠道且不会返回 grant', async t => {
  const f = fixture();t.after(() => f.bridge.dispose());
  const endpoint = f.handlers.get(CODEX_ROUTE);
  assert.equal(endpoint.options.authority, 'loopback');
  const call = payload => endpoint.handler('manage', payload);
  assert.equal((await call({action:'status'})).value.signedIn, false);
  await call({action:'login'});await settled();
  const waiting = await call({action:'status'});
  assert.equal(waiting.value.attempt.phase, 'open');
  await call({action:'answer', value:'synthetic-code'});await settled();
  const status = await call({action:'status'});
  assert.equal(status.value.signedIn, true);
  assert.equal(status.value.attempt.phase, 'done');
  assert.equal(f.providers['openai-codex'].displayName, 'ChatGPT');
  assert.equal(JSON.stringify(status).includes(f.secret), false);
  assert.deepEqual((await call({action:'models'})).value.models, [{id:'fixture-model', name:'Synthetic model'}]);
});

test('取消或卸载退出待登录流程，原账号保持；无效操作被拒绝', async () => {
  const f = fixture();
  f.records.set('llm-pi-ai/openai-codex', {kind:'grant', payload:{access:f.secret}});
  await f.manage({action:'login'});await settled();
  await f.manage({action:'cancel'});await settled();
  assert.equal((await f.manage({action:'status'})).signedIn, true);
  assert.equal((await f.manage({action:'status'})).attempt.phase, 'cancelled');
  const endpoint = f.handlers.get(CODEX_ROUTE);
  assert.equal((await endpoint.handler('other', {})).ok, false);
  assert.equal((await endpoint.handler('manage', {action:'unknown'})).ok, false);
  for (const dispose of f.cleanup) dispose?.();
});

test('登录通道可由固定宿主真实注册，拒绝回归成包含第二级路径的无效通道', async () => {
  const {createRequire} = await import('node:module');
  const {pathToFileURL} = await import('node:url');
  const require = createRequire(new URL('../desktop-runtime/package.json', import.meta.url));
  const {HostConnectionService} = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-client-connection')));
  let registered;
  const owner = {effect: callback => callback(), webServer: {register: route => {registered = route; return () => {};}}};
  HostConnectionService.prototype.register.call({}, owner, CODEX_ROUTE, async () => ({ok:true, value:{}}));
  assert.equal(registered.path, CODEX_ROUTE);
  assert.equal(registered.kind, 'prefix');
});
