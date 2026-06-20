import type { GameState } from './types';
import { MAP_W, LANE_TOP_Y, LANE_MID_Y, LANE_BOT_Y } from './types';

export function render(ctx: CanvasRenderingContext2D, state: GameState, cursor: { x: number; y: number }) {
  ctx.save();
  
  ctx.fillStyle = '#111114';
  ctx.fillRect(0, 0, MAP_W, 1800);
  
  ctx.fillStyle = '#1a1a20';
  ctx.fillRect(60, LANE_TOP_Y - 120, MAP_W - 120, 190);
  ctx.fillRect(60, LANE_MID_Y - 120, MAP_W - 120, 240);
  ctx.fillRect(60, LANE_BOT_Y - 120, MAP_W - 120, 190);
  
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(80, LANE_MID_Y - 36, MAP_W - 160, 72);
  
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  [LANE_TOP_Y, LANE_MID_Y, LANE_BOT_Y].forEach(y => {
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(MAP_W - 90, y);
    ctx.stroke();
  });
  
  state.entities.forEach(e => {
    if ((e.kind === 'turret' || e.kind === 'nexus' || e.kind === 'inhibitor') && e.alive) {
      const isBlue = e.team === 'blue';
      const color = isBlue ? '#3b82f6' : '#ef4444';
      
      if (e.kind === 'nexus') {
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.fillRect(-e.radius * 0.9, -e.radius * 0.9, e.radius * 1.8, e.radius * 1.8);
        ctx.strokeRect(-e.radius * 0.9, -e.radius * 0.9, e.radius * 1.8, e.radius * 1.8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-12, -12, 24, 24);
        ctx.restore();
      } else if (e.kind === 'turret') {
        ctx.fillStyle = color;
        ctx.fillRect(e.pos.x - 28, e.pos.y - 28, 56, 56);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(e.pos.x - 28, e.pos.y - 28, 56, 56);
        ctx.fillStyle = '#111';
        ctx.fillRect(e.pos.x - 14, e.pos.y - 14, 28, 28);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(e.pos.x - 32, e.pos.y - 32, 64, 64);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 3;
        ctx.strokeRect(e.pos.x - 32, e.pos.y - 32, 64, 64);
      }
      
      const hpPct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = '#222';
      ctx.fillRect(e.pos.x - 38, e.pos.y - e.radius - 22, 76, 9);
      ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(e.pos.x - 38, e.pos.y - e.radius - 22, 76 * hpPct, 9);
    }
  });
  
  const entities: any[] = [];
  state.entities.forEach(e => { if (e.alive) entities.push(e); });
  entities.sort((a, b) => (a.kind === 'champion' ? 1 : 0) - (b.kind === 'champion' ? 1 : 0));
  
  entities.forEach(e => {
    if (e.kind === 'minion') {
      const col = e.team === 'blue' ? '#64748b' : '#854d0e';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    if (e.kind === 'champion') {
      const c = e;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = c.isPlayer ? '#fff' : '#222';
      ctx.lineWidth = c.isPlayer ? 5 : 3;
      ctx.stroke();
      
      const hpPct = Math.max(0, c.hp / c.maxHp);
      ctx.fillStyle = '#111';
      ctx.fillRect(c.pos.x - 26, c.pos.y - c.radius - 18, 52, 8);
      ctx.fillStyle = hpPct > 0.35 ? '#22c55e' : '#f87171';
      ctx.fillRect(c.pos.x - 26, c.pos.y - c.radius - 18, 52 * hpPct, 8);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.initial, c.pos.x, c.pos.y + 5);
    }
  });
  
  state.projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    
    if (p.kind === 'fireball') {
      ctx.fillStyle = '#fee2e2';
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.pos.x - p.size/2, p.pos.y - p.size/2, p.size, p.size);
  });
  ctx.globalAlpha = 1;
  
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  state.floatingTexts.forEach(t => {
    ctx.globalAlpha = t.life / t.maxLife;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.pos.x, t.pos.y);
  });
  ctx.globalAlpha = 1;
  
  if (state.status === 'playing' && state.player) {
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}
