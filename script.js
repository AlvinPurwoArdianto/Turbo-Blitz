const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let gameState = 'start';
let score = 0, level = 1, wave = 1;
let xp = 0, xpNeeded = 100;
let hp = 100, maxHp = 100;
let maxLives = 3, lives = 3;
let frameCount = 0;
let spawnTimer = 0, spawnInterval = 90;
let bossActive = false, bossEntity = null;
let combo = 0, comboTimer = 0, maxCombo = 0;
let killCount = 0, bossKillCount = 0;
let currentWeapon = 0;
let currentMap = 0;
let rainDrops = [];
let reloading = false, reloadTimer = 0;
let pendingLevelUp = false;
let gameStartTime = 0;
const XP_BASE = 100;
const XP_GROWTH = 1.35;

function getXpNeededForLevel(nextLevel) {
    return Math.floor(XP_BASE * Math.pow(XP_GROWTH, Math.max(0, nextLevel - 1)));
}

let audioCtx = null;
let masterGain = null;
let sfxEnabled = true;

function initAudio() {
    if (audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = sfxEnabled ? 0.18 : 0;
    masterGain.connect(audioCtx.destination);
}

function ensureAudioReady() {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }
}

function playTone(freq, duration, type = 'square', volume = 0.1, sweepTo = null) {
    if (!audioCtx || !masterGain || !sfxEnabled) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (sweepTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

function playNoise(duration = 0.08, volume = 0.05, highpass = 700) {
    if (!audioCtx || !masterGain || !sfxEnabled) return;
    const now = audioCtx.currentTime;
    const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audioCtx.createBufferSource();
    const hp = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.buffer = buf;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + duration + 0.02);
}

function playShootSfx(weaponIdx) {
    if (weaponIdx === 3) {
        playTone(120, 0.2, 'sawtooth', 0.14, 55);
        playNoise(0.12, 0.08, 350);
        return;
    }
    if (weaponIdx === 2) {
        playTone(1100, 0.07, 'square', 0.06, 700);
        return;
    }
    if (weaponIdx === 1) {
        playTone(650, 0.09, 'triangle', 0.08, 280);
        return;
    }
    playTone(420, 0.08, 'square', 0.08, 180);
}

function playHitSfx() {
    playTone(210, 0.07, 'square', 0.08, 120);
    playNoise(0.05, 0.04, 600);
}

function playEnemyDestroyedSfx() {
    playTone(300, 0.09, 'sawtooth', 0.09, 110);
}

function playBossDestroyedSfx() {
    playTone(240, 0.2, 'sawtooth', 0.15, 80);
    playTone(120, 0.35, 'triangle', 0.12, 50);
    playNoise(0.2, 0.1, 250);
}

function playPickupSfx() {
    playTone(680, 0.06, 'triangle', 0.08, 960);
}

function playLevelUpSfx() {
    playTone(440, 0.08, 'triangle', 0.08, 660);
    playTone(660, 0.12, 'triangle', 0.08, 980);
}

function playBossAlertSfx() {
    playTone(200, 0.12, 'square', 0.08, 170);
    playTone(170, 0.2, 'square', 0.08, 130);
}

function playGameOverSfx() {
    playTone(280, 0.16, 'sawtooth', 0.1, 180);
    playTone(180, 0.22, 'triangle', 0.09, 90);
}

function playUiBlipSfx() {
    playTone(880, 0.05, 'triangle', 0.05, 620);
}

function setSfxEnabled(enabled) {
    sfxEnabled = enabled;
    if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(enabled ? 0.18 : 0, audioCtx.currentTime, 0.02);
    }
    const btn = document.getElementById('btn-sfx');
    if (!btn) return;
    btn.textContent = enabled ? 'SFX ON' : 'SFX OFF';
    btn.classList.toggle('off', !enabled);
}

const WEAPONS = [
    { name: 'CANNON', color: '#00f5ff', ammo: Infinity, cooldown: 8, spread: 0, bulletSpd: 10, dmg: 1, desc: 'Standar' },
    { name: 'SPREAD', color: '#ff6b00', ammo: 30, cooldown: 10, spread: 3, bulletSpd: 9, dmg: 1, desc: '3 Peluru' },
    { name: 'LASER', color: '#ff00ff', ammo: 50, cooldown: 3, spread: 0, bulletSpd: 16, dmg: 2, desc: 'Cepat' },
    { name: 'ROCKET', color: '#ffcc00', ammo: 12, cooldown: 25, spread: 0, bulletSpd: 7, dmg: 5, desc: 'AOE!' },
];
let weaponAmmo = [Infinity, 30, 50, 12];

const keys = {};
document.addEventListener('keydown', e => {
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

const ROAD_LEFT = 80, ROAD_RIGHT = 400;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const LANE_W = ROAD_W / 3;
const LANES = [ROAD_LEFT + LANE_W * 0.5, ROAD_LEFT + LANE_W * 1.5, ROAD_LEFT + LANE_W * 2.5];
let roadSpeed = 4;

let bgStars = [];
for (let i = 0; i < 60; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.3, spd: Math.random() * 0.5 + 0.2 });

let particles = [];
function spawnParticles(x, y, count, color, spread = 3, life = 25, gravity = 0.08) {
    for (let i = 0; i < count; i++) particles.push({
        x, y,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 0.5) * spread - 1,
        life, maxLife: life, color,
        size: Math.random() * 3 + 1, gravity
    });
}

const player = {
    x: W / 2 - 18, y: H - 110, w: 36, h: 56,
    vx: 0, vy: 0, onGround: true,
    jumpCooldown: 0, shotCooldown: 0,
    invincible: 0, groundY: H - 110,
    speed: 4.2, trail: []
};

let bullets = [], enemies = [], powerups = [], floatTexts = [];
let rocketExplosions = [];

