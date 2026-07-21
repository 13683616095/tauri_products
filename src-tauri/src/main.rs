#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WebviewUrl, WebviewWindowBuilder};

const SITE_URL: &str = "https://aimanjuzhizuo.com?ly=360";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let url = SITE_URL.parse()?;

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("AI漫剧创作")
                .inner_size(1440.0, 920.0)
                .min_inner_size(1024.0, 680.0)
                .resizable(true)
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 AI漫剧创作失败");
}
