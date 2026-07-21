# 实施任务

- [x] 1. 编写提案、设计和可验证规格。
- [x] 2. 创建 Tauri 2 壳应用与 Windows x64/NSIS 配置。
- [x] 3. 安装 Rust stable（含 MSVC x64 目标）和 C++ Build Tools。
- [x] 4. 安装 npm 依赖并验证 Tauri 构建能解析配置、下载 Rust 依赖。
- [x] 4a. 添加 GitHub Actions Windows x64 云端构建与 NSIS 产物上传。
- [ ] 5. 在 Windows x64 上安装并启动安装程序，核对标题、URL 与窗口行为。

## 当前阻塞

独立 Windows SDK 已成功安装，`kernel32.lib` 已存在。Build Tools 仍为未完成状态（`isComplete: false`），且缺少 MSVC 开发库 `msvcrt.lib`。安装日志显示本机组策略禁止 Visual Studio 安装器调用 `C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe`，导致 C++ 工作负载的关键组件被跳过。解除该策略、以管理员身份完成“使用 C++ 的桌面开发”工作负载后，可继续执行任务 5。

已验证的替代路径：独立 MSYS2 无法创建信号管道（Win32 错误 5），独立 WinLibs/MinGW 安装也未能启动有效安装流程。因此当前机器的应用控制限制也阻止了本地 GNU 工具链方案；可改用受管制外的构建机或 GitHub Actions Windows Runner。
