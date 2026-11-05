import Schema from '@deepseek-ai/schemastery';
import { applyChatGpt } from './chatgpt.js';
import { applyCodexLogin } from './codex-login.mjs';

export const name = 'desktop-chatgpt-account';
export const inject = ['credentials', 'connection', 'llm', 'webServer', 'authorization', 'settings'];
export const Config = Schema.object({});
export function apply(ctx) {
  applyChatGpt(ctx, { desktop: true });
  applyCodexLogin(ctx);
}
