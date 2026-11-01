# Kế hoạch: Buddy — thể trạng, thống kê và nhiệm vụ mới

> Trạng thái: **giai đoạn 1–2 đã code** (migration `20261101000001_add_daily_targets_and_weight_goals.sql` chưa chạy trên Supabase); giai đoạn 3–4 chưa làm. Mỗi giai đoạn ra một PR riêng, theo đúng thứ tự.

## Mục tiêu

1. Người dùng **biết mình đang ăn uống thế nào** — lục giác 6 chỉ số, chạm vào để xem thống kê.
2. Nhiệm vụ **chủ động, đa dạng, theo mục tiêu** (giảm / tăng / giữ cân) thay cho luật cộng điểm cố định.
3. Nhiệm vụ **đổi được từ xa** trên Supabase, không cần ra bản app.
4. Trang Buddy kiêm luôn trang thống kê.

## Quyết định đã chốt

| Chủ đề        | Quyết định                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 6 chỉ số      | 🎯 Mục tiêu calo · 🥗 Đủ chất · 🌿 Dinh dưỡng cao · ⏰ Đúng giờ · 🍽️ Đủ bữa · 📅 Duy trì (đổi ngày 01/11 cho sát chuyện ăn uống, giảm cân) |
| Cách tính     | Mỗi ngày chấm 0–100 từng trục → **trung bình toàn bộ lịch sử** (ngày có log, đã kết thúc)                                                  |
| Lớp "gần đây" | Lớp mờ = trung bình 7 ngày gần nhất, chồng lên hình chính                                                                                  |
| Theo mục tiêu | Mỗi ngày chấm theo **mục tiêu và kế hoạch của chính ngày đó**                                                                              |
| Gộp trang     | Trang Buddy = thú cưng + thống kê; chạm một trục → màn hình chi tiết                                                                       |
| Nhiệm vụ      | 3 loại cố định: **ngày (5)** · **tuần (5)** · **đặc biệt (3)** — hiện tất cả, không chọn ngẫu nhiên; ngưỡng/điểm/bật-tắt sửa trên Supabase |
| Điểm cũ       | Chốt điểm hiện tại làm **điểm gốc** — không ai bị tụt level                                                                                |
| Nhóm quản lý  | Thiết kế riêng sau; dùng lại bộ máy đo nhiệm vụ                                                                                            |

## Hiện trạng (đã kiểm tra trong code)

- Luật điểm, mốc level, huy hiệu **hardcode ở FE** (`buddy/constants/levels.ts`, `achievements/constants/achievements.ts`). Điểm được **tính lại từ nhật ký** mỗi lần mở trang (`buddyProgress.ts`, `activityStatsService.ts`), không lưu ở đâu.
- Lỗi logic: thưởng streak theo `longestStreak` → streak mới không được điểm cho tới khi vượt kỷ lục; "ngày cân bằng" (mỗi macro ≥ 70%) vẫn đạt khi ăn gấp đôi calo; người chăm chỉ (~66 điểm/ngày) lên max level 2500 sau ~5–6 tuần.
- Supabase `profiles` chỉ có **thông số đầu vào**; calo/macro tính lại trên máy.
- `daily_calorie_targets` (kế hoạch chốt theo ngày, mục tiêu chỉnh tay) và `weight_goals` **chỉ có trong SQLite**. Protein/carb/fat mục tiêu **không được chốt theo ngày** — ngày cũ luôn chấm theo profile hiện tại.
- `DailyNutritionSummary` đã có `nutrients` (chất xơ, đường, natri… — `null` = chưa biết). `react-native-svg` đã cài. Chưa có thư viện biểu đồ.
- Mẫu sẵn có để làm theo: `app_feature_flags` (bảng cấu hình đọc công khai), `weightLogSync.ts` (đẩy/kéo với cờ `synced`), `get_my_profile` (RPC `SECURITY DEFINER`).
- Notifications hiện chỉ là **nhắc nhở cục bộ** (`calorieReminderService.ts`), chưa có push từ server.
- App có OTA (`docs/OTA.md`): giai đoạn 1–3 chỉ đổi JS → ship được qua OTA, **miễn là migration đã chạy trước**.