const ENEMY_TYPES = [
    { name: 'bike', w: 28, h: 40, hp: 1, spd: 2.5, color: '#ff4444', score: 10, xp: 8 },
    { name: 'truck', w: 48, h: 64, hp: 4, spd: 1.5, color: '#ff8800', score: 30, xp: 25 },
    { name: 'jeep', w: 38, h: 52, hp: 2, spd: 3.0, color: '#aa44ff', score: 20, xp: 15 },
    { name: 'tank', w: 52, h: 68, hp: 8, spd: 1.2, color: '#ff2266', score: 80, xp: 60 },
    { name: 'drone', w: 30, h: 22, hp: 2, spd: 3.5, color: '#00ffcc', score: 25, xp: 20, flying: true },
    { name: 'speeder', w: 32, h: 44, hp: 3, spd: 5.0, color: '#ff88ff', score: 40, xp: 30 },
];

const BOSS_TYPES = [
    { name: 'WARLORD', w: 72, h: 90, hp: 80, spd: 1.2, color: '#ff0040', score: 500, xp: 200, phase: 2, aoe: false },
    { name: 'OVERLORD', w: 88, h: 100, hp: 160, spd: 1.0, color: '#cc00ff', score: 1200, xp: 400, phase: 3, aoe: true },
    { name: 'DESTROYER', w: 96, h: 110, hp: 300, spd: 0.8, color: '#ff6600', score: 2500, xp: 800, phase: 4, aoe: true },
];

function spawnEnemy() {
    const wm = 1 + (wave - 1) * 0.15;
    let pool = wave < 3 ? [0, 0, 0, 1, 2] : wave < 6 ? [0, 1, 1, 2, 2, 3, 4, 5] : [0, 1, 2, 3, 3, 4, 4, 5, 5];
    const tIdx = pool[Math.floor(Math.random() * pool.length)];
    const t = ENEMY_TYPES[tIdx];
    const lane = Math.floor(Math.random() * 3);
    const x = LANES[lane] - t.w / 2 + (Math.random() - 0.5) * 10;
    enemies.push({
        ...t, x, y: t.flying ? H * 0.15 + Math.random() * H * 0.3 : -t.h - 10,
        maxHp: Math.ceil(t.hp * wm), hp: Math.ceil(t.hp * wm),
        lane, flying: !!t.flying,
        shootTimer: Math.random() * 60,
        movePhase: Math.random() * Math.PI * 2,
        originalX: x, isBoss: false
    });
}

function spawnBoss() {
    if (bossActive) return;
    const bIdx = Math.min(Math.floor((wave - 5) / 5), BOSS_TYPES.length - 1);
    const bt = BOSS_TYPES[bIdx];
    const hp = bt.hp + wave * 8;
    bossEntity = {
        ...bt, x: W / 2 - bt.w / 2,
        y: -bt.h, maxHp: hp, hp,
        shootTimer: 30,
        moveDir: 1, phaseTimer: 200,
        currentPhase: 1, isBoss: true,
        entryDone: false
    };
    bossActive = true;
    showBossAnnounce(bt.name);
    document.getElementById('boss-bar-wrap').style.display = 'block';
    document.getElementById('boss-name').textContent = `⚠ ${bt.name} ⚠`;
}

function spawnPowerup(x, y) {
    const types = ['hp', 'xp', 'shield', 'multi', 'weapon'];
    const t = types[Math.floor(Math.random() * types.length)];
    const px = x ?? (ROAD_LEFT + 20 + Math.random() * (ROAD_W - 40));
    const py = y ?? -20;
    powerups.push({ x: px, y: py, w: 20, h: 20, type: t, vy: 2 + Math.random(), spin: 0 });
}

function shoot(dir) {
    if (player.shotCooldown > 0 || reloading) return;
    const w = WEAPONS[currentWeapon];
    if (weaponAmmo[currentWeapon] <= 0) { startReload(); return; }
    if (weaponAmmo[currentWeapon] !== Infinity) weaponAmmo[currentWeapon]--;

    const bx = player.x + player.w / 2, by = player.y + 4;

    if (w.spread > 0) {
        for (let i = -1; i <= 1; i++) {
            bullets.push({ x: bx, y: by, vx: dir * 2 + i * 1.5, vy: -w.bulletSpd + Math.abs(i) * 0.5, w: 4, h: 10, owner: 'player', color: w.color, trail: [], dmg: w.dmg, type: currentWeapon });
        }
    } else if (currentWeapon === 3) {
        bullets.push({ x: bx, y: by, vx: dir * 1.5, vy: -w.bulletSpd, w: 8, h: 14, owner: 'player', color: w.color, trail: [], dmg: w.dmg, type: 3, aoe: true });
        spawnParticles(bx, by, 6, '#ffcc00', 3, 15);
    } else {
        bullets.push({ x: bx, y: by, vx: dir * 2.5, vy: -w.bulletSpd, w: currentWeapon === 2 ? 3 : 4, h: currentWeapon === 2 ? 18 : 12, owner: 'player', color: w.color, trail: [], dmg: w.dmg, type: currentWeapon });
    }

    player.shotCooldown = w.cooldown;
    spawnParticles(bx, by, 3, w.color, 2, 10);
    playShootSfx(currentWeapon);
    updateWeaponHUD();
}

function startReload() {
    if (reloading || weaponAmmo[currentWeapon] === Infinity) return;
    reloading = true; reloadTimer = 90;
    document.getElementById('weapon-reload').textContent = 'RELOAD...';
    playTone(170, 0.1, 'square', 0.05, 120);
}

function enemyShoot(e) {
    const bx = e.x + e.w / 2, by = e.y + e.h;
    const spd = e.isBoss ? 6 + level * 0.2 : 4 + level * 0.2;
    const count = e.isBoss && e.currentPhase >= 2 ? 3 : 1;
    for (let i = 0; i < count; i++) {
        const spread = count > 1 ? (i - 1) * 2.5 : (Math.random() - 0.5) * 2;
        bullets.push({ x: bx, y: by, vx: spread, vy: spd, w: e.isBoss ? 8 : 5, h: e.isBoss ? 12 : 9, owner: 'enemy', color: e.isBoss ? '#ff0040' : '#ff3344', trail: [], dmg: e.isBoss ? 12 : 8 + level * 0.4, type: 0 });
    }
}

