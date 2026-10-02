# FIT LIFE · COMMAND

Chi Wai 個人健身／健康生活儀表板（cyberpunk neon HUD）。  
線上：**https://daveploutos-glitch.github.io/fit-life/**

架構靈感來自 CFA L2 cards 靜態站（GitHub Pages + JSON 資料），但視覺完全不同：暗底霓虹、玻璃面板、進度環、Chart.js。

## 開啟

- Pages：https://daveploutos-glitch.github.io/fit-life/
- 本機：於本目錄開靜態伺服器，例如 `python3 -m http.server 8765`，再開 `http://localhost:8765/`

## 結構

| 路徑 | 說明 |
|---|---|
| `index.html` | 主頁（Trad Chinese UI + English tech accents）|
| `styles.css` / `app.js` | 霓虹 HUD 樣式與邏輯 |
| `data/profile.json` | 個人檔、基準體組成、訓練模板 A/B、每日目標 |
| `data/goals.json` | 6 個月計劃、分期、里程碑、習慣芯片 |
| `data/log.json` | 每日記錄（體重、步數、訓練、飲食估計、日誌）|
| `version.json` | 建置標記 |
| `.nojekyll` | 讓 GitHub Pages 唔經 Jekyll |
| `tools/sync_data.py` | 之後由 `/home/box/fitness/log.md` 重建 `data/log.json` 的輔助腳本 |

## Coach 更新資料流程

1. 喺 box 編輯 `/home/box/fitness/log.md`（同 `plan.md`）
2. 更新 JSON：
   - 手改 `data/log.json` / `data/profile.json` / `data/goals.json`，**或**
   - 跑 `python3 tools/sync_data.py`（啟發式解析；複雜日建議手維護）
3. 更新 `version.json` 的 `built` / `version`
4. `git add -A && git commit -m "…" && git push`
5. 等 GitHub Pages 約 30–90 秒刷新

## 本機狀態（唔會因 deploy 消失）

瀏覽器 `localStorage` 儲存：

- 習慣芯片開關（`fitlife.habits.v1`）
- 私人備註（`fitlife.notes.v1`）

同 CFA 站一樣：網站更新唔會清用戶裝置上嘅本地勾選／備註。

## 基準數字（2026-10-01 howbodyfit）

- 體重 **102.6 kg** · BMI 30.6 · 體脂 **29.8%** · 脂肪 30.6 kg
- 骨骼肌 41.3 kg · FFM 72 kg · 內臟脂肪 12 · WHR 0.97
- BMR 1925 · 代謝年齡 31 · 儀器理想 93.7 kg
- 先前自報起步 ~108 kg（2026-09-28，pre-scale）

## 授權

Private coaching data for Chi Wai / Fit as Fuck. Repo may be public for Pages convenience.