## Quy tắc an toàn (Supabase chỉ có production)

- Migration **chỉ thêm** (bảng/cột mới, nullable hoặc có default); không đổi, không xoá cột cũ.
- **Chạy migration trước** khi phát hành bản app dùng nó (PostgREST từ chối cột lạ).
- Bản app cũ phải chạy bình thường khi migration đã áp dụng.
- Mọi bảng mới bật RLS; thêm vào danh sách xoá dữ liệu cloud trong `localDataReset.ts`.

---

## Giai đoạn 1 — Đồng bộ kế hoạch theo ngày (nền tảng)

**Vì sao trước:** lục giác và nhiệm vụ chấm mỗi ngày theo kế hoạch của ngày đó. Đổi máy / cài lại mà mất kế hoạch cũ thì lịch sử bị chấm sai.

### Supabase — `YYYYMMDD000001_add_daily_targets.sql`

```sql
CREATE TABLE IF NOT EXISTS public.daily_targets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date text NOT NULL,                       -- YYYY-MM-DD, giống weight_logs.log_date
  calorie_target integer NOT NULL CHECK (calorie_target > 0),
  protein_target_grams numeric,                    -- null: ngày chốt trước khi có cột này
  carbs_target_grams numeric,
  fat_target_grams numeric,
  goal_mode text CHECK (goal_mode IN ('lose', 'gain', 'maintain')),
  source text NOT NULL CHECK (source IN ('profile', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_date)
);
-- RLS: select/insert/update/delete own rows — chép nguyên khối policy của weight_logs.
```

### Máy (SQLite)

- `schemaUpgrades.ts`: thêm vào `daily_calorie_targets` các cột `protein_target_grams`, `carbs_target_grams`, `fat_target_grams` (REAL, nullable) và `synced INTEGER NOT NULL DEFAULT 0`.
- `dailyTargetRepository.ts` / `profileRepository.ts`: `freezeDailyTargets`, `recordDailyTarget`, `upsertDailyTargetOverride` ghi thêm macro mục tiêu và đặt `synced = 0`. Ngày đã chốt từ trước: điền macro từ profile hiện tại **một lần** (đánh dấu ước lượng là chấp nhận được).
- `listDailyTargets` trả thêm macro; `DailyNutritionSummary` thêm `proteinTargetGrams`, `carbsTargetGrams`, `fatTargetGrams` (rơi về profile hiện tại khi null).

### Đồng bộ

- `profile/services/dailyTargetSync.ts`, làm y như `weightLogSync.ts`: đẩy dòng `synced = 0`, kéo về, **bản sửa chưa đẩy trên máy thắng**.
- Gọi trong `useFoodLogSync` và sau khi đăng nhập (`authService.ts`, cạnh `syncUserProfileFromCloud`).
- Thêm `daily_targets` vào danh sách bảng xoá trong `localDataReset.ts`.

### Lịch sử mục tiêu cân nặng (`weight_goals`)

Cùng migration, thêm bảng cloud giống hệt bảng SQLite hiện có:

```sql
CREATE TABLE IF NOT EXISTS public.weight_goals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,                                -- id sinh trên máy
  mode text NOT NULL CHECK (mode IN ('lose', 'gain', 'maintain')),
  target_kg numeric,
  target_kcal_delta integer NOT NULL DEFAULT 0,
  target_days integer NOT NULL DEFAULT 0,
  start_weight_kg numeric,
  target_weight_kg numeric,
  monthly_rate_kg numeric,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
-- RLS: own rows, như weight_logs.
```

- SQLite: thêm cột `synced` cho `weight_goals`; `goalTrackingRepository.ts` (`replaceActiveWeightGoal`, `updateWeightGoalPlan`, `completeWeightGoal`) đặt `synced = 0`.
- `goals/services/weightGoalSync.ts` theo mẫu `weightLogSync.ts`; gọi cùng chỗ với `syncWeightLogs`.
- Kéo về: chỉ **một** mục tiêu `active` — nếu máy và cloud mỗi bên có một mục tiêu active khác nhau, bản `updated_at` mới hơn giữ `active`, bản kia chuyển `cancelled`.
- Thêm `weight_goals` vào danh sách xoá trong `localDataReset.ts`.