function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addKill() {
    combo++;
    comboTimer = 180;
    killCount++;
    if (combo > maxCombo) maxCombo = combo;
    updateComboHUD();
}

function updateComboHUD() {
    document.getElementById('hud-combo').textContent = `x${combo || 1}`;
    if (combo >= 3) {
        const cd = document.getElementById('combo-display');
        cd.textContent = `COMBO x${combo}!`;
        cd.style.opacity = '1';
    }
}

function gainXP(amount) {
    xp += amount;
    while (xp >= xpNeeded) {
        xp -= xpNeeded;
        level++;
        xpNeeded = getXpNeededForLevel(level + 1);
        roadSpeed = Math.min(13, roadSpeed + 0.25);
        player.speed = Math.min(7.5, player.speed + 0.08);
        showLevelUpChoice();
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, 30, '#00ff88', 5, 40);
    }
    updateHUD();
}

const UPGRADES = [
    { icon: '❤️', name: 'MAX HP +40', desc: 'HP maksimal\nnaik 40', apply: () => { maxHp += 40; hp = Math.min(maxHp, hp + 40); } },
    { icon: '⚡', name: 'TURBO SPEED', desc: 'Kecepatan\nmobil +15%', apply: () => { player.speed = Math.min(9, player.speed * 1.15); } },
    { icon: '🔫', name: 'SHOT SPEED', desc: 'Kecepatan\ntembak x1.5', apply: () => { WEAPONS.forEach(w => w.cooldown = Math.max(2, Math.floor(w.cooldown * 0.7))); } },
    { icon: '💣', name: 'ROCKET +5', desc: 'Ammo Rocket\n+5 isi ulang', apply: () => { weaponAmmo[3] += 5; } },
    { icon: '🛡️', name: 'ARMOR', desc: 'Damage\nditerima -25%', apply: () => { player._armor = (player._armor || 0) + 0.25; } },
    { icon: '🌀', name: 'SPREAD +15', desc: 'Ammo Spread\n+15 isi ulang', apply: () => { weaponAmmo[1] += 15; } },
    { icon: '💎', name: 'SCORE x1.5', desc: 'Skor musuh\n×1.5 permanent', apply: () => { player._scoreMult = (player._scoreMult || 1) * 1.5; } },
    { icon: '⚕️', name: 'REGEN', desc: 'HP +5 setiap\nlevel naik', apply: () => { hp = Math.min(maxHp, hp + 20); } },
];

function showLevelUpChoice() {
    if (gameState !== 'playing') return;
    gameState = 'levelup';
    playLevelUpSfx();
    const screen = document.getElementById('levelup-screen');
    screen.style.display = 'flex';
    const cards = document.getElementById('upgrade-cards');
    cards.innerHTML = '';
    const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach(u => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `<div class="icon">${u.icon}</div><div class="name">${u.name}</div><div class="desc">${u.desc.replace('\n', '<br>')}</div>`;
        card.addEventListener('click', () => {
            u.apply();
            playUiBlipSfx();
            screen.style.display = 'none';
            gameState = 'playing';
            updateHUD();
        });
        cards.appendChild(card);
    });
    const lvlEl = document.getElementById('levelup-screen').querySelector('h3');
    lvlEl.textContent = `⬆ LEVEL ${level}!`;
}

function showBossAnnounce(name) {
    const el = document.getElementById('boss-announce');
    el.innerHTML = `⚠ BOSS MUNCUL ⚠<br><span style="font-size:14px;color:#ff8800">${name}</span>`;
    el.style.opacity = '1';
    playBossAlertSfx();
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

function showLevelUp() {
    const el = document.getElementById('level-up-msg');
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 1200);
}

function damagePlayer(dmg) {
    if (player.invincible > 0) return;
    const armor = player._armor || 0;
    const actual = Math.max(1, dmg * (1 - armor));
    hp = Math.max(0, hp - actual);
    player.invincible = 55;
    combo = 0; comboTimer = 0;
    document.getElementById('combo-display').style.opacity = '0';
    updateComboHUD();
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, 15, '#ff0040', 4, 30);
    playHitSfx();
    if (hp <= 0) {
        loseLife();
        return;
    }
    updateHUD();
}

function loseLife() {
    lives = Math.max(0, lives - 1);
    if (lives <= 0) {
        updateHUD();
        endGame();
        return;
    }
    hp = maxHp;
    player.invincible = 120;
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, 30, '#ff3366', 6, 35);
    addFloatText(player.x + player.w / 2, player.y - 10, `LIFE -1 (${lives}/${maxLives})`, '#ff3366');
    playTone(190, 0.12, 'square', 0.08, 130);
    updateHUD();
}

function updateHUD() {
    document.getElementById('hud-score').textContent = score.toLocaleString();
    document.getElementById('hud-level').textContent = level;
    document.getElementById('hud-wave').textContent = wave;
    document.getElementById('hud-lives').textContent = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, maxLives - lives));
    document.getElementById('hp-bar-fill').style.width = (hp / maxHp * 100) + '%';
    document.getElementById('xp-bar-fill').style.width = (xp / xpNeeded * 100) + '%';
    if (bossActive && bossEntity) {
        document.getElementById('boss-bar-fill').style.width = (bossEntity.hp / bossEntity.maxHp * 100) + '%';
    }
}

function updateWeaponHUD() {
    const w = WEAPONS[currentWeapon];
    document.getElementById('weapon-name').textContent = w.name;
    const a = weaponAmmo[currentWeapon];
    document.getElementById('weapon-ammo').textContent = a === Infinity ? '∞' : a;
    if (!reloading) document.getElementById('weapon-reload').textContent = '';
}

function addFloatText(x, y, text, color) {
    floatTexts.push({ x, y, text, color, life: 55, vy: -1.3 });
}

