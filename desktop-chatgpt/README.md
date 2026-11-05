# 电脑 ChatGPT 会员入口

DSH 0.1.11 提供“设置 → Jet Hub → ChatGPT 会员 → 通过 ChatGPT 登录 Codex”。此路径复用引擎内置的 `llm-pi-ai/openai-codex` 登录、凭据续期和推理适配器，授权完成后自动声明 `openai-codex` 模型渠道。浏览器回调无法自动完成时，可以粘贴完整回调网址继续登录；取消或失败保留原账号。

登录桥参考并保留 dsh-Go 的 MIT 源文件，具体来源和提交见 `vendor/dsh-go-auth/NOTICE.txt`。本次只向桌面 UI 公开 ChatGPT 的操作，OAuth grant 留在 DSH 本机凭据服务中；前端和日志不接收 token。模型目录用于选择模型，真实权益和额度以推理结果为准。

原来的会员授权、多账号和工作区功能保留在“其他登录方式：原会员授权”中，两条路径的凭据分别保存。Codex 路径的模型 ID 为 `openai-codex/<模型>`，原会员授权路径为 `chatgpt-plan/<官方 slug>`；二者均可经 Jet Hub 已启用的本机网关调用。

本插件适配固定的 DSH 核心 `0.2.1-alpha.4`，不升级核心，不读取或复制其它应用的登录凭据。安装包只包含程序。实际登录由用户在 OpenAI 官方网页中完成。

从源码单独安装时，先按上级桌面文档准备完整运行时，再运行：

```sh
node scripts/install-desktop-chatgpt.mjs /path/to/.dsh/profiles/web /path/to/desktop/node_modules
node scripts/install-desktop-jet-hub-chatgpt.mjs /path/to/desktop/dsh-providers-hub
```

Jet Hub 必须是本次完整升级后的匹配源码；遇到未知版本或并发改动时安装器会拒绝覆盖。

Mac 启动器会在启动后台时读取当前手动系统代理，并让 Node 原生 fetch 使用它。不会改写系统代理或全局环境；本机回调和网关保持直连。显式 HTTP_PROXY/HTTPS_PROXY 配置优先，NODE_USE_ENV_PROXY=0 可关闭继承。