### Sửa chỗ dùng

- `activityStatsService.ts`: protein/cân bằng dùng **mục tiêu của từng ngày** thay vì `profile`.

### Kiểm thử

- Gộp dữ liệu khi kéo về (máy chưa đẩy thắng, cloud mới hơn thắng).
- Stats dùng mục tiêu theo ngày; ngày thiếu macro rơi về profile.
- Hai mục tiêu active từ hai máy → còn đúng một.
- Thủ công: log vài ngày + đặt mục tiêu → xoá app → đăng nhập lại → lịch streak, điểm, mục tiêu và lịch sử mục tiêu giữ nguyên.

---

## Giai đoạn 2 — Lục giác thể trạng và thống kê chi tiết

Chỉ hiển thị; **không đổi cách tính điểm**.

### Chấm điểm một ngày — `buddy/utils/dayScore.ts` (hàm thuần, có test)

`scoreDay({ summary, meals, nutrientCoverage }, profile) → Record<BuddyAxis, number | null>`

| Chỉ số            | 100 điểm khi                                                                                            | Giảm điểm                                                                                                                   | `null` khi                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 🎯 Mục tiêu calo  | calo trong khoảng đạt của `getDailyCalorieGoalState`                                                    | **lose:** vượt trên → về 0 khi vượt 50 % mục tiêu; dưới mức sàn → giảm. **gain:** thiếu → về 0. **maintain:** lệch hai phía | không có mục tiêu                              |
| 🥗 Đủ chất        | đạm, tinh bột, béo đều đạt mục tiêu ngày                                                                | trung bình tỉ lệ đạt của 3 chất (tối đa 100 % mỗi chất, ăn dư không cộng)                                                   | không có mục tiêu macro                        |
| 🌿 Dinh dưỡng cao | đủ chất xơ (14 g / 1000 kcal, 20–35 g) **và** đường, natri, béo bão hoà, trans, cholesterol dưới ngưỡng | trung bình điểm chất xơ và điểm giới hạn                                                                                    | < 70 % calo trong ngày có số liệu các chất này |
| ⏰ Đúng giờ       | mọi bữa chính đúng giờ, không ăn khuya                                                                  | tỉ lệ bữa đúng giờ; ăn từ 22h–4h trừ 30                                                                                     | không có bữa chính và không ăn khuya           |
| 🍽️ Đủ bữa         | đủ 3 bữa chính                                                                                          | số bữa chính / 3 (bữa phụ không tính)                                                                                       | —                                              |
| 📅 Duy trì        | ngày có ghi món                                                                                         | ngày trống = 0                                                                                                              | —                                              |

- Ngưỡng trong `buddy/constants/stats.ts`.
- Bữa chính theo khung giờ của app (`getMealTimeWindow`: sáng 5:00–10:30, trưa 10:30–14:30, tối 17:00–22:00); "đúng giờ" = trong ±1 tiếng giờ nhắc nhở đang bật của bữa đó, chưa bật thì sáng 6:00–9:30, trưa 11:00–13:30, tối 17:30–20:30 (`buddy/utils/mealTiming.ts`).
- Giờ ăn lấy theo `consumed_at`: ghi món muộn sẽ lệch giờ (chat AI có đặt giờ theo "sáng nay", "trưa nay"…).
- Độ phủ số liệu: `listNutrientCoverage` trong `dailySummaryService.ts`.

### Gộp điểm — `buddy/utils/axisAggregate.ts`

- **Hình chính:** trung bình mọi ngày **có log, đã kết thúc** (bỏ hôm nay). Bền bỉ = số ngày đạt / số ngày lịch kể từ ngày log đầu tiên.
- **Lớp gần đây:** cùng công thức cho 7 ngày gần nhất.
- Trục có < 3 ngày dữ liệu → `null` (vẽ mờ, "log thêm để mở khóa"). Tổng < 3 ngày log → thẻ "Buddy đang làm quen với bạn…".
- Tính chung một lượt với `getActivityStats` (đã tải toàn bộ tổng kết ngày) — không truy vấn thêm.

