import { unwrapRpcResult } from '../management-rpc.mjs';

// The phone account service owns OAuth credentials; Jet Hub only receives public status.
export function createChatGptCall(connection) {
  return async (action, extra = {}, signal) => {
    const codex = action.startsWith('codex.');
    return unwrapRpcResult(await connection.rpc.call(
      codex ? '/desktop-codex' : '/phone-chatgpt', 'manage',
      { ...extra, action: codex ? action.slice(6) : action }, signal,
    ));
  };
}

export function chatGptAuthorizationUrl(status) {
  if (status?.attempt?.phase !== 'waiting-browser') return null;
  try {
    const url = new URL(status.attempt.authorizeUrl);
    return url.origin === 'https://auth.openai.com' && !url.username && !url.password &&
      url.pathname === '/api/accounts/authorize' && !url.hash ? url.href : null;
  } catch { return null; }
}
