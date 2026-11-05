import * as React from 'react';
const h = React.createElement;
const terminal = new Set(['done', 'failed', 'cancelled']);

/** 仅打开引擎提供的 OpenAI 官方登录页。 */
export function codexAuthorizationUrl(attempt) {
  try {
    const url = new URL(attempt?.url);
    return url.origin === 'https://auth.openai.com' && !url.username && !url.password &&
      ['/oauth/authorize', '/api/accounts/authorize', '/codex/device'].includes(url.pathname) && !url.hash ? url.href : null;
  } catch { return null; }
}

export function CodexPlanPanel({chatGptCall, navigate = url => window.location.assign(url)}) {
  const [state, setState] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [answer, setAnswer] = React.useState('');
  const [models, setModels] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const life = React.useRef(null);
  const acting = React.useRef(false);
  const openNext = React.useRef(false);
  const navigation = React.useRef(navigate);
  navigation.current = navigate;
  const accept = React.useCallback(value => {
    setState(value);
    const url = codexAuthorizationUrl(value?.attempt);
    if (openNext.current && url) {
      openNext.current = false;
      navigation.current(url);
    }
  }, []);
  React.useEffect(() => {
    const controller = new AbortController();
    life.current = controller;
    let loading = false;
    const load = async () => {
      if (loading || acting.current) return;
      loading = true;
      try {
        const value = await chatGptCall('codex.status', {}, controller.signal);
        if (!controller.signal.aborted) accept(value);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught.message);
      } finally { loading = false; }
    };
    void load();
    const timer = setInterval(load, 1500);
    return () => {controller.abort(); clearInterval(timer);};
  }, [chatGptCall, accept]);
  React.useEffect(() => {
    const controller = new AbortController();
    setModels(null);
    if (state?.signedIn) {
      void chatGptCall('codex.models', {}, controller.signal).then(value => {
        if (!controller.signal.aborted) setModels(value.models ?? []);
      }).catch(caught => {if (!controller.signal.aborted) setError(caught.message);});
    }
    return () => controller.abort();
  }, [chatGptCall, state?.signedIn]);
  const act = async (action, extra = {}) => {
    const controller = life.current;
    if (!controller || controller.signal.aborted || acting.current) return;
    acting.current = true; setBusy(true); setError(null);
    if (action === 'login') openNext.current = true;
    if (action === 'cancel' || action === 'logout') openNext.current = false;
    try {
      const value = await chatGptCall('codex.' + action, extra, controller.signal);
      if (!controller.signal.aborted) {accept(value); if (action === 'answer') setAnswer('');}
    } catch (caught) {
      openNext.current = false;
      if (!controller.signal.aborted) setError(caught.message);
    } finally {acting.current = false; if (!controller.signal.aborted) setBusy(false);}
  };
  const attempt = state?.attempt;
  const waiting = attempt && !terminal.has(attempt.phase);
  const url = codexAuthorizationUrl(attempt);
  const terms = query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleModels = (models ?? []).filter(model => terms.every(term => `${model.name} ${model.id}`.normalize('NFKC').toLowerCase().includes(term)));
  const button = (text, onClick, disabled = busy) => h('button', {type:'button', className:'dim-jh-btn', onClick, disabled}, text);
  return h('section', {className:'dim-jh-chatgpt dim-jh-codex', 'aria-label':'ChatGPT 会员 Codex 登录'},
    h('h2', null, 'ChatGPT 会员'),
    h('p', {className:'dim-jh-chatgptIntro'}, '连接 ChatGPT 订阅，在 DSH 中使用 Codex 模型。'),
    h('div', {className:'dim-jh-accountCard dim-jh-codexConnection'},
      h('div', {className:'dim-jh-codexIdentity'},
        h('span', {className:'dim-jh-codexMark', 'aria-hidden':true}, 'C'),
        h('div', null,
          h('strong', {className:'dim-jh-codexStatus', 'data-connected':Boolean(state?.signedIn), role:'status'}, !state ? '正在读取登录状态…' : state.signedIn ? '已连接 ChatGPT' : '尚未连接 ChatGPT'),
          h('p', {className:'dim-jh-chatgptHint'}, state?.signedIn ? state.account || 'Codex 授权已就绪' : '通过官方登录页完成授权'))),
      h('div', {className:'dim-jh-chatgptActions'},
      button(state?.signedIn ? '重新登录 ChatGPT' : '通过 ChatGPT 登录 Codex', () => void act('login'), busy || !state || waiting),
      url ? button('打开官方登录页', () => navigate(url)) : null,
      waiting ? button('取消登录', () => void act('cancel')) : null,
      state?.signedIn ? button('退出 Codex 连接', () => {
        if (window.confirm('退出当前 Codex 连接？原会员授权方式的账号会保留。')) void act('logout');
      }) : null),
      !state?.signedIn && attempt?.message ? h('p', {className:'dim-jh-chatgptHint', role:'status'}, attempt.message) : null,
      attempt?.userCode ? h('p', null, '授权代码：', h('strong', null, attempt.userCode)) : null,
      waiting && (attempt.phase === 'prompt' || attempt.placeholder) ? h('div', null,
        h('p', null, '如果登录后没有自动返回，请粘贴浏览器地址栏中的完整回调网址。'),
        h('input', {className:'dim-jh-chatgptAccounts', 'aria-label':'Codex 授权回调网址', value:answer, autoComplete:'off', onChange:event => setAnswer(event.target.value)}),
        button('完成登录', () => void act('answer', {value:answer}), busy || !answer.trim())) : null,
      error || attempt?.error ? h('p', {role:'alert'}, error ?? attempt.error) : null),
    state?.signedIn ? h('div', {className:'dim-jh-codexCatalog'},
      h('div', {className:'dim-jh-chatgptCatalogHeader'},
        h('h3', null, 'Codex 模型目录'),
        models !== null ? h('span', {className:'dim-jh-codexCount', role:'status'}, terms.length ? `${visibleModels.length} / ${models.length}` : `${models.length} 个模型`) : null),
      h('p', {className:'dim-jh-chatgptHint'}, '在对话底部的模型菜单中选择使用。'),
      h('input', {className:'dim-jh-codexSearch', type:'search', 'aria-label':'搜索 Codex 模型', placeholder:'搜索模型名称或 ID…', autoComplete:'off', value:query, onChange:event => setQuery(event.target.value)}),
      models === null ? h('p', {className:'dim-jh-chatgptHint', role:'status'}, '正在读取模型目录…') :
        visibleModels.length ? h('ul', {className:'dim-jh-codexGrid', 'aria-label':'Codex 模型'},
          visibleModels.map(model => h('li', {className:'dim-jh-codexModel', key:model.id},
            h('strong', {title:model.name}, model.name),
            h('code', {title:'openai-codex/' + model.id}, 'openai-codex/' + model.id)))) :
          h('div', {className:'dim-jh-codexEmpty', role:'status'}, models.length ? '没有匹配的模型' : '暂时没有模型',
            query ? button('清除搜索', () => setQuery('')) : null),
      h('p', {className:'dim-jh-chatgptHint dim-jh-codexFootnote'}, '实际可用模型与额度以当前订阅和请求结果为准。')) : null);
}
