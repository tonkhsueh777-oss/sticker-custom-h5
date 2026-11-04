# 表情研究所 · H5 V0.2（朋友云端测试版）

当前网站：[表情研究所](https://tonkhsueh777-oss.github.io/sticker-custom-h5/)

## 系统架构

- GitHub Pages：手机 H5 与电脑管理后台（同一网址）
- Supabase 免费项目：`sticker-custom-h5`，新加坡区域
- Edge Function：`sticker-api`，统一验证订单专属访问令牌和管理员邮箱
- 私有存储：`sticker-files`
- 数据表：`sticker_orders`、`sticker_revisions`、`sticker_admins`、`sticker_request_limiter`

## 已实现

- 客户无需注册：选模板、选 8／16／24 张、上传一张参考图、确认需求。
- 创建订单时将订单和参考图写入私有 Supabase 存储，管理员可从其他设备读取。
- 客户使用随机专属链接访问自己的订单；无需手机号或密码。
- 只有获准的管理员邮箱能进入管理后台；提供订单详情、制作状态、预览上传和 ZIP 交付。
- 三轮修改由服务器记录，制作纠错可不扣次数。
- 客服仍是规则模拟；**本测试版不收费，不调用真实 AI 生图服务**。

## 管理员首次配置（需要手动完成）

1. 登录 [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/tzebvgfhhfikeuccavqn/auth/url-configuration)。
2. Site URL 设置：`https://tonkhsueh777-oss.github.io/sticker-custom-h5/`
3. Redirect URLs 增加：`https://tonkhsueh777-oss.github.io/sticker-custom-h5/**`
4. 打开网站的「管理后台」，填写获授权的邮箱，点「发送安全登录邮件」。
5. 打开邮件里的链接，即可进入后台。首次邮件可能要等一会儿；免费项目邮件有频率限制。

当前允许的管理员邮箱：`tonkhsueh777@gmail.com`（若与你实际使用的邮箱不同，需先在项目的 `sticker_admins` 表中变更）。

## 朋友测试流程

手机打开 H5 → 创建订单 → 复制并保存专属订单链接 → 电脑以管理员邮箱登录 → 「刷新订单」 → 下载参考图 → 用现有工具制作 → 上传预览和可选 ZIP → 客户刷新链接查看 → 提交修改 → 管理员受理修改。

## 注意事项

- V0.1 的本地演示订单**不会自动迁移**，需重新提交云端测试订单。
- 浏览器中的代码只有公开 publishable key；**绝对不要把 service-role key、管理员密码、真实客户资料放到 GitHub 仓库**。
- 客户订单链接相当于访问凭证，不能公开传播；不适合收集敏感证件。
- GitHub Pages 先限朋友体验测试。正式收费接单应迁移到允许商业用途的网站托管服务，并补充隐私政策、备份、监控及反滥用控制。
