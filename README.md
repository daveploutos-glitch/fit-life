# FIT LIFE

Chi Wai 個人健身任務站 — SpaceX-style **scroll storytelling**（全屏垂直章節，不是儀表板）。

線上：**https://daveploutos-glitch.github.io/fit-life/**

## 結構（IA）

固定極簡頂欄 → 長頁全屏章節：

1. **HERO** — goal physique 3D mannequin (auto-rotate / drag) · 87–90 kg · 12–15% · FIT LIFE / 102.6 kg baseline / BEGIN  
2. **MISSION** — 6 個月目標敘事與分期  
3. **TELEMETRY** — 體組成 + 體重 / BF / 步數圖  
4. **TRAINING** — Workout A mission patch + B 計劃  
5. **FUEL** — 熱量·蛋白·步數·睡眠大數字  
6. **LOG** — 編輯式日誌全文塊  
7. **FOOTER** — FIT AS FUCK · data version  

## 資料

| 路徑 | 說明 |
|---|---|
| `data/profile.json` | 個人檔、基準、訓練 A/B |
| `data/goals.json` | 6 個月計劃、分期、里程碑 |
| `data/log.json` | 每日記錄 |
| `version.json` | 建置標記 |

## 本機

```bash
python3 -m http.server 8765
```

## 授權

Private coaching data for Chi Wai / Fit as Fuck.
