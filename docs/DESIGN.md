# Check Calo Minimal Dark Design System

## Product

Check Calo is a mobile-first nutrition tracker for Vietnamese users who want to log meals, estimate calories, review macros, and follow weight goals quickly.

The interface should feel more like a focused daily dashboard than a health admin tool. It should be minimal, dark, bold, and easy to scan with one hand.

## Target Mood

Use the reference direction: a dark calorie dashboard with large typography, rounded black/charcoal cards, simple icons, strong numeric hierarchy, and a floating green add button.

Keywords:

- Minimal
- Dark-first
- Soft rounded
- Numeric
- Calm
- Daily-use
- Friendly, not clinical

Avoid:

- Busy dashboards
- White clinical layouts
- Heavy borders
- Nested cards
- Long explanation text
- Decorative gradients
- Marketing-page sections

## Audience

- Vietnamese adults tracking calories, macros, and weight goals.
- Users logging meals several times per day.
- Users who want fast input and simple feedback.
- Users who prefer friendly Vietnamese copy.

## Theme Direction

Design dark mode as the primary visual experience. Light mode can exist later, but Stitch concepts should start from dark UI.

### Core Colors

- App background: `#000000`
- Card surface: `#1C1C1E`
- Card surface elevated: `#202124`
- Pressed surface: `#2A2A2D`
- Primary text: `#F4F4F5`
- Secondary text: `#A1A1AA`
- Muted text: `#71717A`
- Hairline border: `#2F2F33`
- Primary action green: `#52A13C`
- Primary action green bright: `#64C31F`
- White active pill: `#F4F4F5`
- Black text on active pill: `#111111`

### Macro Colors

- Carbs: `#FFD15C`
- Protein: `#FF7A7A`
- Fat: `#52C95A`
- Burned/fire: `#FF4D2E`
- Target/trophy: `#FFCC33`

Use macro colors mainly in small progress bars and icons. Do not flood cards with color.

## Typography

Use Inter or a similar rounded sans-serif. Typography should be bigger and bolder than the current app.

- App title: 36-44px, extra bold.
- Section title: 22-28px, bold.
- Card metric number: 32-40px, bold.
- Food title: 20-24px, medium or semibold.
- Body labels: 15-17px, semibold.
- Caption/time/meta: 13-15px, medium.

Rules:

- Numeric data should be the visual anchor.
- Labels should be short and muted.
- Do not use tiny text for important calorie or macro values.
- Keep letter spacing at `0`.

## Layout Principles

- Mobile-first reference frame: 390px wide.
- Use safe area padding.
- Main content padding: 24px horizontal.
- Vertical rhythm: 20-28px between major sections.
- Cards use 24-32px radius.
- Avoid visible full-width dividers unless necessary.
- Use wide, soft cards instead of outlined boxes.
- Keep the bottom navigation floating above the system navigation area.

## App Shell

### Header

The home header should be minimal:

- Large brand/app title on the left, e.g. `Check Calo`.
- Small rounded date/today pill on the right.
- No dense toolbar.
- No marketing copy.

### Week Selector

Use a simple horizontal week row:

- Day label above date number.
- Active day is a filled white circle or pill.
- Inactive days use dashed or subtle circular outlines.
- Keep it monochrome except active state.

### Bottom Navigation

Use a floating dark pill navigation:

- Rounded capsule container.
- Four tabs max: Home, Progress, Wellness, Profile.
- Active tab gets a darker/lighter filled rounded segment.
- Icons above labels.
- Add button is separate: large circular green floating action button on the right.

The add button should be the strongest CTA on the screen.

## Home Screen

The home screen should prioritize daily calorie status.

Structure:

1. Header with app title and Today pill.
2. Week selector.
3. Large summary card.
4. Macro cards row.
5. Recently logged meals list.
6. Floating bottom navigation and add button.

### Large Summary Card

Use one large charcoal card with two zones:

- Left: friendly food mascot or simple food illustration.
- Right: three vertical metrics:
  - Target
  - Consumed
  - Burned

Metric style:

- Small emoji or simple icon.
- Label in muted text.
- Number large and white.
- Unit small and muted.

Example:

- `Target 3003 kcal`
- `Consumed 689 kcal`
- `Burned 0 kcal`

If using illustration, keep it monochrome/white with one green or yellow accent. Do not use complex stock photos.

### Macro Cards

Use three small rounded cards in a row:

- Carbs
- Protein
- Fat

Each card:

- Label top-left.
- Large current value.
- Target value small after slash.
- Thin progress bar at bottom.
- Card background charcoal.
- No extra icons unless very small.

Example:

- `Carbs 64/375 g`
- `Protein 89/150 g`
- `Fat 72/100 g`

### Recently Logged Meals

Use a simple list under `Recently`:

- Card-like row with large radius.
- Left icon or thumbnail.
- Food name.
- Calories and macro chips in one line.
- Time aligned right.

Example row:

- `Trứng gà`
- `500 kcal | carbs 50 protein 60 fat 70`
- `6:18 PM`

Rows should look tappable but quiet.

## Goal Progress Card

Keep goal progress minimal and dark:

- Surface: charcoal card.
- Title: `Kế hoạch: Giảm 1 kg`
- Subtitle: `Tiến độ hiện tại: 10/30 ngày`
- Circular percentage progress or compact progress bar.
- Metric cells should use dark outline or separated spacing, not grey background blocks.
- Metric values should be white or primary green when positive.

Do not make this card look like a form. It should feel like a status widget.

## Food Detail Screen

Use a focused inspection layout:

- Large food photo at top with rounded corners.
- Food name below in large type.
- Calories as the primary number.
- Macro cards below.
- Date/time and quantity as compact metadata.
- Edit action as a floating or top-right button.

Keep the dark background. Avoid a long white detail sheet.

## Food Form Screen

The form should be minimal but usable:

- Top image/photo picker block.
- Food name input.
- Calories input.
- Macro input row: protein, carbs, fat.
- Quantity and consumed time.
- Notes collapsed or lower priority.
- Save button sticky at bottom or clearly visible.

Inputs should be dark rounded fields, not bordered white boxes.

## Goal History Screen

Use a timeline/list style:

- Dark background.
- Section title large.
- Goal cards with status pill.
- Start/end dates as muted text.
- Progress number prominent.
- Completed goals can use subtle green accents.

Avoid tables.

## AI Review

AI review should look like a compact insight card:

- Small AI/shine icon.
- Title: short and practical.
- Summary: 1-2 lines.
- Bullet highlights if needed.
- CTA: `Xem nhận xét AI`.

Do not present AI as medical advice. Keep copy careful and supportive.

## Component Style

### Cards

- Background: `#1C1C1E`
- Radius: 24-32px for primary dashboard cards.
- Padding: 20-24px.
- Shadow: minimal or none in dark mode.
- Border: optional 1px `#2F2F33` only when separation is needed.

### Buttons

- Primary: green filled pill.
- Secondary: dark filled pill with subtle border.
- Icon buttons: circular dark surface.
- Destructive: red text or muted red pill, not full red blocks unless confirmation.

### Progress Bars

- Height: 6-8px.
- Track: `#3A3A3D`.
- Fill: macro color or green.
- Fully rounded.

### Chips and Pills

- Use for date, filters, status, and compact labels.
- Active pill may be white with black text.
- Inactive pill should be dark with muted text.

## Icon and Image Style

Use simple, rounded icons. Icons should be monochrome or use one semantic accent color.

Food thumbnails may use emoji-like illustrations or user photos. For dashboard hero art, prefer a friendly simple food mascot or minimal food illustration.

Avoid realistic stock-food hero images for the main dashboard.

## Copy Style

Primary app language is Vietnamese. Keep UI copy compact.

Use:

- `Hôm nay`
- `Calories`
- `Đã nạp`
- `Mục tiêu`
- `Đã đốt`
- `Gần đây`
- `Thêm món`
- `Kế hoạch: Giảm 1 kg`
- `Tiến độ hiện tại: 10/30 ngày`

Avoid long helper text inside main screens.

## Accessibility

- Maintain high contrast on black backgrounds.
- Touch targets should be at least 44px.
- Progress bars need numeric values nearby.
- Do not rely only on macro colors; keep text labels.
- Large add button must have a clear accessibility label.

## Stitch Usage Notes

When using Stitch:

- Generate actual mobile app screens, not landing pages.
- Use a dark 390px mobile frame.
- Follow the reference mood: black background, charcoal cards, large white numbers, rounded tabs, green floating add button.
- Use realistic Vietnamese text.
- Keep screens sparse and scannable.
- Reuse the same card, nav, macro, and meal row patterns across all screens.
- Do not include explanatory text about how to use the app unless it is an empty state.
