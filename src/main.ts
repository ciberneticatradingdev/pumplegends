import {
  GameState, Vec2, AbilityKey, ChampType,
  MAP_W, MAP_H
} from './types';
import { createFullGame, update, castAbility, resetForPlay } from './engine';
import { render } from './render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: true })!;

let state: GameState = createFullGame();
let cursor: Vec2 = { x: MAP_W/2, y: MAP_H/2 };
let lastTime = performance.now();

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function viewGeom() {
  const scale = Math.min(window.innerWidth / MAP_W, window.innerHeight / MAP_H);
  const offX = (window.innerWidth - MAP_W * scale) / 2;
  const offY = (window.innerHeight - MAP_H * scale) / 2;
  return { scale, offX, offY };
}

function screenToWorld(sx: number, sy: number): Vec2 {
  const { scale, offX, offY } = viewGeom();
  return { x: (sx - offX) / scale, y: (sy - offY) / scale };
}

const selection = document.getElementById('selection')!;
const startBtn = document.getElementById('start-btn')!;
const overlay = document.getElementById('overlay')!;

document.querySelectorAll('.champ-card').forEach(el => {
  el.addEventListener('click', () => {
    const type = el.getAttribute('data-champ') as ChampType;
    state.selectedChamp = type;
    document.querySelectorAll('.champ-card').forEach(c => (c as HTMLElement).classList.remove('selected'));
    el.classList.add('selected');
  });
});

startBtn.addEventListener('click', () => {
  if (!state.selectedChamp) state.selectedChamp = 'melee';
  selection.style.display = 'none';
  state.status = 'playing';
  resetForPlay(state);
  lastTime = performance.now();
});

(window as any).restartGame = () => {
  overlay.classList.remove('show');
  resetForPlay(state);
  state.status = 'playing';
  lastTime = performance.now();
};

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousemove', e => {
  cursor = screenToWorld(e.clientX, e.clientY);
});

canvas.addEventListener('mousedown', e => {
  if (state.status === 'playing' || !state.player || !state.player.alive) return;
  const p = state.player;
  const world = screenToWorld(e.clientX, e.clientY);
  
  if (e.button === 2) {
    let found: any = null;
    let bestDist = Infinity;
    state.entities.forEach(ent => {
      if (!ent.alive || ent.team === p.team) return;
      const d = Math.hypot(ent.pos.x - world.x, ent.pos.y - world.y);
      if (d < (ent.radius + 12) && d < bestDist) { found = ent; bestDist = d; }
    });
    
    if (found) {
      p.attackTargetId = found.id;
      p.moveTarget = null;
    } else {
      p.moveTarget = world;
      p.attackTargetId = null;
    }
  } else if (e.button === 0) {
    p.moveTarget = world;
    p.attackTargetId = null;
  }
});

window.addEventListener('keydown', e => {
  if (state.status === 'playing' || !state.player) return;
  const k = e.key.toUpperCase();
  if (k === 'S') { state.player.moveTarget = null; state.player.attackTargetId = null; return; }
  if (['Q','W','E','R'].includes(k)) { castAbility(state, state.player, k as AbilityKey, cursor); e.preventDefault(); }
  if (e.key === 'Escape') { overlay.classList.remove('show'); state.status = 'selecting'; selection.style.display = 'flex'; }
});

const hpBar = document.getElementById('hp-bar')!;
const manaBar = document.getElementById('mana-bar')!;
const portrait = document.getElementById('portrait')!;
const champName = document.getElementById('champ-name')!;
const levelEl = document.getElementById('level')!;
const goldEl = document.getElementById('gold')!;
const kdaEl = document.getElementById('kda')!;
const blueKillsEl = document.getElementById('blue-kills')!;
const redKillsEl = document.getElementById('red-kills')!;
const timerEl = document.getElementById('timer')!;
const abilityEls = new Map<AbilityKey, HTMLElement>();
document.querySelectorAll('.ability').forEach((el: any) => {
  const key = el.getAttribute('data-key') as AbilityKey;
  abilityEls.set(key, el);
});

function updateHUD() {
  const p = state.player;
  if (!p) return;
  portrait.textContent = p.initial;
  portrait.style.borderColor = p.team === 'blue' ? '#4a9eff' : '#ff4a4a';
  champName.textContent = p.name;
  hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
  manaBar.style.width = `${Math.max(0, (p.mana / p.maxMana) * 100)}%`;
  levelEl.textContent = `Lv${p.level}`;
  goldEl.textContent = `${Math.floor(p.gold)}g`;
  kdaEl.textContent = `${p.kills}/${p.deaths}/${p.assists}`;
  blueKillsEl.textContent = state.blueKills.toString();
  redKillsEl.textContent = state.redKills.toString();
  const min = Math.floor(state.time / 60);
  const sec = Math.floor(state.time % 60);
  timerEl.textContent = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  
  (['Q','W','E','R'] as AbilityKey[]).forEach(key => {
    const el = abilityEls.get(key)!;
    const ab = p.abilities[key];
    const cdSpan = el.querySelector('.cd') as any;
    if (ab.level <= 0) { el.style.borderColor = '#333'; cdSpan.textContent = '—'; return; }
    if (ab.cooldown > 0.05) {
      el.style.borderColor = '#555'; cdSpan.textContent = Math.ceil(ab.cooldown).toString(); el.style.opacity = '0.6';
    } else {
      const canCast = p.mana >= ab.manaCost && p.alive;
      el.style.borderColor = key === 'R' ? '#e74c3c' : (canCast ? '#f1c40f' : '#444');
      el.style.opacity = canCast ? '1' : '0.5';
      cdSpan.textContent = '';
    }
  });

  if (state.status === 'gameover' && !overlay.classList.contains('show')) {
    overlay.classList.add('show');
    const title = document.getElementById('end-title')!;
    const txt = document.getElementById('end-text')!;
    if (state.winner === 'blue') {
      title.textContent = 'VICTORY'; title.style.color = '#4a9eff';
      txt.textContent = `You destroyed the enemy Nexus! KDA: ${p.kills}/${p.deaths}/${p.assists}`;
    } else {
      title.textContent = 'DEFEAT'; title.style.color = '#ff4a4a';
      txt.textContent = `Your Nexus was destroyed. KDA: ${p.kills}/${p.deaths}/${p.assists}`;
    }
  }
}

function loop(now: number) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.06) dt = 0.06;
  if (state.status === 'playing') update(state, dt);
  const { scale, offX, offY } = viewGeom();
  ctx.save();
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(offX, offY); ctx.scale(scale, scale);
  render(ctx, state, cursor);
  ctx.restore();
  updateHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
(window as any).PUMPLEGENDS = { state };