### Giao diện

- `buddy/components/BuddyStatsHexagon/` — SVG thuần: lưới, hình chính (đặc), lớp 7 ngày (mờ/nét đứt), nhãn + icon, vùng chạm từng trục. Hình học tách ra `hexagonGeometry.ts` (có test).
- Câu nhận xét của Buddy dưới linh vật: chọn theo trục mạnh nhất/yếu nhất + mục tiêu → khoá i18n `buddy.insight.*`.
- Route mỏng `app/(main)/buddy-stat/[axis].tsx` → `BuddyAxisDetailScreen`:
  - `SegmentedControl` 7 ngày / 30 ngày / từ đầu
  - biểu đồ cột SVG (`buddy/components/AxisBarChart`), vạch mục tiêu
  - trung bình, ngày tốt nhất, số ngày đạt
  - món đóng góp nhiều nhất (truy vấn `food_entries` theo `meal_name`, cộng chất của trục)
  - mẹo từ Buddy
- Sắp xếp lại `BuddyScreen`: linh vật + level → lục giác → _(chỗ cho nhiệm vụ, giai đoạn 3)_ → lịch streak → huy hiệu → hành trình + luật điểm gom vào `Accordion`.
- i18n EN/VI cho mọi chuỗi mới.

### Kiểm thử

- `scoreDay` cho cả 3 mục tiêu, các giá trị `null`, biên ngưỡng.
- Gộp điểm: bỏ hôm nay, bỏ ngày trống, ngưỡng 3 ngày.
- Thủ công trên simulator: sáng/tối, chạm từng trục, người dùng mới (< 3 ngày).

---

## Giai đoạn 3 — Hệ thống nhiệm vụ mới

### Supabase — `YYYYMMDD000001_add_buddy_quests.sql`

```sql
-- Cấu hình — sửa trên Dashboard. Ai cũng đọc được, không ai ghi qua API.
CREATE TABLE IF NOT EXISTS public.buddy_quests (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('daily', 'weekly', 'special', 'event')),  -- 'event' dành cho giai đoạn 4
  metric text NOT NULL,                         -- khoá trong bộ máy đo của app
  comparator text NOT NULL CHECK (comparator IN ('gte', 'lte')),
  target numeric NOT NULL,
  target_unit text NOT NULL DEFAULT 'absolute'
    CHECK (target_unit IN ('absolute', 'percent_of_target')),
  required_days integer CHECK (required_days > 0),  -- weekly/event: số ngày cần đạt
  axis text,                                     -- trục lục giác mà nhiệm vụ luyện
  goal_modes text[],                             -- null = mọi mục tiêu
  points integer NOT NULL CHECK (points BETWEEN 0 AND 500),
  title jsonb NOT NULL,                          -- {"vi": "Ăn đủ {{target}} protein", "en": "..."}
  description jsonb,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lần hoàn thành — điểm được chốt tại thời điểm hoàn thành.
CREATE TABLE IF NOT EXISTS public.buddy_quest_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id text NOT NULL,
  period_key text NOT NULL,                      -- '2026-11-01' (ngày) | '2026-W45' (tuần) | 'once' | id mục tiêu cân | 'legacy'
  points integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id, period_key)
);
```

- RLS `buddy_quests`: select cho `anon, authenticated` (như `app_feature_flags`).
- RLS `buddy_quest_completions`: chỉ **select** dòng của mình; **ghi qua RPC**:
  - `complete_buddy_quest(p_quest_id, p_period_key)` — `SECURITY DEFINER`, **lấy điểm từ `buddy_quests`** (client không tự đặt điểm), kiểm tra nhiệm vụ đang bật và kỳ nằm trong khoảng hợp lệ (tối đa 1 ngày/tuần trước), `ON CONFLICT DO NOTHING`. Nhiệm vụ `create_account` được **server tự kiểm tra** `auth.jwt() ->> 'is_anonymous'` = false.
  - `claim_buddy_legacy_points(p_points)` — ghi một lần dòng `quest_id = 'legacy'`, có trần (ví dụ ≤ 5000).
