# AI Tycoon｜出征閉環 + 成長薄片（切片 A）

垂直切片：**派 WOLF 出征 → 等待 → 帶戰果歸來 → 戰績牆**；兩次真實 settle 後可對照績效。  
純前端 mock 引擎；**非真實資金**（`real_trading=false` 常駐標紅）。

成長只錨 BattleResult 數字差異。無 XP／等級／徽章／信用／競技榜。

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
6. **55–60s｜戰績牆／再派**：首次進場牆是空的（G4）。點「再出征」回大廳再派一輪；第二次歸來才出現兩次對照。

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
| `src/engine/growthCompare.ts` | 最近兩筆正式牆 → GrowthCompare／verdict |
| `src/store/expeditionStore.ts` | 三屏狀態機、不可重派、戰績牆 localStorage |
| `src/data/wolf.ts` | WOLF 人設預置 |
| `src/data/copySlots.ts` | 六槽文案＋G0–G4 成長對照 |
| `src/components/screens/*` | 首屏／出征中／歸來 |
| `src/__tests__/expedition.test.ts` | 重派阻擋、重放一致、必填欄位 |
| `src/__tests__/growthCompare.test.ts` | 空牆、對照選筆、delta／verdict |

---

## 硬約束（已實作）

- 結算只認引擎 `BattleResult`；同 `sandbox_run_id` → 同 `realized_pnl`／`return_pct`
- `in_progress` 不可再派；**無取消**
- UI 只展示可講欄位；不渲染 run_id／feed／score／信用
- 戰績牆 persist `localStorage`；**零次出征＝空牆**，不預置 mock 歷史
- 同一 `agent_id`（WOLF）最近兩筆正式牆紀錄組成 `GrowthCompare`（`prev` 較舊、`curr` 較新）
- `verdict` 只看 `delta_return_pct`：`>0` better、`<0` worse、`=0` flat；不足兩筆＝none
- 重放不一致結果不進正式牆

## 成長對照怎麼驗

1. 清掉本機 `localStorage` 的 `ai-tycoon-battle-wall`（或無痕視窗）。
2. 首屏戰績牆應為空態：「戰績牆還是空的…」
3. 出征一次 → 歸來有戰報，牆上一筆，文案 G0（尚不能對照）。
4. 再出征一次 → 歸來六欄下方出現「兩次對照」：上次／這次的 `realized_pnl`、`return_pct`、`max_drawdown`、`trade_count`，以及三欄 delta。大廳戰績牆頂可看到同一對照。
5. 用 `delta_return_pct` 指出這次比較好或比較差（G2／G3）；截圖應是同一隻 WOLF 的戰績，不是發經驗值。

## 不做（Out of scope）

信用／經濟／競技榜、K 線、手動下單、取消、真實資金、score、XP／等級／徽章、第二隻 Agent。

---

## 授權與免責

本 repo 為產品切片 demo，所有數字皆為 **sandbox_USD 模擬盤**。
