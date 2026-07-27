# 部署到网站（让别人也能玩）

本游戏是**纯静态网页**（单文件 `index.html`），可免费托管。

## 方式一：GitHub Pages（推荐）

仓库内已准备 `dist/index.html`。

```bash
# 在 pubg-lite 目录
node _build_single.js

# 若尚未建仓库（示例）
gh repo create battle-royale-lite --public --source=. --remote=origin
git add .
git commit -m "Publish Battle Royale Lite"
git push -u origin main

# 开启 Pages：Settings → Pages → Source: Deploy from branch → /dist 或根目录
# 或使用：
gh api -X POST repos/{owner}/battle-royale-lite/pages -f build_type=workflow
```

访问形式：

`https://<你的用户名>.github.io/battle-royale-lite/`

若把 `dist/index.html` 作为仓库根目录内容发布，则路径更短。

## 方式二：Netlify Drop（最简单）

1. 打开 https://app.netlify.com/drop  
2. 把 **`dist` 文件夹**拖进去  
3. 获得 `https://xxxx.netlify.app` 链接，发给朋友即可  

## 方式三：Cloudflare Pages / Vercel

- 导入仓库，发布目录填 `dist` 或 `.`  
- 构建命令可留空（静态站点）  

## 本地预览

```bash
# 在 dist 目录
npx --yes serve -p 8080
```

浏览器打开 http://localhost:8080
