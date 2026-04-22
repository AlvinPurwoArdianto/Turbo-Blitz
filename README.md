# 🚗💥 TURBO BLITZ: Road Fury v2.0
### Dokumentasi Lengkap — Full Feature Edition

---

## 📋 Deskripsi Game

**TURBO BLITZ: Road Fury v2.0** adalah pengembangan penuh dari v1.0, kini dengan **9 fitur baru** yang diimplementasikan sepenuhnya:

| # | Fitur Baru | Status |
|---|-----------|--------|
| 1 | 🔊 Sound Effects (Web Audio API) | ✅ |
| 2 | 📱 Mobile Controls (Touch Buttons) | ✅ |
| 3 | 🏆 Leaderboard (localStorage) | ✅ |
| 4 | 👹 Boss Fight per 5 Wave | ✅ |
| 5 | 🔫 Weapon Upgrades (4 senjata) | ✅ |
| 6 | 🗺️ Map Variety (3 biom) | ✅ |
| 7 | 🃏 Upgrade Card System (pilih saat level-up) | ✅ |
| 8 | 🔥 Combo System | ✅ |
| 9 | ❤️ Life System (3 nyawa) | ✅ |

---

## 🎮 Cara Bermain

### Kontrol Keyboard

| Tombol | Aksi |
|--------|------|
| `← Arrow` / `A` | Gerak kiri |
| `→ Arrow` / `D` | Gerak kanan |
| `Space` / `↑` / `W` | Lompat |
| `Z` | Tembak ke kiri |
| `X` | Tembak ke kanan |
| `Q` | Ganti senjata (mundur) |
| `E` | Ganti senjata (maju) |

Efek suara bisa dinyalakan/dimatikan lewat tombol **SFX ON/OFF** di area kanan bawah canvas (di atas bar XP).

### Kontrol Mobile (Layar Sentuh)
Tombol ◀ Z⚡ JUMP ⚡X ▶ muncul otomatis di bawah layar di perangkat mobile.

- Semua tombol mendukung multi-touch
- Tidak perlu install apapun — buka di browser mobile langsung

---

## 🔫 Sistem Senjata (Weapon Upgrades)

| Senjata | Ammo | Fire Rate | Damage | Efek Khusus |
|---------|------|-----------|--------|-------------|
| **CANNON** | ∞ | Normal | 1 | Senjata standar tak terbatas |
| **SPREAD** | 30 | Lambat | 1×3 | 3 peluru menyebar sekaligus |
| **LASER** | 50 | Sangat cepat | 2 | Peluru kecepatan tinggi |
| **ROCKET** | 12 | Sangat lambat | 5 + AOE | Ledakan area, damage banyak |

- **Amun habis** → otomatis reload sekitar 1.5 detik
- **Pickup senjata** (🔫) bisa muncul dari musuh/power-up
- **Q/E** untuk ganti senjata kapan saja

---

## 👹 Sistem Boss Fight

Boss muncul **setiap 5 wave** dan makin kuat:

| Wave | Boss | HP | Fase | Serangan Khusus |
|------|------|----|----|----------------|
| Wave 5 | **WARLORD** | 80+ | 2 fase | Tembak 1 arah |
| Wave 10 | **OVERLORD** | 160+ | 3 fase | Tembak 3 arah + AOE |
| Wave 15+ | **DESTROYER** | 300+ | 4 fase | Full barrage + Rocket |

### Mekanik Boss:
- **Entry animation** — boss memasuki layar dari atas secara dramatis
- **Phase system** — HP < 33% → fase naik, kecepatan +30%, pola serangan berubah
- **Phase indicator** — titik-titik di bawah boss menunjukkan fase aktif
- **Loot drop** — membunuh boss menjatuhkan 3 power-up sekaligus

---

## 🃏 Upgrade Card System (Level-Up)

Saat level naik, permainan **berhenti sejenak** dan pemain memilih 1 dari 3 kartu upgrade acak:

| Upgrade | Efek |
|---------|------|
| ❤️ Max HP +40 | HP maksimal naik 40, HP diisi +40 |
| ⚡ Turbo Speed | Kecepatan mobil +15% |
| 🔫 Shot Speed | Cooldown tembak semua senjata -30% |
| 💣 Rocket +5 | Isi ammo Rocket +5 |
| 🛡️ Armor | Damage yang diterima -25% |
| 🌀 Spread +15 | Isi ammo Spread +15 |
| 💎 Score ×1.5 | Semua skor musuh ×1.5 permanen |
| ⚕️ Regen | HP +20 saat dipilih |

