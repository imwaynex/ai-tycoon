# AI Tycoon｜出征閉環 Demo

第一版垂直切片：**派 WOLF 出征 → 等待 → 帶戰果歸來 → 戰績牆**。  
純前端 mock 引擎；**非真實資金**（`real_trading=false` 常駐標紅）。

對齊規格（`/workspace/tycoon-specs/`）：
- 出征閉環-產品確認.md
- 出征閉環-實作基準.md
- 60秒魔法動線-驗收.md
- WOLF-人設卡-定稿.md
- 文案槽-六槽-定稿.md
- 狀態機-對齊實作基準.md

---

## 快速開始

```bash
cd /workspace/ai-tycoon
npm install
npm run dev
```

瀏覽器開啟終端機顯示的本機位址（通常 `http://localhost:5173`）。

```bash
npm test        # 單元測試
npm run build   # 生產建置
```

---

## 60 秒驗收動線

1. **0–10s｜首屏**：看見開場句「歡迎來到 AI Tycoon。你的目標，是建立全世界最強的 AI 交易帝國。」與模擬盤紅標。
2. **10–20s｜WOLF 卡**：記住名字 **WOLF**、定位 **動能交易員**。
3. **20–25s｜出征**：點「出征」→ 進入出征中（無取消鈕）。
4. **25–40s｜等待**：演示加速 **2–4 秒**（模板 `planned_duration_sec=300` 仍寫入結果）。
5. **40–55s｜歸來**：看見戰報句＋可講六欄（status / realized_pnl / return_pct / max_drawdown / trade_count / actual_duration_sec）。
6. **55–60s｜戰績牆／再派**：牆有紀錄；點「再出征」回大廳再派一輪，對照兩筆數字差異。

驗收硬句：  
「我有一座 AI 交易帝國，我剛派 WOLF 出去，它賺了錢回來。」  
（演示 happy path 偏向正 pnl；虧損／`failed_*` 仍可走通。）

---

## 失敗態怎麼觸發

- **預設**：約 **10%** seeded 機率走 `failed_*`（由 `sandbox_run_id` 決定，可重放）。
- **開發者選項**（首屏底部摺疊）：勾選「強制失敗態」→ 下次出征必為 `failed_risk_breach` / `failed_timeout` / `failed_data` / `failed_constraint` 之一。
- 失敗用文案槽⑤；成功（含虧損 completed）用槽④。數字只來自引擎，不寫進靜態文案。

---

## 關鍵檔案

| 路徑 | 用途 |
|------|------|
| `src/engine/mockEngine.ts` | Mock 引擎、決定性重放、BattleResult |
| `src/store/expeditionStore.ts` | 三屏狀態機、不可重派、戰績牆 localStorage |
| `src/data/wolf.ts` | WOLF 人設預置 |
| `src/data/copySlots.ts` | 六槽文案＋數字插值 |
| `src/components/screens/*` | 首屏／出征中／歸來 |
| `src/__tests__/expedition.test.ts` | 重派阻擋、重放一致、必填欄位 |

---

## 硬約束（已實作）

- 結算只認引擎 `BattleResult`；同 `sandbox_run_id` → 同 `realized_pnl`／`return_pct`
- `in_progress` 不可再派；**無取消**
- UI 只展示可講欄位；不渲染 run_id／feed／score／信用
- 戰績牆 persist `localStorage`（啟動預置 ≥5 筆 mock 歷史）
- 重放不一致結果不進正式牆

## 不做（Out of scope）

信用／經濟／競技榜、K 線、手動下單、取消、真實資金、score。

---

## 授權與免責

本 repo 為產品切片 demo，所有數字皆為 **sandbox_USD 模擬盤**。
