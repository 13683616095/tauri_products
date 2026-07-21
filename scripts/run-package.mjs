import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preparePackage } from "./prepare-package.mjs";

const mode = process.argv[2];
if (!new Set(["build", "dev"]).has(mode)) throw new Error("仅支持 build 或 dev 模式");

const profile = preparePackage();
const cargoBin = `${process.env.USERPROFILE ?? ""}\\.cargo\\bin`;
process.env.PATH = `${cargoBin};${process.env.PATH ?? ""}`;

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tauriCli = resolve(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
const args = [tauriCli, mode, "--config", "src-tauri/.generated/tauri.profile.conf.json"];
if (mode === "build") args.push("--target", profile.rustTarget);

console.log(`开始 ${mode}：${profile.title} / ${profile.target}`);
console.log(`执行命令：${process.execPath} ${args.join(" ")}`);
const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
if (result.error) {
  throw new Error(`无法启动 Tauri CLI：${result.error.message}`);
}
if (result.status !== 0) {
  throw new Error(`Tauri ${mode} 失败：退出码 ${result.status ?? "unknown"}${result.signal ? `，信号 ${result.signal}` : ""}`);
}
