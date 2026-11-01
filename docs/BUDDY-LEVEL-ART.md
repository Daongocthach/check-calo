# Buddy level art — bộ mèo theo cấp

Bộ 10 ảnh thay cho `assets/buddy/level-1…5.webp` hiện tại (5 ảnh đó trùng với `box`, `wave`, `cool`, `gym`, `trophy` trong `assets/mascot/`, nên các cấp trông giống nhau và lẫn với mascot header).

## Nguyên tắc

- **5 giai đoạn × 2 ảnh.** Cấp lẻ là ảnh chính của giai đoạn; cấp chẵn là chính ảnh đó thêm một chi tiết nhỏ.
- **Mèo lớn dần thấy rõ:** cỡ người tăng theo bảng dưới, đầu nhỏ dần so với thân.
- **Phụ kiện cộng dồn trong giai đoạn**, đổi bộ khi sang giai đoạn mới.
- **Viền / hào quang** tăng dần, Master mới có hào quang vàng.
- **Không dùng đồ vật đã có ở header:** hộp, vẫy tay, kính râm, tạ, cúp, hoodie, tai nghe, laptop, trà sữa, bỏng ngô, quà, đồng xu, lửa.

| Cấp | Giai đoạn | Chiều cao mèo / khung | Ý chính                                      |
| --- | --------- | --------------------- | -------------------------------------------- |
| 1   | Baby      | ~50%                  | Mèo con trên gối tròn, đeo yếm               |
| 2   | Baby      | ~50%                  | + bình sữa nhỏ                               |
| 3   | Junior    | ~62%                  | Vòng cổ có chuông, đeo cặp sách              |
| 4   | Junior    | ~62%                  | + khăn quàng nhỏ                             |
| 5   | Teen      | ~72%                  | Mũ lưỡi trai ngược, đứng trên ván trượt      |
| 6   | Teen      | ~72%                  | + huy hiệu ghim trên mũ, vòng màu indigo     |
| 7   | Pro       | ~82%                  | Áo đấu có số, giày chạy, huy chương bạc      |
| 8   | Pro       | ~82%                  | Huy chương vàng + băng đội trưởng, vòng teal |
| 9   | Master    | ~90%                  | Áo choàng đỏ, vương miện nhỏ, ngồi trên bục  |
| 10  | Master    | ~90%                  | + hào quang vàng, đuôi lấp lánh              |

## Cách tạo

1. Tạo mỗi ảnh ở 1024×1024, nền trong suốt. Dán **khối phong cách chung** rồi tới prompt của ảnh đó.
2. Nếu công cụ cho phép đưa ảnh tham chiếu, đính kèm `assets/mascot/wave.webp` để giữ đúng con mèo (màu lông, mặt, nét viền).
3. Ảnh cấp chẵn: tạo bằng cách sửa ảnh cấp lẻ (image edit / inpaint) thay vì tạo mới, để mèo giống hệt nhau.
4. Mèo đặt giữa khung, chân chạm cùng một đường đáy ở khoảng 92% chiều cao khung, chừa lề để không bị cắt.

### Khối phong cách chung

```
Cute chibi orange tabby cat mascot, same character in every image: orange fur with darker
orange tabby stripes on the forehead and back, cream-white muzzle, chest and belly, pink
inner ears, big glossy dark eyes, small pink nose, rosy cheeks. Thick dark-brown outline,
flat cel shading with one soft shadow tone, clean sticker style, no text, no letters.
Front three-quarter view, full body, centered, feet resting on an invisible baseline.
Transparent background, no floor, no scenery. Small yellow four-point sparkles allowed.
```

### Prompt từng ảnh

**Cấp 1 — Baby**

```
A tiny newborn kitten, very round body, oversized head (head as big as the body), stubby
legs. Sitting on a small round pastel-blue cushion, wearing a white bib with a tiny orange
paw print. Sleepy happy smile, eyes huge and sparkly. Cat height about 50% of the canvas.
No aura.
```

**Cấp 2 — Baby +**

```
Same kitten as level 1, same cushion and bib, now hugging a small milk bottle with both
paws, a single small sparkle next to it. Everything else unchanged.
```

**Cấp 3 — Junior**

```
A young kitten, a little taller and less round than a baby, head still slightly big.
Standing on two legs, wearing a red collar with a small gold bell and a small green school
backpack on its back. Curious open-mouth smile, one paw holding a backpack strap.
Cat height about 62% of the canvas. Two small sparkles.
```

**Cấp 4 — Junior +**

```
Same kitten as level 3, same collar, bell and backpack, now also wearing a short knitted
teal scarf. Everything else unchanged.
```

**Cấp 5 — Teen**

```
A teenage cat, longer legs and slimmer body, normal head-to-body ratio. Standing
confidently on a small skateboard, wearing a navy baseball cap backwards. Cheeky grin,
arms slightly out for balance. Cat height about 72% of the canvas.
```

**Cấp 6 — Teen +**

```
Same cat as level 5, same cap and skateboard, a round enamel pin badge on the cap, and a
thin indigo ring glow behind the cat. Everything else unchanged.
```

**Cấp 7 — Pro**

```
An athletic grown cat, strong and fit, standing tall. Wearing an indigo sports jersey with
a large white number 7 — the only allowed text — and teal running shoes, a silver medal on
a ribbon around the neck. Proud determined smile, one fist raised. Cat height about 82% of
the canvas.
```

**Cấp 8 — Pro +**

```
Same cat as level 7, same jersey and shoes, the medal is now gold and there is a teal
captain armband on one arm, with a thin teal ring glow behind the cat. Everything else
unchanged.
```

**Cấp 9 — Master**

```
A majestic adult cat, the largest and most dignified version, sitting upright on a small
round golden podium. Wearing a flowing red velvet cape with white trim and a small gold
crown. Calm wise smile, eyes half closed. Cat height about 90% of the canvas.
```

**Cấp 10 — Master +**

```
Same cat as level 9, same podium, cape and crown, now with a warm golden halo glow behind
the whole body and tiny golden sparkles trailing from the tip of its tail. Everything else
unchanged.
```

## Kiểm tra trước khi đưa vào app

- Xếp 10 ảnh thành một hàng: mèo lớn dần thấy rõ, cùng một con (màu lông, sọc, mặt).
- Mỗi cặp lẻ/chẵn chỉ khác chi tiết đã ghi.
- Không có chữ trong ảnh (trừ số 7 ở cấp 7–8), không có nền.
- Thu nhỏ còn 48pt (cỡ avatar header): vẫn phân biệt được giai đoạn.

## Đưa vào app

- Thu về 256×256 WebP (khoảng 10 KB mỗi ảnh), đặt tên `assets/buddy/level-1.webp` … `level-10.webp`, ghi đè 5 ảnh cũ.
- Khi app còn 5 cấp, `BUDDY_IMAGES` dùng ảnh cấp lẻ: cấp 1 → `level-1`, 2 → `level-3`, 3 → `level-5`, 4 → `level-7`, 5 → `level-9`.
- Khi lên 10 cấp theo `BUDDY-REDESIGN-PLAN.md`, `BUDDY_IMAGES` trỏ thẳng cấp N → `level-N`.