- Seed bộ nhiệm vụ mặc định (dưới).
- Thêm `buddy_quest_completions` vào danh sách xoá trong `localDataReset.ts`.

### Máy

- Bảng SQLite `buddy_quest_completions` (cùng cột + `synced`) → hoàn thành offline, đẩy lên khi có mạng (mẫu `weightLogSync.ts`).
- Cấu hình nhiệm vụ: React Query + lưu đệm MMKV; **không cấu hình Supabase hoặc lỗi mạng → dùng `buddy/constants/defaultQuests.ts`** đi kèm app.

### Bộ máy đo — `buddy/quests/`

- `metrics.ts`: registry `metric → kết quả đạt/chưa + tiến độ`. Bản đầu (đủ cho 14 nhiệm vụ):

  | metric                | Một ngày đạt khi                                                             | Xét lúc nào                                                                     |
  | --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
  | `first_log`           | có ≥ 1 món trong ngày                                                        | ngay khi log                                                                    |
  | `calorie_goal`        | calo trong khoảng đạt của `getDailyCalorieGoalState` (theo mục tiêu ngày đó) | **khi hết ngày** (giữa ngày có thể đạt rồi ăn vượt); trong ngày hiện "đang đạt" |
  | `diverse_menu`        | đạm, tinh bột, béo **mỗi chất ≥ 10 % calo trong ngày** (không xét mục tiêu)  | ngay khi đạt                                                                    |
  | `within_limits`       | mọi chất trong danh sách giới hạn ≤ ngưỡng (bỏ qua chất `null`)              | **khi hết ngày**, ngày phải có ≥ 2 bữa                                          |
  | `fiber_enough`        | chất xơ ≥ ngưỡng                                                             | ngay khi đạt                                                                    |
  | `pet_level_up`        | level Buddy tăng                                                             | khi lên cấp                                                                     |
  | `weight_goal_reached` | `weight_goals` chuyển sang `completed`                                       | khi hoàn thành mục tiêu                                                         |
  | `create_account`      | tài khoản không còn ẩn danh (`isAnonymous = false`)                          | sau đăng ký / liên kết                                                          |

- Nhiệm vụ **tuần** = áp metric ngày cho cả 7 ngày (thứ Hai → Chủ nhật); cần 7/7 ngày, riêng `week_calorie_goal` cần ≥ 5/7 (dùng `required_days`). **Ngày không log tính là trượt** (nếu không, log 1 ngày cũng qua "không ngày nào vượt khuyến cáo"). Kết quả chốt khi hết tuần; riêng "log đủ 7 ngày" hoàn thành ngay khi log ngày thứ 7.
- Ngưỡng giới hạn (đường, natri, chất béo bão hoà, chất béo trans, cholesterol) để trong `buddy_quests.target` dạng jsonb hoặc `nutritionThresholds.ts` — chốt khi code. **Không có kali** (kali là chất nên ăn đủ, không phải giới hạn).
- `evaluateQuest.ts`: đổi `percent_of_target` ra số cụ thể; trả tiến độ ("18 / 25 g chất xơ", "4 / 7 ngày").
- Metric lạ (cấu hình mới hơn app) → **bỏ qua nhiệm vụ**, không lỗi.
- Hiện **tất cả** nhiệm vụ đang bật của từng loại (không chọn ngẫu nhiên); lọc theo `is_active`, thời gian, `goal_modes`.
- Kiểm tra hoàn thành khi nhật ký thay đổi (sau invalidate query) và khi mở app (chốt hôm qua và tuần vừa hết).
- **Log bù:** món thêm cho hôm qua vẫn được tính, nhiệm vụ của hôm qua chốt tới hết hôm nay. Riêng `first_log` chỉ tính cho **hôm nay** (log bù không nhận).

### Điểm và level

```
tổng điểm = điểm gốc (legacy) + tổng điểm trong buddy_quest_completions
```