---

## 🔥 Combo System

- Membunuh musuh berturut-turut dalam 3 detik = **COMBO**
- Setiap kill dalam combo meningkatkan multiplier skor
- Combo putus jika terkena damage atau timer habis

| Combo | Bonus Skor |
|-------|-----------|
| x1 | Normal |
| x3 | +30% skor per kill |
| x5 | +50% skor per kill |
| x10+ | +100% skor per kill |

---

## 🏆 Leaderboard (localStorage)

- **Skor tersimpan otomatis** saat game over
- **10 skor teratas** disimpan di browser (localStorage)
- Tampil: Skor, Level, Wave, Tanggal
- Medal 🥇🥈🥉 untuk top 3
- Tombol **"Hapus Data"** untuk reset leaderboard

---

## 🗺️ Map Variety

Peta berubah otomatis **setiap 8 wave**:

| Map | Tampilan | Efek Visual |
|-----|----------|-------------|
| 🌙 **MALAM** | Langit gelap, bintang | Default cyberpunk |
| 🌧️ **HUJAN** | Tetesan hujan diagonal | Layar lebih gelap |
| ☀️ **GURUN** | Latar coklat, debu | Warna warm tone |

Nama map ditampilkan singkat saat berganti.

---

## 📱 Mobile Controls

Di layar sentuh (smartphone/tablet), kontrol virtual muncul otomatis:

```
[ ◀ ] [ Z⚡ ] [ JUMP ] [ ⚡X ] [ ▶ ]
```

- Semua tombol mendukung **multi-touch**
- Tidak perlu install apapun — buka di browser mobile langsung

---

## ⚔️ Sistem Musuh (Diperbarui)

| Tipe | HP | Spd | Skor | Baru di v2 |
|------|-----|-----|------|-----------|
| 🏍️ Bike | 1 | Cepat | 10 | - |
| 🚚 Truck | 4 | Lambat | 30 | - |
| 🚙 Jeep | 2 | Normal | 20 | - |
| 🛡️ Tank | 8 | Sangat lambat | 80 | - |
| 🚁 Drone | 2 | Melayang | 25 | - |
| ⚡ Speeder | 3 | Sangat cepat | 40 | **✅ BARU** |

---

## 💊 Power-Up (Diperbarui)

| Power-Up | Warna | Efek |
|----------|-------|------|
| **HP** | Merah | +35 HP |
| **XP** | Hijau | +50 XP |
| **Shield** | Cyan | Kebal 2.2 detik |
| **×2** | Oranye | +100×level skor |
| **🔫 Weapon** | Ungu | Dapat senjata acak | ← **BARU** |

---

## 📈 Sistem Leveling (Diperbarui)

```
XP Formula:
  xpNeeded(level) = 100 × 1.35^(level-1)

Level Up → Pilih 1 Upgrade Card (baru di v2)
         → Kecepatan jalan +0.25
         → Kecepatan mobil +0.08
```

- Kapasitas XP naik setiap level, jadi level berikutnya selalu butuh XP lebih besar dari level sebelumnya.
- Jika XP yang didapat besar sekaligus, game bisa memproses lebih dari satu level up dalam satu kali reward.
- Bar XP di HUD selalu mengikuti kapasitas XP terbaru dari level yang sedang aktif.

---

## ❤️ Sistem Nyawa (3 Life)

- Pemain memiliki **3 nyawa** (indikator hati) di HUD.
- Saat HP habis, nyawa berkurang 1 lalu permainan **lanjut** (tidak reset dari awal).
- Saat nyawa tersisa 0, baru masuk ke **Game Over**.
- Tampilan hati menggunakan format `♥` untuk nyawa aktif dan `♡` untuk nyawa yang sudah habis.

---

## 🌊 Sistem Wave (Diperbarui)

```
wave = floor(frameCount / 600) + 1
spawnInterval = max(35, 90 - (wave-1) × 5)

Wave 5, 10, 15, 20... → BOSS MUNCUL!
```

---

## 🎯 HUD v2.0

```
┌──────────────────────────────────┐
│ [SCORE] [LEVEL] [WAVE] [COMBO]   │  ← hud-top (4 kotak)
│                     [WEAPON HUD] │  ← nama senjata + ammo
│         [BOSS BAR]               │  ← muncul saat boss aktif
│   ... game canvas ...            │
│ [LIFE ♥♥♥]                        │  ← hud-bottom row 1
│ [HP ████░░] [XP ██░░]            │  ← hud-bottom row 2
│                    [SFX ON/OFF]  │  ← di atas bar XP
└──────────────────────────────────┘
```