function saveScore(s, lvl, wv) {
    let lb = JSON.parse(localStorage.getItem('turboBlitzLB') || '[]');
    lb.push({ score: s, level: lvl, wave: wv, date: new Date().toLocaleDateString('id-ID') });
    lb.sort((a, b) => b.score - a.score);
    lb = lb.slice(0, 10);
    localStorage.setItem('turboBlitzLB', JSON.stringify(lb));
}

function getHiScore() {
    const lb = JSON.parse(localStorage.getItem('turboBlitzLB') || '[]');
    return lb.length > 0 ? lb[0].score : 0;
}

function renderLeaderboard() {
    const lb = JSON.parse(localStorage.getItem('turboBlitzLB') || '[]');
    const el = document.getElementById('lb-list');
    if (lb.length === 0) {
        el.innerHTML = '<div style="color:#444;font-size:12px;margin:20px">Belum ada skor tersimpan</div>';
        return;
    }
    const medals = ['gold', 'silver', 'bronze'];
    el.innerHTML = lb.map((e, i) => `
    <div class="lb-row">
      <span class="lb-rank ${medals[i] || ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
      <span class="lb-name">LVL.${e.level}</span>
      <span class="lb-score">${e.score.toLocaleString()}</span>
      <span class="lb-wave">W${e.wave} · ${e.date}</span>
    </div>
  `).join('');
}

function endGame() {
    gameState = 'gameover';
    playGameOverSfx();
    const hi = getHiScore();
    saveScore(score, level, wave);
    const newHi = getHiScore();
    document.getElementById('score-final').textContent = score.toLocaleString();
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    document.getElementById('go-stats').innerHTML = `
    <div class="stat-row">Level: <b>${level}</b> &nbsp;|&nbsp; Wave: <b>${wave}</b> &nbsp;|&nbsp; Kill: <b>${killCount}</b></div>
    <div class="stat-row">Waktu: <b>${mm}:${ss}</b> &nbsp;|&nbsp; Combo Maks: <b>x${maxCombo}</b></div>
    <div class="stat-row">Boss Kill: <b>${bossKillCount}</b></div>
  `;
    document.getElementById('hi-score-row').innerHTML = newHi > hi
        ? `🏆 HIGH SCORE BARU: ${newHi.toLocaleString()}`
        : `Best: ${newHi.toLocaleString()}`;
    document.getElementById('gameover-screen').classList.remove('hidden');
}

function resetGame() {
    score = 0; level = 1; wave = 1; xp = 0; xpNeeded = getXpNeededForLevel(2);
    hp = 100; maxHp = 100; frameCount = 0;
    lives = maxLives;
    spawnTimer = 0; spawnInterval = 90; roadSpeed = 4;
    bossActive = false; bossEntity = null;
    combo = 0; comboTimer = 0; maxCombo = 0;
    killCount = 0; bossKillCount = 0;
    currentWeapon = 0; reloading = false; reloadTimer = 0;
    currentMap = 0;
    gameStartTime = Date.now();
    player.x = W / 2 - 18; player.y = H - 110; player.vx = 0; player.vy = 0;
    player.onGround = true; player.jumpCooldown = 0; player.shotCooldown = 0;
    player.invincible = 0; player.speed = 4.2; player.trail = [];
    player._armor = 0; player._scoreMult = 1;
    bullets = []; enemies = []; powerups = []; particles = []; floatTexts = []; rocketExplosions = [];
    rainDrops = [];
    for (let i = 0; i < 80; i++) rainDrops.push({ x: Math.random() * W, y: Math.random() * H, spd: 8 + Math.random() * 4, len: 12 + Math.random() * 10 });
    WEAPONS.forEach((w, i) => {
        if (i === 0) w.cooldown = 8;
        if (i === 1) w.cooldown = 10;
        if (i === 2) w.cooldown = 3;
        if (i === 3) w.cooldown = 25;
    });
    weaponAmmo = [Infinity, 30, 50, 12];
    updateHUD(); updateWeaponHUD();
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('options-screen').classList.add('hidden');
    document.getElementById('quit-screen').classList.add('hidden');
    document.getElementById('boss-bar-wrap').style.display = 'none';
    document.getElementById('combo-display').style.opacity = '0';
    gameState = 'playing';
}

function showMenuScreen(screenId) {
    const screens = ['start-screen', 'options-screen', 'quit-screen'];
    screens.forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('gameover-screen').classList.add('hidden');
    gameState = 'start';
}

function updateOptionsPanel() {
    const state = document.getElementById('options-sfx-state');
    if (!state) return;
    state.textContent = sfxEnabled ? 'ON' : 'OFF';
    state.classList.toggle('on', sfxEnabled);
    state.classList.toggle('off', !sfxEnabled);
}

function quitGame() {
    playUiBlipSfx();
    showMenuScreen('quit-screen');
    gameState = 'quit';
}

