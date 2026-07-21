import { spawnSync } from "node:child_process";
import { preparePackage } from "./prepare-package.mjs";

const mode = process.argv[2];
if (!new Set(["build", "dev"]).has(mode)) throw new Error("仅支持 build 或 dev 模式");

const profile = preparePackage();
const cargoBin = `${process.env.USERPROFILE ?? ""}\\.cargo\\bin`;
process.env.PATH = `${cargoBin};${process.env.PATH ?? ""}`;

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["tauri", mode, "--config", "src-tauri/.generated/tauri.profile.conf.json"];
if (mode === "build") args.push("--target", profile.rustTarget);

const result = spawnSync(npx, args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