---

## 🏗️ Arsitektur Kode v2.0

### Penambahan di v2:

```javascript
// Weapons system
const WEAPONS = [cannon, spread, laser, rocket];
let weaponAmmo = [Infinity, 30, 50, 12];

// Boss system
const BOSS_TYPES = [WARLORD, OVERLORD, DESTROYER];
let bossEntity = null;
let bossActive = false;

// Combo system
let combo = 0, comboTimer = 0, maxCombo = 0;

// Life system
let maxLives = 3, lives = 3;
function loseLife() {...}

// Map system
let currentMap = 0; // 0=night, 1=rain, 2=desert

// Upgrade cards (on level-up)
const UPGRADES = [...8 kartu upgrade];

// Leaderboard
saveScore(score, level, wave) → localStorage
getHiScore() → localStorage
renderLeaderboard() → DOM

// Rocket AOE
let rocketExplosions = [];
function triggerRocketExplosion(x, y, radius) {...}

// Mobile
setupMobile() → touch event listeners
```

---

## 📊 Perbandingan v1 vs v2

| Fitur | v1.0 | v2.0 |
|-------|------|------|
| Senjata | 1 (cannon) | 4 (cannon/spread/laser/rocket) |
| Musuh | 5 tipe | 6 tipe |
| Boss | ❌ | ✅ 3 boss, 4 fase |
| Level-up | Auto | Pilih upgrade card |
| Leaderboard | ❌ | ✅ 10 best scores |
| Mobile | ❌ | ✅ virtual buttons |
| Map | 1 | 3 (malam/hujan/gurun) |
| Combo | ❌ | ✅ multiplier skor |
| HUD | 3 kotak | 4 kotak + weapon + boss bar + life + HP/XP row |
| Ukuran file | ~25 KB | ~57 KB |

---

## 🚀 Cara Menjalankan

```bash
# Browser langsung
open turbo-blitz-v2.html

# Local server
python -m http.server 8080
# → http://localhost:8080/turbo-blitz-v2.html
```

---

## 🔧 Kustomisasi Lanjutan

### Tambah Senjata Baru
```javascript
WEAPONS.push({
  name:'PLASMA', color:'#00ffcc',
  ammo: 20, cooldown: 5,
  spread: 0, bulletSpd: 14,
  dmg: 3, desc:'AOE Kecil'
});
weaponAmmo.push(20);
```

### Tambah Boss Baru
```javascript
BOSS_TYPES.push({
  name:'GODSLAYER', w:110, h:120,
  hp: 600, spd: 0.7, color:'#ffffff',
  score: 5000, xp: 1500,
  phase: 5, aoe: true
});
```

### Tambah Upgrade Card
```javascript
UPGRADES.push({
  icon:'🚀', name:'HYPER DRIVE',
  desc:'Double jump\ndiaktifkan',
  apply: () => { player.canDoubleJump = true; }
});
```

### Tambah Tipe Musuh
```javascript
ENEMY_TYPES.push({
  name:'stealth', w:26, h:38,
  hp:2, spd:4.5, color:'#ffffff22',
  score:60, xp:45
});
```

---

## 📌 Ide Pengembangan Selanjutnya

- [ ] **Co-op 2 Player** — keyboard split (WASD + Arrows)
- [ ] **Multiplayer** — WebSocket / WebRTC
- [ ] **Achievement System** — lencana berdasarkan pencapaian
- [ ] **Story Mode** — level dengan cerita
- [ ] **Skin Kendaraan** — unlock lewat skor
- [ ] **Mini-map** — tampil area musuh di sekitar
- [ ] **Pause Menu** — tombol P untuk pause
- [ ] **Settings** — volume, kesulitan, resolusi

---

## 📊 Spesifikasi

| Metrik | v1.0 | v2.0 |
|--------|------|------|
| Canvas Size | 480×560 px | 480×560 px |
| Target FPS | 60 | 60 |
| File Size | ~25 KB | ~57 KB |
| Dependencies | Google Fonts | Google Fonts |
| Browser Support | Semua modern | Semua modern |
| Mobile Support | ❌ | ✅ |
| Offline | ✅ | ✅ |

---

*"Drive fast. Shoot first. Choose wisely. Defeat the Boss."* 🚗💥👹