function drawCar(x, y, w, h, color, iPlayer, hp_ratio = 1, invincible = false) {
    ctx.save();
    if (invincible && Math.floor(frameCount / 4) % 2 === 0) ctx.globalAlpha = 0.35;
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    if (iPlayer) { grad.addColorStop(0, '#003344'); grad.addColorStop(0.5, '#006688'); grad.addColorStop(1, '#002233'); }
    else { grad.addColorStop(0, color + '88'); grad.addColorStop(0.5, color); grad.addColorStop(1, color + '44'); }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x + 2, y + 4, w - 4, h - 8, 4); ctx.fill();
    ctx.fillStyle = iPlayer ? '#00aacc' : color + 'cc';
    ctx.beginPath(); ctx.roundRect(x + 5, y + h * 0.2, w - 10, h * 0.4, 3); ctx.fill();
    ctx.fillStyle = iPlayer ? '#aaf5ff33' : '#ffffff1a';
    ctx.beginPath(); ctx.roundRect(x + 7, y + h * 0.22, w - 14, h * 0.18, 2); ctx.fill();
    ctx.fillStyle = '#111';
    [[x + 2, y + h * 0.15], [x + w - 12, y + h * 0.15], [x + 2, y + h * 0.72], [x + w - 12, y + h * 0.72]].forEach(([wx, wy]) => {
        ctx.beginPath(); ctx.ellipse(wx + 5, wy + 5, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    });
    ctx.shadowBlur = 8; ctx.shadowColor = iPlayer ? '#00f5ff' : '#ff2200';
    ctx.fillStyle = iPlayer ? '#ccffff' : '#ff4400';
    ctx.fillRect(x + 4, iPlayer ? y + 2 : y + h - 5, 6, 4);
    ctx.fillRect(x + w - 10, iPlayer ? y + 2 : y + h - 5, 6, 4);
    if (!iPlayer && hp_ratio < 1) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff000044'; ctx.fillRect(x, y - 5, w, 3);
        ctx.fillStyle = '#ff2200'; ctx.fillRect(x, y - 5, w * hp_ratio, 3);
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function drawBoss(b) {
    ctx.save();
    const pulse = 0.85 + Math.sin(frameCount * 0.1) * 0.15;
    ctx.shadowBlur = 25 * pulse; ctx.shadowColor = b.color;
    const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    g.addColorStop(0, b.color + '44'); g.addColorStop(0.4, b.color); g.addColorStop(1, b.color + '22');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(b.x + 2, b.y + 4, b.w - 4, b.h - 8, 6); ctx.fill();
    ctx.fillStyle = b.color + '99';
    ctx.beginPath(); ctx.roundRect(b.x + 10, b.y + b.h * 0.2, b.w - 20, b.h * 0.45, 4); ctx.fill();
    ctx.fillStyle = '#444';
    ctx.fillRect(b.x - 8, b.y + b.h * 0.4, 10, 6);
    ctx.fillRect(b.x + b.w - 2, b.y + b.h * 0.4, 10, 6);
    ctx.shadowColor = b.color; ctx.shadowBlur = 12;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 6, b.y + 2, 10, 5);
    ctx.fillRect(b.x + b.w - 16, b.y + 2, 10, 5);
    ctx.fillStyle = '#ffffff33';
    for (let i = 0; i < b.currentPhase; i++) {
        ctx.beginPath(); ctx.arc(b.x + b.w / 2 + (i - b.currentPhase / 2 + 0.5) * 10, b.y + b.h + 6, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#111';
    [[b.x + 2, b.y + b.h * 0.1], [b.x + b.w - 16, b.y + b.h * 0.1], [b.x + 2, b.y + b.h * 0.72], [b.x + b.w - 16, b.y + b.h * 0.72]].forEach(([wx, wy]) => {
        ctx.beginPath(); ctx.ellipse(wx + 7, wy + 7, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0; ctx.restore();
}

function drawDrone(x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color; ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color + '88'; ctx.lineWidth = 2;
    const cx = x + w / 2, cy = y + h / 2;
    const rot = frameCount * 0.08;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-w * 0.65, 0); ctx.lineTo(w * 0.65, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h * 0.65); ctx.lineTo(0, h * 0.65); ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0; ctx.restore();
}

function drawBullet(b) {
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = b.color;
    ctx.fillStyle = b.color;
    if (b.type === 3) {
        ctx.beginPath(); ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 3); ctx.fill();
        spawnParticles(b.x, b.y + b.h / 2, 1, '#ff8800', 1.5, 8, 0);
    } else {
        ctx.beginPath(); ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 2); ctx.fill();
    }
    b.trail.forEach((t, i) => {
        ctx.globalAlpha = (i / b.trail.length) * 0.35;
        ctx.fillRect(t.x - 1, t.y - 1, 2, 2);
    });
    ctx.restore();
}

function drawPowerup(p) {
    ctx.save();
    const colors = { hp: '#ff0040', xp: '#00ff88', shield: '#00f5ff', multi: '#ff6b00', weapon: '#cc44ff' };
    const labels = { hp: 'HP', xp: 'XP', shield: '⛨', multi: '×2', weapon: '🔫' };
    const c = colors[p.type];
    ctx.shadowBlur = 14; ctx.shadowColor = c;
    ctx.save(); ctx.translate(p.x + 10, p.y + 10); ctx.rotate(p.spin);
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-9, -9, 18, 18); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = c;
    ctx.font = 'bold 8px Orbitron,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(labels[p.type], p.x + 10, p.y + 10);
    ctx.restore();
}

function drawRocketExplosion(e) {
    ctx.save();
    const t = 1 - e.life / e.maxLife;
    ctx.globalAlpha = (1 - t) * 0.9;
    const r = e.radius * t;
    const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.3, '#ffcc00'); grd.addColorStop(0.7, '#ff4400'); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawRoad() {
    const rg = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
    if (currentMap === 1) { rg.addColorStop(0, '#080818'); rg.addColorStop(0.5, '#0a0a20'); rg.addColorStop(1, '#080818'); }
    else if (currentMap === 2) { rg.addColorStop(0, '#1a1205'); rg.addColorStop(0.5, '#1e1508'); rg.addColorStop(1, '#1a1205'); }
    else { rg.addColorStop(0, '#0a0a1a'); rg.addColorStop(0.5, '#0d0d22'); rg.addColorStop(1, '#0a0a1a'); }
    ctx.fillStyle = rg; ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);
    const sColor = currentMap === 2 ? '#1a1000' : '#151525';
    ctx.fillStyle = sColor;
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);
    ctx.shadowBlur = 4; ctx.shadowColor = '#ff6b00';
    ctx.strokeStyle = '#ff6b0055'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ROAD_LEFT, 0); ctx.lineTo(ROAD_LEFT, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ROAD_RIGHT, 0); ctx.lineTo(ROAD_RIGHT, H); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 2; ctx.setLineDash([30, 25]);
    [ROAD_LEFT + LANE_W, ROAD_LEFT + LANE_W * 2].forEach(lx => {
        ctx.beginPath();
        ctx.moveTo(lx, ((frameCount * roadSpeed) % 55) - 55);
        ctx.lineTo(lx, H); ctx.stroke();
    });
    ctx.setLineDash([]);
}

function drawRain() {
    if (currentMap !== 1) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(160,200,255,0.18)'; ctx.lineWidth = 1;
    rainDrops.forEach(d => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();
    });
    ctx.restore();
}

