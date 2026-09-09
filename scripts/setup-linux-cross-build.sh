#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "该脚本仅用于 Linux 主机。" >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "当前只自动支持 Debian/Ubuntu（apt-get）。请按 README 手动安装 LLVM、LLD、Clang 和 NSIS。" >&2
  exit 1
fi

if [[ "$(id -u)" == "0" ]]; then
  APT=(apt-get)
elif command -v sudo >/dev/null 2>&1; then
  APT=(sudo apt-get)
else
  echo "安装系统依赖需要 root 权限或 sudo。" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
"${APT[@]}" update
"${APT[@]}" install -y build-essential curl wget file clang llvm lld nsis

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
rustup target add x86_64-pc-windows-msvc
if [[ "${INSTALL_X86:-0}" == "1" ]]; then
  rustup target add i686-pc-windows-msvc
fi

if ! command -v cargo-xwin >/dev/null 2>&1; then
  cargo install --locked cargo-xwin
fi

npm ci
npm run doctor
npm run product -- validate

echo "Linux → Windows NSIS 交叉编译环境准备完成。"
