# UNIMAS ESG Dashboard — Colour Design Principles

> Dokumen rujukan untuk keputusan reka bentuk warna. Dikemas kini apabila ada prinsip baru.

---

## 1. Exception-Based Coloring

Warna hanya muncul bila ada **masalah** — keadaan normal kekal putih/neutral.

| Keadaan | Warna | Hex |
|---|---|---|
| Normal / Selamat / 0 alert | Putih (tiada warna) | `#ffffff` |
| Warning / Moderate / Near Full | Kuning | `#F59E0B` |
| Critical / Danger / Full | Merah | `#EF4444` |

**Kenapa:** Bila semua okay → dashboard nampak tenang. Bila ada isu → warna muncul, mata pengguna terus tertarik tanpa perlu scan satu persatu. Ini menggunakan prinsip *pre-attentive processing* — otak memproses warna dalam 200ms sebelum membaca teks.

**Jangan lakukan:** Warnakan nilai hijau untuk "Normal" — ini menyebabkan *alert fatigue* kerana otak berhenti memberi perhatian kepada warna bila ia selalu ada.

---

## 2. Semantic Color Purity

Warna merah, kuning, hijau **hanya** untuk status. Jangan guna sebagai warna kategori, lokasi, atau domain.

| Warna | Maksud Eksklusif |
|---|---|
| `#22C55E` Hijau | Normal / Good / Resolved / Selamat |
| `#F59E0B` Kuning | Warning / Moderate / Perlu perhatian |
| `#EF4444` Merah | Critical / Danger / Tindakan segera |

**Kenapa:** Jika lokasi ke-2 mendapat warna kuning, pengguna akan sangka ada "warning" padahal ia hanya label lokasi. Ini dipanggil *semantic color bleeding* — warna kehilangan maknanya bila digunakan untuk dua tujuan berbeza.

---

## 3. Consistent Location Colors

Satu lokasi = satu warna yang sama **merentasi semua tab dan carta**.

| Lokasi | Warna | Hex | Psikologi |
|---|---|---|---|
| Admin Block | Biru | `#3B82F6` | Autoriti, pentadbiran |
| Engineering Faculty | Cyan | `#06B6D4` | Teknikal, sains, inovasi |
| Campus Lake | Biru langit | `#38BDF8` | Air, tasik, alam semula jadi |
| Main Gate | Slate | `#94A3B8` | Infrastruktur, besi, gerbang |
| Cafeteria | Emas | `#FBBF24` | Kehangatan, makanan, sosial |
| Colleges | Violet | `#A78BFA` | Komuniti, kediaman, akademik |

Warna-warna ini disimpan dalam `src/config.js` → `locationColors` dan dirujuk oleh semua tab.

**Kenapa:** Otak manusia membina *mental model* — "violet = Colleges" berlaku secara automatik selepas beberapa kali melihat. Pengguna yang menukar dari tab Energy ke Water ke Alerts akan serta-merta mengenali lokasi yang sama tanpa membaca label.

---

## 4. Consistent Month Colors

Satu bulan = satu warna yang sama di bar chart dan filter pill.

| Bulan | Warna | Hex | Psikologi |
|---|---|---|---|
| Januari | Biru sejuk | `#60A5FA` | Permulaan baru, segar |
| Februari | Violet lembut | `#C084FC` | Pertengahan, tenang |
| Mac | Teal | `#2DD4BF` | Menghampiri pertengahan tahun |

Warna-warna ini disimpan dalam `src/config.js` → `monthColors`.

---

## 5. Domain Colors

Setiap domain ESG ada warna identiti tersendiri untuk ikon KPI card dan aksen tab.

| Domain | Warna | Hex |
|---|---|---|
| Energy | Biru | `#3B82F6` |
| Air Quality | Cyan | `#06B6D4` |
| Water | Indigo | `#6366F1` |
| Waste | Oren | `#F97316` |
| Soil | Hijau limau | `#84CC16` |
| Solar | Kuning emas | `#FBBF24` |
| CO₂ / Gas | Oren hangat | `#FB923C` |

---

## 6. Warna Mengikut Tujuan Carta

Pilihan warna bergantung kepada **tujuan carta**, bukan sekadar konsistensi.

| Jenis Carta | Warna Dipakai | Sebab |
|---|---|---|
| Line chart berbilang siri | Warna lokasi | Bezakan siri yang bertindih dalam carta yang sama |
| Bar chart status (fill level, AQI) | Warna status (merah/kuning/hijau) | Tujuan = kenal bahaya segera, posisi bar cukup untuk kenal lokasi |
| Bar chart lokasi (PM2.5, alerts by location) | Warna lokasi | Identiti lokasi lebih penting dari status |
| Bar chart bulanan | Warna bulan | Identiti masa |
| Peta — marker lokasi | Warna status | Kedudukan geografi sudah mengenal pasti lokasi |
| KPI card icon | Warna domain | Identiti domain/kategori |
| KPI card nilai (value text) | Warna status atau tiada | Exception-based — hanya bila ada masalah |

---

## 7. Psychological Color Mapping

Warna patut **mencerminkan** identiti atau sifat sebenar data — bukan sekadar berbeza antara satu sama lain.

**Contoh baik:**
- Campus Lake = biru langit `#38BDF8` (air, tasik — naluri terus faham)
- Cafeteria = emas `#FBBF24` (makanan, kehangatan — psikologi warna makanan)
- CO₂ = oren `#FB923C` (gas, amaran alam sekitar — bukan ungu neutral)

**Contoh buruk:**
- Campus Lake = indigo `#818CF8` (ungu tidak mencerminkan air)
- Main Gate = pink `#F472B6` (tiada kaitan psikologi dengan pintu masuk)

---

## 8. Prinsip Teras

> **Warna adalah sumber terhad — guna hanya bila ia menambah makna, bukan sekadar menghias.**

- Warna yang digunakan terlalu banyak = tiada warna yang bermakna
- Warna yang digunakan dengan tepat = pengguna faham data tanpa membaca
- Setiap warna patut menjawab soalan: *"Apa yang warna ini beritahu pengguna?"*

---

## Rujukan & Bacaan Lanjut

- Nielsen Norman Group — [Color in Data Visualization](https://www.nngroup.com/articles/dashboards-preattentive/)
- Edward Tufte — *The Visual Display of Quantitative Information*
- IBM Carbon Design System — [Status Indicator Pattern](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- Stacey Barr — [3 Problems With KPI Traffic Light Dashboards](https://www.staceybarr.com/measure-up/3-problems-with-traditional-kpi-traffic-lights/)

---

*Terakhir dikemas kini: Mei 2026 | UNIMAS ISuRE Smart Campus ESG Dashboard v1.0*