function drawDesertBg() {
    if (currentMap !== 2) return;
    ctx.save();
    ctx.fillStyle = 'rgba(180,120,40,0.04)';
    for (let i = 0; i < 4; i++) {
        const dx = ((frameCount * 1.5 + i * 60) % 80) - 10;
        ctx.beginPath(); ctx.ellipse(10 + dx, H * 0.3 + i * 60, 20, 8, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W - 30 + dx, H * 0.5 + i * 50, 15, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function update() {
    if (gameState !== 'playing') return;
    frameCount++;
    currentMap = Math.floor(wave / 8) % 3;
    if (currentMap === 1) {
        rainDrops.forEach(d => {
            d.y += d.spd; d.x -= 1.5;
            if (d.y > H || d.x < 0) { d.y = -20; d.x = Math.random() * W; }
        });
    }
    if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -player.speed;
    else if (keys['ArrowRight'] || keys['KeyD']) player.vx = player.speed;
    else player.vx *= 0.68;
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.onGround && player.jumpCooldown <= 0) {
        player.vy = -12.5; player.onGround = false; player.jumpCooldown = 16;
        spawnParticles(player.x + player.w / 2, player.y + player.h, 8, '#00f5ff', 3, 20);
        playTone(260, 0.09, 'triangle', 0.06, 420);
    }
    if (player.jumpCooldown > 0) player.jumpCooldown--;
    if (keys['KeyZ']) shoot(-1);
    if (keys['KeyX']) shoot(1);
    if (player.shotCooldown > 0) player.shotCooldown--;
    if (keys['KeyQ']) { keys['KeyQ'] = false; cycleWeapon(-1); }
    if (keys['KeyE']) { keys['KeyE'] = false; cycleWeapon(1); }
    if (reloading) {
        reloadTimer--;
        if (reloadTimer <= 0) {
            reloading = false;
            const w = WEAPONS[currentWeapon];
            weaponAmmo[currentWeapon] = currentWeapon === 1 ? 30 : currentWeapon === 2 ? 50 : 12;
            document.getElementById('weapon-reload').textContent = '';
            playTone(540, 0.08, 'triangle', 0.06, 740);
            updateWeaponHUD();
        }
    }
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            combo = 0; updateComboHUD();
            document.getElementById('combo-display').style.opacity = '0';
        }
    }
    if (!player.onGround) {
        player.vy += 0.55; player.y += player.vy;
        if (player.y >= player.groundY) {
            player.y = player.groundY; player.vy = 0; player.onGround = true;
            spawnParticles(player.x + player.w / 2, player.y + player.h, 5, '#00f5ff33', 2, 12);
        }
    }
    player.x += player.vx;
    player.x = Math.max(ROAD_LEFT, Math.min(ROAD_RIGHT - player.w, player.x));
    player.trail.push({ x: player.x + player.w / 2, y: player.y + player.h });
    if (player.trail.length > 14) player.trail.shift();
    if (player.invincible > 0) player.invincible--;
    bgStars.forEach(s => { s.y += s.spd; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
    wave = Math.floor(frameCount / 600) + 1;
    spawnInterval = Math.max(35, 90 - (wave - 1) * 5);
    if (wave > 0 && wave % 5 === 0 && !bossActive && frameCount % 600 < 10) {
        spawnBoss();
    }
    spawnTimer++;
    if (spawnTimer >= spawnInterval && !bossActive) {
        spawnTimer = 0;
        spawnEnemy();
        if (Math.random() < 0.12) spawnPowerup();
    }
    if (bossActive && bossEntity) {
        const b = bossEntity;
        if (!b.entryDone) {
            b.y += 2.5;
            if (b.y >= 30) { b.entryDone = true; }
        } else {
            b.x += b.spd * b.moveDir;
            if (b.x <= ROAD_LEFT + 5 || b.x + b.w >= ROAD_RIGHT - 5) b.moveDir *= -1;
            if (b.hp <= b.maxHp * 0.33 && b.currentPhase < b.phase) {
                b.currentPhase++;
                b.spd *= 1.3;
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, 25, b.color, 7, 40);
                playTone(150, 0.16, 'sawtooth', 0.1, 100);
            }
        }
        b.shootTimer--;
        if (b.shootTimer <= 0 && b.entryDone) {
            enemyShoot(b);
            if (b.aoe && b.currentPhase >= 3) {
                bullets.push({ x: b.x + b.w / 2, y: b.y + b.h, vx: 0, vy: 6, w: 10, h: 16, owner: 'enemy', color: '#ff6600', trail: [], dmg: 20, type: 3, aoe: true });
            }
            b.shootTimer = Math.max(18, 45 - b.currentPhase * 8);
        }
        const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
        if (rectOverlap(pRect, { x: b.x, y: b.y, w: b.w, h: b.h })) {
            damagePlayer(15 + level);
        }
    }
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (e.flying) {
            e.y += Math.sin(frameCount * 0.04 + e.movePhase) * 0.7;
            e.x = e.originalX + Math.sin(frameCount * 0.02 + e.movePhase) * 30;
        } else {
            e.y += e.spd + (level - 1) * 0.07;
        }
        e.shootTimer--;
        if (e.shootTimer <= 0) {
            if (Math.random() < 0.3 + level * 0.025) enemyShoot(e);
            e.shootTimer = 55 + Math.random() * 80;
        }
        if (e.y > H + 80) { enemies.splice(ei, 1); continue; }
        const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
        if (rectOverlap(pRect, { x: e.x, y: e.y, w: e.w, h: e.h })) {
            damagePlayer(5 + level);
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 18, e.color, 5, 28);
            enemies.splice(ei, 1);
        }
    }
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 6) b.trail.shift();
        b.x += b.vx; b.y += b.vy;
        if (b.y < -40 || b.y > H + 40 || b.x < ROAD_LEFT - 40 || b.x > ROAD_RIGHT + 40) {
            bullets.splice(bi, 1); continue;
        }
        if (b.owner === 'player') {
            let hit = false;
            if (bossActive && bossEntity && bossEntity.entryDone) {
                const boss = bossEntity;
                if (b.x > boss.x && b.x < boss.x + boss.w && b.y > boss.y && b.y < boss.y + boss.h) {
                    boss.hp -= b.dmg;
                    spawnParticles(b.x, b.y, 8, '#ffcc00', 4, 20);
                    if (b.aoe) triggerRocketExplosion(b.x, b.y, 60);
                    bullets.splice(bi, 1); hit = true;
                    if (boss.hp <= 0) {
                        const mult = player._scoreMult || 1;
                        score += Math.round(boss.score * level * mult);
                        gainXP(boss.xp);
                        addFloatText(boss.x + boss.w / 2, boss.y, `+${boss.score}`, boss.color);
                        spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, 60, boss.color, 8, 60);
                        triggerRocketExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, 120);
                        bossActive = false; bossEntity = null; bossKillCount++;
                        document.getElementById('boss-bar-wrap').style.display = 'none';
                        playBossDestroyedSfx();
                        updateHUD();
                        addKill();
                        for (let pi = 0; pi < 3; pi++) spawnPowerup(boss.x + boss.w / 2 + (pi - 1) * 30, boss.y + 50);
                    }
                    updateHUD();
                }
            }
            if (!hit) {
                for (let ei = enemies.length - 1; ei >= 0; ei--) {
                    const e = enemies[ei];
                    if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                        e.hp -= b.dmg;
                        if (b.aoe) triggerRocketExplosion(b.x, b.y, 50);
                        spawnParticles(b.x, b.y, 5, '#ff8800', 3, 13);
                        bullets.splice(bi, 1);
                        if (e.hp <= 0) {
                            const mult = player._scoreMult || 1;
                            const comboMult = 1 + combo * 0.1;
                            const gained = Math.round(e.score * level * mult * comboMult);
                            score += gained;
                            gainXP(e.xp);
                            addFloatText(e.x + e.w / 2, e.y, `+${gained}`, combo >= 3 ? '#ff6b00' : '#ff8800');
                            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 22, e.color, 6, 38);
                            enemies.splice(ei, 1);
                            playEnemyDestroyedSfx();
                            addKill();
                            if (Math.random() < 0.1) spawnPowerup(e.x + e.w / 2, e.y);
                        }
                        updateHUD(); break;
                    }
                }
            }
        } else {
            const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
            if (b.x > pRect.x && b.x < pRect.x + pRect.w && b.y > pRect.y && b.y < pRect.y + pRect.h) {
                if (b.aoe) triggerRocketExplosion(b.x, b.y, 45);
                damagePlayer(b.dmg);
                spawnParticles(b.x, b.y, 8, '#ff0040', 3, 20);
                bullets.splice(bi, 1);
            }
        }
    }
    for (let ri = rocketExplosions.length - 1; ri >= 0; ri--) {
        const re = rocketExplosions[ri];
        re.life--;
        if (re.life <= 0) { rocketExplosions.splice(ri, 1); continue; }
        if (re.life === re.maxLife - 3) {
            enemies.forEach((e, ei) => {
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                const dist = Math.hypot(ex - re.x, ey - re.y);
                if (dist < re.radius) {
                    e.hp -= 5;
                    if (e.hp <= 0) {
                        const mult = player._scoreMult || 1;
                        score += Math.round(e.score * level * mult);
                        gainXP(e.xp);
                        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 15, e.color, 5, 30);
                        enemies.splice(ei, 1);
                        addKill();
                    }
                }
            });
        }
    }
    for (let pi = powerups.length - 1; pi >= 0; pi--) {
        const p = powerups[pi];
        p.y += p.vy; p.spin += 0.06;
        if (p.y > H + 30) { powerups.splice(pi, 1); continue; }
        const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
        if (rectOverlap(pRect, { x: p.x, y: p.y, w: p.w, h: p.h })) {
            playPickupSfx();
            switch (p.type) {
                case 'hp': hp = Math.min(maxHp, hp + 35); addFloatText(p.x, p.y, '+35 HP', '#ff0040'); break;
                case 'xp': gainXP(50); addFloatText(p.x, p.y, '+50 XP', '#00ff88'); break;
                case 'shield': player.invincible = 130; addFloatText(p.x, p.y, 'SHIELD!', '#00f5ff'); break;
                case 'multi': score += 100 * level; addFloatText(p.x, p.y, '×2 SCORE!', '#ff6b00'); break;
                case 'weapon': pickUpWeapon(p.x, p.y); break;
            }
            spawnParticles(p.x + 10, p.y + 10, 14, '#ffffff', 4, 22);
            powerups.splice(pi, 1); updateHUD();
        }
    }
    for (let pi = particles.length - 1; pi >= 0; pi--) {
        const p = particles[pi];
        p.x += p.vx; p.y += p.vy; p.vy += (p.gravity || 0.08); p.life--;
        if (p.life <= 0) particles.splice(pi, 1);
    }
    for (let ti = floatTexts.length - 1; ti >= 0; ti--) {
        const t = floatTexts[ti];
        t.y += t.vy; t.life--;
        if (t.life <= 0) floatTexts.splice(ti, 1);
    }
}

