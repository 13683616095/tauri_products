# 设计

## 三层架构

```text
打包器界面（输入 URL / 标题 / 图标 / 架构）
             ↓
打包任务配置（profile）与受控图标资源
             ↓
Tauri 壳模板 + GitHub Actions Windows Runner
             ↓
NSIS x64 或 x86 安装包
```

## 打包配置

每次构建由 `package-profile.json` 描述。必填字段为：

- `url`：必须为 HTTPS URL。
- `title`：1–80 个字符，用作窗口、产品和安装程序名称。
- `icon`：相对于配置文件的 PNG/ICO 图标路径。
- `identifier`：稳定且唯一的小写反向域名；同一产品升级时不可变更。
- `target`：`x64` 或 `x86`，缺省为 `x64`。

配置在进入构建前需做 JSON Schema、URL 协议、标题长度、图标扩展名与文件大小校验。

## 模板生成

Tauri 的窗口 URL、标题和 bundle 图标属于编译期配置，不能由已编译 EXE 在运行时安全地替换。因此每个 profile 必须在构建前生成独立的 Tauri 配置和 Rust 常量；不能把用户输入直接传进已经发布的 EXE。

## 架构选择

| 选择 | Rust 目标 | 默认 |
| --- | --- | --- |
| x64 | `x86_64-pc-windows-msvc` | 是 |
| x86 | `i686-pc-windows-msvc` | 否 |

GitHub 的 Windows Runner 按选择安装 Rust 目标并执行构建。产物路径与名称必须含目标架构，避免混淆。

## 默认窗口行为

默认 profile 以最大化模式启动（`maximized: true`、`fullscreen: false`），保留 Windows 标题栏及最小化、最大化、还原和关闭操作。用户退出最大化后，窗口遵循 profile 的宽高、最小尺寸和 `resizable` 设置。

## 云端提交安全

GitHub Actions 的手动输入无法安全传输二进制图标文件。完整的表单提交功能需要以下两种之一：

1. 本地打包器使用用户授权的 GitHub token，将 profile 和图标提交到私有仓库后触发工作流。
2. 受控后端接收上传、校验文件并代表用户触发构建。

首选方案 1；token 仅保存在用户本机系统凭据库，且仓库应为私有仓库。