- **Chuyển đổi:** lần đầu chạy bản mới, tính điểm theo công thức cũ → `claim_buddy_legacy_points`. Không ai tụt level.
- **Bỏ toàn bộ điểm tự động cũ** (log, đúng calo, cân bằng, streak) — đã thành nhiệm vụ ngày/tuần. Lịch streak và huy hiệu streak vẫn giữ.
- **`pet_level_up` không cho điểm** (điểm → lên cấp → điểm là vòng lặp); thưởng bằng huy hiệu/hiệu ứng.
- **Level 1–10**, giữ nguyên mốc 1–5 hiện tại để không ai tụt:
  `0 · 300 · 800 · 1500 · 2500 · 4000 · 6000 · 8500 · 11500 · 15000`
  (tối đa ~65 điểm/ngày + ~65 điểm/ngày quy từ nhiệm vụ tuần → người làm đủ max sau ~4 tháng). Linh vật vẫn 5 giai đoạn, mỗi giai đoạn 2 level → không cần vẽ thêm.

### Đã bỏ: nhiệm vụ "đánh giá app"

Apple (App Review Guidelines 5.6.1) và Google Play (chính sách User Ratings) cấm thưởng để đổi lấy đánh giá; app cũng không kiểm chứng được người dùng đã đánh giá. Không làm nhiệm vụ này.

### Giao diện

- `QuestSection` dùng chung cho 3 loại, đặt trong `SegmentedControl` **Ngày · Tuần · Đặc biệt**.
  - Ngày: 5 nhiệm vụ, tiến độ ("18 / 25 g chất xơ"), trạng thái "đang đạt — chốt cuối ngày" cho `calorie_goal` và `within_limits`.
  - Tuần: 7 chấm cho 7 ngày (đạt / trượt / chưa tới), "4 / 7 ngày".
  - Đặc biệt: đã nhận / chưa; nút đi tới chỗ làm (đăng ký, mục tiêu cân).
- Hoàn thành → `Snackbar` + hiệu ứng nhỏ trên linh vật.
- Thẻ "Cách nhận điểm" viết lại theo hệ thống mới.
- Chuỗi từ DB: `title[lang] ?? title.en`, nội suy `{{target}}` kèm đơn vị đã định dạng.

### Bộ nhiệm vụ mặc định (seed, sửa sau trên Dashboard)

| id                    | kind    | metric              | điều kiện                                                           | kỳ              | axis       | điểm         |
| --------------------- | ------- | ------------------- | ------------------------------------------------------------------- | --------------- | ---------- | ------------ |
| `day_first_log`       | daily   | first_log           | log món đầu tiên                                                    | ngày            | endurance  | 5            |
| `day_calorie_goal`    | daily   | calorie_goal        | calo đạt mục tiêu (theo giảm/tăng/giữ)                              | ngày            | discipline | 20           |
| `day_diverse`         | daily   | diverse_menu        | có đủ đạm, tinh bột, béo                                            | ngày            | balance    | 10           |
| `day_limits`          | daily   | within_limits       | không vượt khuyến cáo đường, natri, béo bão hoà, trans, cholesterol | ngày            | defense    | 15           |
| `day_fiber`           | daily   | fiber_enough        | chất xơ ≥ ngưỡng (14 g / 1000 kcal mục tiêu, trong khoảng 20–35 g)  | ngày            | vitality   | 15           |
| `week_log`            | weekly  | first_log           | log đủ 7/7 ngày                                                     | tuần            | endurance  | 50           |
| `week_calorie_goal`   | weekly  | calorie_goal        | ≥ 5/7 ngày đạt mục tiêu                                             | tuần            | discipline | 150          |
| `week_limits`         | weekly  | within_limits       | 7/7 ngày không vượt khuyến cáo                                      | tuần            | defense    | 100          |
| `week_fiber`          | weekly  | fiber_enough        | 7/7 ngày đủ chất xơ                                                 | tuần            | vitality   | 100          |
| `week_diverse`        | weekly  | diverse_menu        | 7/7 ngày đa dạng                                                    | tuần            | balance    | 50           |
| `special_level_up`    | special | pet_level_up        | Buddy lên cấp                                                       | mỗi lần lên cấp | —          | 0 (huy hiệu) |
| `special_weight_goal` | special | weight_goal_reached | đạt mục tiêu cân nặng                                               | mỗi mục tiêu    | —          | 300          |
| `special_account`     | special | create_account      | tạo tài khoản                                                       | 1 lần           | —          | 100          |

