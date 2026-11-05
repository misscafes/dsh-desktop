import * as React from 'react';
import {ZcodeResetPanel} from './zcode-reset.js';
/** 每个账号独立选择额度来源；查询与保存失败都保留原选择。 */
export function ZcodeSourcePanel({ account, rpcCall, onChanged }) {
  const [snapshot, setSnapshot] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const alive = React.useRef(true);
  const load = async (refresh = false) => {
    setBusy(true); setError(null);
    try { const data = await rpcCall('zcode.sources', { accountId: account.id, refresh }); if (alive.current) { setSnapshot(data); if (refresh) await onChanged?.(); } }
    catch (caught) { if (alive.current) setError(caught?.message || '额度来源读取失败'); }
    finally { if (alive.current) setBusy(false); }
  };
  React.useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [account.id]);
  const select = async (sourceId) => {
    setBusy(true); setError(null);
    try {
      await rpcCall('zcode.selectSource', { accountId: account.id, sourceId });
      if (alive.current) { setSnapshot(old => ({ ...old, selected: sourceId })); await onChanged?.(); }
    } catch (caught) { if (alive.current) setError(caught?.message || '额度来源保存失败'); }
    finally { if (alive.current) setBusy(false); }
  };
  const sources = snapshot?.sources || [];
  const selected = snapshot?.selected ?? account.zcodeSource ?? 'auto';
  const selectedSource = sources.find(source => source.id === selected);
  const statusOf = source => source.quota || source.reason || (source.available ? '可用' : '不可用');
  return React.createElement('div', { className: 'dim-jh-zcodeSources' },
    React.createElement('div', { className: 'dim-jh-zcodeSourceHead' },
      React.createElement('label', { htmlFor: 'zcode-source-' + account.id }, '额度来源'),
      React.createElement('button', { type: 'button', className: 'dim-jh-btn', disabled: busy, 'aria-label': '刷新额度来源', onClick: () => void load(true) }, busy ? '读取中…' : '刷新')),
      React.createElement('select', { id: 'zcode-source-' + account.id, className: 'dim-jh-zcodeSelect', 'aria-label': 'ZCode额度来源', value: selected, disabled: busy || !snapshot, onChange: e => void select(e.target.value) },
        React.createElement('option', { value: 'auto' }, '自动 · 沿用赠送优先的原设置'),
        sources.map(source => React.createElement('option', { key: source.id, value: source.id, disabled: !source.available }, source.label + (source.available ? '' : '（不可用）'))),
        selected !== 'auto' && !sources.some(s => s.id === selected) ? React.createElement('option', { value: selected }, '已保存来源 · 等待刷新') : null),
    selectedSource && !selectedSource.available ? React.createElement('p', { className: 'dim-jh-zcodeSourceStatus' }, statusOf(selectedSource)) : null,
    React.createElement('p', { className: 'dim-jh-hint' }, '切换后用于后续请求，当前请求不受影响。'),
    React.createElement('details', { className: 'dim-jh-zcodeSourceDetails' },
      React.createElement('summary', null, '来源详情与计费说明'),
      sources.map(source => React.createElement('div', { key: source.id, className: 'dim-jh-zcodeSourceItem' },
        React.createElement('strong', null, source.label + (selected === source.id ? ' · 当前' : '')),
        React.createElement('span', null, statusOf(source)),
        source.reason && source.quota ? React.createElement('span', null, source.reason) : null)),
      React.createElement('p', { className: 'dim-jh-hint' }, '机构流量使用对应项目的资源包或充值余额，不扣编程套餐。所选来源余额不足时，不会自动改用其它 Plan。')),
    error ? React.createElement('div', { role: 'alert', className: 'dim-jh-hint', 'data-tone': 'error' }, error) : null,
    snapshot ? React.createElement(ZcodeResetPanel, { key: account.id, account: {...account,zcodeSource:selected}, sources, rpcCall, onChanged: async()=>{ await load(true); } }) : null);
}
