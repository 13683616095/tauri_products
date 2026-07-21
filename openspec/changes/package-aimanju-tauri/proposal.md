# 变更：将爱漫剧制作站点封装为 Windows 桌面应用

## 目标

使用 Tauri 2 将 `https://aimanjuzhizuo.com?ly=360` 封装为“AI漫剧创作”原生 Windows x64 应用，并生成带产品 Logo 的 NSIS 安装包。

## 范围

- 创建最小 Tauri 桌面壳，启动时加载固定的目标 URL（含 `ly=360`），并使用提供的产品 Logo。
- 产出 Windows x64 的 NSIS 安装程序。
- 不复制、修改或托管目标网站的内容；登录、数据和服务可用性仍由目标站点负责。

## 非目标

- 不实现离线模式、账号同步或网站功能改造。
- 不绕过目标站点的访问、版权或服务端限制。

## 验收标准

- Windows x64 下启动安装后的应用会打开目标 URL，且查询参数保持为 `ly=360`。
- 窗口标题为“AI漫剧创作”，可最小化、最大化和调整大小。
- `npm run build` 成功并生成 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/` 下的安装程序。
- GitHub Actions 手动运行后可下载 NSIS 安装包及其 SHA-256 校验文件。