function triggerRocketExplosion(x, y, radius) {
    rocketExplosions.push({ x, y, radius, life: 22, maxLife: 22 });
    spawnParticles(x, y, 25, '#ff8800', 7, 35, 0.05);
    spawnParticles(x, y, 10, '#ffcc00', 4, 20, 0.02);
    playNoise(0.11, 0.09, 220);
}

function pickUpWeapon(x, y) {
    const opts = [1, 2, 3];
    const next = opts[Math.floor(Math.random() * opts.length)];
    currentWeapon = next;
    reloading = false;
    updateWeaponHUD();
    playPickupSfx();
    addFloatText(x, y, `${WEAPONS[next].name}!`, '#cc44ff');
}

function cycleWeapon(dir) {
    currentWeapon = (currentWeapon + dir + WEAPONS.length) % WEAPONS.length;
    reloading = false;
    playUiBlipSfx();
    updateWeaponHUD();
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    const bgG = ctx.createLinearGradient(0, 0, 0, H);
    if (currentMap === 1) { bgG.addColorStop(0, '#020215'); bgG.addColorStop(1, '#050525'); }
    else if (currentMap === 2) { bgG.addColorStop(0, '#100a02'); bgG.addColorStop(1, '#1a1005'); }
    else { bgG.addColorStop(0, '#020210'); bgG.addColorStop(1, '#050520'); }
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
    bgStars.forEach(s => {
        ctx.fillStyle = `rgba(200,220,255,${s.s * 0.25})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.6, 0, Math.PI * 2); ctx.fill();
    });
    drawRoad();
    drawRain();
    drawDesertBg();
    powerups.forEach(p => drawPowerup(p));
    player.trail.forEach((t, i) => {
        ctx.save();
        ctx.globalAlpha = (i / player.trail.length) * 0.22;
        ctx.shadowBlur = 6; ctx.shadowColor = '#00f5ff';
        ctx.fillStyle = '#00f5ff';
        ctx.beginPath(); ctx.arc(t.x, t.y, 3 * (i / player.trail.length), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
    enemies.forEach(e => {
        if (e.flying) drawDrone(e.x, e.y, e.w, e.h, e.color);
        else drawCar(e.x, e.y, e.w, e.h, e.color, false, e.hp / e.maxHp);
    });
    if (bossActive && bossEntity) drawBoss(bossEntity);
    rocketExplosions.forEach(e => drawRocketExplosion(e));
    drawCar(player.x, player.y, player.w, player.h, '#00f5ff', true, 1, player.invincible > 0);
    if (player.invincible > 0) {
        ctx.save();
        ctx.globalAlpha = 0.28 + Math.sin(frameCount * 0.3) * 0.1;
        ctx.strokeStyle = '#00f5ff';
        ctx.shadowBlur = 18; ctx.shadowColor = '#00f5ff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.82, player.h * 0.72, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
    bullets.forEach(b => drawBullet(b));
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = (p.life / p.maxLife) * 0.88;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 5; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
    floatTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life / 55;
        ctx.fillStyle = t.color;
        ctx.shadowBlur = 10; ctx.shadowColor = t.color;
        ctx.font = 'bold 13px Orbitron,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });
    if (wave >= 4) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.12, 0.03 * (wave - 3));
        for (let i = 0; i < 8; i++) {
            const lx = ROAD_LEFT + Math.random() * ROAD_W;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(lx, ((frameCount * roadSpeed * 1.5 + i * 90) % H));
            ctx.lineTo(lx + 1, ((frameCount * roadSpeed * 1.5 + i * 90 + 65) % H));
            ctx.stroke();
        }
        ctx.restore();
    }
    const mapNames = ['🌙 MALAM', '🌧️ HUJAN', '☀️ GURUN'];
    if (frameCount % 600 < 90) {
        ctx.save();
        ctx.globalAlpha = (90 - frameCount % 600) / 90;
        ctx.fillStyle = '#ffffff22';
        ctx.font = '8px Orbitron,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mapNames[currentMap], W / 2, H - 18);
        ctx.restore();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function setupMobile() {
    const addTouch = (id, key) => {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; }, { passive: false });
        el.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; }, { passive: false });
        el.addEventListener('mousedown', () => keys[key] = true);
        el.addEventListener('mouseup', () => keys[key] = false);
    };
    addTouch('mb-left', 'ArrowLeft');
    addTouch('mb-right', 'ArrowRight');
    addTouch('mb-jump', 'Space');
    addTouch('mb-shoot-l', 'KeyZ');
    addTouch('mb-shoot-r', 'KeyX');
}

document.getElementById('btn-start').addEventListener('click', resetGame);
document.getElementById('btn-options').addEventListener('click', () => {
    playUiBlipSfx();
    showMenuScreen('options-screen');
    updateOptionsPanel();
});
document.getElementById('btn-quit').addEventListener('click', quitGame);
document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('gameover-screen').classList.add('hidden');
    resetGame();
});

document.getElementById('btn-sfx').addEventListener('click', () => {
    ensureAudioReady();
    setSfxEnabled(!sfxEnabled);
    if (sfxEnabled) playUiBlipSfx();
    updateOptionsPanel();
});
document.getElementById('btn-toggle-sfx').addEventListener('click', () => {
    ensureAudioReady();
    setSfxEnabled(!sfxEnabled);
    if (sfxEnabled) playUiBlipSfx();
    updateOptionsPanel();
});
document.getElementById('btn-back-to-menu').addEventListener('click', () => {
    playUiBlipSfx();
    showMenuScreen('start-screen');
});
document.getElementById('btn-back-from-quit').addEventListener('click', () => {
    playUiBlipSfx();
    showMenuScreen('start-screen');
});

document.getElementById('btn-lb-open').addEventListener('click', () => {
    playUiBlipSfx();
    renderLeaderboard();
    document.getElementById('leaderboard-screen').style.display = 'flex';
});
document.getElementById('btn-back-home').addEventListener('click', () => {
    playUiBlipSfx();
    showMenuScreen('start-screen');
});
document.getElementById('btn-lb-open2').addEventListener('click', () => {
    playUiBlipSfx();
    renderLeaderboard();
    document.getElementById('leaderboard-screen').style.display = 'flex';
});
document.getElementById('btn-lb-back').addEventListener('click', () => {
    playUiBlipSfx();
    document.getElementById('leaderboard-screen').style.display = 'none';
});
document.getElementById('btn-lb-clear').addEventListener('click', () => {
    if (confirm('Hapus semua data leaderboard?')) {
        localStorage.removeItem('turboBlitzLB');
        renderLeaderboard();
    }
});

document.addEventListener('pointerdown', ensureAudioReady, { once: true });
document.addEventListener('keydown', ensureAudioReady, { once: true });

setupMobile();
updateHUD();
updateWeaponHUD();
setSfxEnabled(true);
updateOptionsPanel();
loop();