`special_weight_goal` lưu `period_key` = id mục tiêu → nhân tiện **lịch sử đạt mục tiêu được lưu lên cloud**.

### Kiểm thử

- Từng metric; `calorie_goal` và `within_limits` chỉ chốt sau khi hết ngày; chất `null` bị bỏ qua.
- Nhiệm vụ tuần: ngày không log = trượt; "log 7/7" hoàn thành ngay ngày thứ 7.
- Lọc theo bật/tắt, thời gian, mục tiêu; metric lạ bị bỏ.
- Tổng điểm + điểm gốc: người dùng cũ không tụt level; nhiệm vụ 1 lần không nhận lại được.
- RPC: không tự đặt điểm, không ghi trùng, không ghi kỳ quá cũ (kiểm thử thủ công trên Supabase).

---

## Giai đoạn 4 — Sự kiện, giao riêng, push (thiết kế chi tiết sau)

- `kind = 'event'` + `starts_at`/`ends_at` đã có từ giai đoạn 3; thêm huy hiệu sự kiện (cột `badge_icon` hoặc bảng riêng).
- `buddy_quest_assignments (user_id, quest_id)` — chỉ làm nếu cần giao cho từng người / nhóm (dùng lại cho **nhóm quản lý**).
- Push "Buddy có nhiệm vụ mới": bảng push token + Edge Function + cấu hình EAS → **cần bản build mới**, không OTA được.

## Nhóm quản lý (thiết kế riêng)

Dùng lại `buddy/quests/metrics.ts` + `evaluateQuest.ts`; bảng riêng `group_challenges` theo `group_id`; điểm nhóm tách khỏi điểm Buddy (hoặc có trần); thành viên phải đồng ý chia sẻ, quản lý chỉ thấy đạt/chưa đạt.

---

## Thứ tự phát hành

| Bước | Việc                                                   | Ship                 |
| ---- | ------------------------------------------------------ | -------------------- |
| 1    | Migration `daily_targets` → PR giai đoạn 1             | OTA                  |
| 2    | PR giai đoạn 2 (không có migration)                    | OTA                  |
| 3    | Migration `buddy_quests` + seed + RPC → PR giai đoạn 3 | OTA                  |
| 4    | Giai đoạn 4                                            | Bản build mới (push) |

Mỗi PR chạy `yarn validate` và `yarn test`, kiểm tra trên simulator trước khi merge.

## Quyết định đã chốt thêm

1. **Chất xơ:** 14 g / 1000 kcal mục tiêu của ngày, giới hạn trong 20–35 g (dùng cho cả trục Sinh lực và nhiệm vụ).
2. **Log bù:** được tính cho hôm qua; `first_log` chỉ tính hôm nay.
3. **`weight_goals`:** đồng bộ lên Supabase ngay ở giai đoạn 1 (nhiệm vụ "đạt mục tiêu cân nặng" cần nó).
4. **Level 6–10:** dùng lại hình 5 giai đoạn, mỗi giai đoạn 2 level.
5. **Thực đơn đa dạng:** đạm, tinh bột, béo mỗi chất ≥ 10 % calo trong ngày.
6. **Đạt mục tiêu tuần:** ≥ 5/7 ngày. Các nhiệm vụ tuần còn lại cần 7/7.
7. **Giới hạn khuyến cáo:** đường, natri, chất béo bão hoà, chất béo trans, cholesterol — không có kali.
8. **Đánh giá app:** bỏ.

## Câu hỏi mở

1. Nhóm quản lý: "quản lý" là ai — HLV/chuyên gia dinh dưỡng, công ty/phòng gym, hay bạn bè/gia đình? (Không chặn giai đoạn 1–3.)
