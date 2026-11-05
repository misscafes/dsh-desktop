# 源码来源

- `team/vendor/ds-bot`：正式 npm `ds-bot@0.1.5`，来源 [Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot)，沿用 Apache-2.0 许可证；原始文件和发行完整性在 `team/upstream.json` 登记。`team` 的本地适配负责模式切换、角色卡复制和已有工具、技能衔接。

电脑版适配基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，核心固定为 npm 发布的 `0.2.1-alpha.4`。依赖由 `desktop-runtime/pnpm-lock.yaml` 固定，安装时校验锁文件。

本次独立整理的源文件来自 [DSH 手机与共享适配仓库](https://cnb.cool/applecabal/dsh-phone) 的提交 `904ea96477626bbdb96989f7394f9f3ae6719337`，保留电脑版安装器、共享账号与远程协议、插件源码及兼容层。初始公开提交重新建立历史，不带私人开发目录或运行数据。

- `vendor/dsh-codearts-auth`：Jet Hub 插件源码与客户端资源。
- `vendor/dsh-channel-qq`：QQ 消息适配插件源码。
- `vendor/dsh-noema`：Noema 插件及其上游源码。
- `peer/vendor`、`phone-account/vendor`：保留 DeepSeek 上游许可证的适配器源码。
- `runtime/overlays`：按模块保留上游许可证的兼容改动；桌面使用原生平台分支。
- `peer/presentation.*`、`peer/browser-compat.js`：两端共用的界面适配资源。
- `dsh-pocket`：手机扫码访问插件，固定 npm 2.10.6，来源 [shaobeichen/dsh-pocket](https://github.com/shaobeichen/dsh-pocket)，沿用 GPL-2.0 许可证；通过锁文件安装，未改写上游包。

各上游组件沿用其目录中 LICENSE 或 package.json 声明的许可证。本仓库不将第三方代码重新许可，也不包含从其他应用提取的原生运行库、APK 或私人素材。

## JetHub 桌面增量跟进（2026-10-21）

固定上游 `iJetLi/deepseek-harness-codearts@78dc506cf42bb1821a20cd4378f2b81cd8de8ded`（`dsh-providers-hub@0.2.1-rc.2`），在既有增强代码上三方合并；桌面核心保持 `0.2.1-alpha.4`，不替换其它插件或用户数据。兼容性和保留策略见 `vendor/dsh-codearts-auth/docs/desktop-local-integration.md`。源文件中的个人账号示例已脱敏；未发布本地私有备份与验证夹具。

## 2026-11-05 桌面维护

Jet Hub 更新至 `iJetLi/deepseek-harness-codearts@104f0fc3dd1e07df21fbc18ecba49b0a857d23d4`，以已有定制基础三方合并，保留原渠道、ChatGPT、账号轮换及手机边界。复核说明位于 `vendor/dsh-codearts-auth/docs/desktop-20261105-integration.md`。

Codex 订阅登录桥来源为 [ccch1mneyyy/dsh-Go](https://github.com/ccch1mneyyy/dsh-Go)，固定提交 `aa0daddb25b107ab47eeb78d8facc136af0e4aa9`，仅采用文件头明确声明 MIT 的 auth bridge 与对应测试，来源记录见 `desktop-chatgpt/vendor/dsh-go-auth/NOTICE.txt`。请求与授权由已有固定 DSH 引擎负责。原会员授权方式同时参考 [OpenAI 官方接入说明](https://developers.openai.com/siwc/token-sharing-open-source)。
