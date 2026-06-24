# Nova Points DApp

一个可直接运行和部署到 Vercel 的 Next.js DApp 示例。

## 功能

- MetaMask / TokenPocket 注入式钱包连接
- 钱包签名登录、一次性 nonce、HttpOnly Cookie session
- 前端 mock 积分 API（localStorage 持久化）
- 每日签到、任务领取、积分动态
- 响应式首页 UI

## 本地运行

```bash
cp .env.example .env.local
npm install
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

打开 <http://localhost:3000>。

## Vercel 部署

1. 将项目推送到 GitHub / GitLab / Bitbucket。
2. 在 Vercel 导入仓库。
3. 添加环境变量 `SESSION_SECRET`，值使用至少 32 字符的随机字符串。
4. 使用默认 Next.js 构建配置部署。

积分数据是浏览器本地模拟数据，不跨设备同步。生产项目应替换为数据库 API。
