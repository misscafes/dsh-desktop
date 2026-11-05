import {AuthBridge} from './vendor/dsh-go-auth/bridge.mjs';

export const CODEX_ROUTE = '/desktop-codex';
export const CODEX_PROVIDER = 'openai-codex';

/** 只公开登录进度与模型目录；OAuth grant 始终由引擎凭据服务持有。 */
export function applyCodexLogin(ctx) {
  const bridge = new AuthBridge({get: name => ctx.get(name)});
  let attemptId;
  ctx.effect(() => () => bridge.dispose());
  async function status() {
    const result = await bridge.list();
    const account = result.providers.find(provider => provider.id === CODEX_PROVIDER);
    return {...account, attempt: attemptId ? bridge.poll(attemptId) : undefined};
  }
  async function manage(payload) {
    switch (payload.action) {
      case 'status': return status();
      case 'login': ({attemptId} = await bridge.begin(CODEX_PROVIDER)); return status();
      case 'answer':
        bridge.answer(attemptId, payload.value); return status();
      case 'cancel': bridge.cancel(attemptId); return status();
      case 'logout': await bridge.signOut(CODEX_PROVIDER); attemptId = undefined; return status();
      case 'models': {
        const current = await status();
        if (!current.signedIn) return {models: []};
        const models = await ctx.llm.listModels(CODEX_PROVIDER);
        return {models: models.map(({id, name}) => ({id, name}))};
      }
      default: throw Object.assign(new Error('无效的 ChatGPT 登录操作'), {code: 'bad-request'});
    }
  }
  ctx.connection.rpc.handle(CODEX_ROUTE, async (method, payload) => {
    if (method !== 'manage' || !payload || typeof payload.action !== 'string') {
      return {ok: false, error: {code: 'bad-request', message: '无效的 ChatGPT 登录操作', details: {}}};
    }
    try { return {ok: true, value: await manage(payload)}; }
    catch (error) {
      // 外部响应与认证信息不进入公开错误文案。
      return {ok: false, error: {code: error.code ?? 'codex/unavailable', message: 'ChatGPT 登录暂未完成，请检查网络或重新登录。', details: {}}};
    }
  }, {authority: 'loopback'});
  return {bridge, manage};
}
