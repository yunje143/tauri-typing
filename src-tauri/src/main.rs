//Prevents additional console window on Windows in release, DO NOT REMOVE!!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// fn main() {
//     tauri_typing_lib::run()
// }

// avoid depending on tauri::api to keep compatibility across tauri versions

#[derive(serde::Deserialize, serde::Serialize, Debug)]
struct Word {
    ja: String,
    en: String,
}

// Tauriコマンド定義: JSONファイルを読み込んで返す
#[tauri::command]
fn load_words_data() -> Result<Vec<Word>, String> {
    use std::fs;
    // src/data/default.json を探索
    let path = find_default_json().ok_or_else(|| {
        "data/default.json が見つかりませんでした。".to_string()
    })?;
    
    // ファイルを読み込み
    let contents = fs::read_to_string(&path).map_err(|e| format!("ファイル読み込みエラー ({}): {}", path.display(), e))?;

    // JSONを構造体にパース
    let words: Vec<Word> = serde_json::from_str(&contents)
        .map_err(|e| format!("JSONパースエラー: {}", e))?;

    Ok(words)
}

// Try several locations to find src/data/default.json so it works in dev and packaged apps.
fn find_default_json() -> Option<std::path::PathBuf> {
    // 1) Check TAURI_RESOURCE_DIR env (if set by environment or packaging)
    if let Ok(dir) = std::env::var("TAURI_RESOURCE_DIR") {
        let candidate = std::path::PathBuf::from(dir).join("data/default.json");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // 2) Try current working directory (dev: src-tauri から実行時)
    if let Ok(cwd) = std::env::current_dir() {
        let candidate = cwd.join("../src/data/default.json");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // 3) Try from project root (dev: npm run tauri dev で実行時)
    if let Ok(cwd) = std::env::current_dir() {
        let candidate = cwd.join("src/data/default.json");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // 4) As a last resort, look next to the executable (packaged app)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join("data/default.json");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    None
}



fn main() {
    tauri::Builder::default()
        // ★ 定義したコマンドを登録する ★
        .invoke_handler(tauri::generate_handler![load_words_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}