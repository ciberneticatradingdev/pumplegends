import type {
  GameState, Champion, Entity,
  Team, AbilityKey, Vec2, ChampType, EntityKind, Lane
} from './types';
import {
  MAP_W, MAP_H, LANE_TOP_Y, LANE_MID_Y, LANE_BOT_Y
} from './types';

// ===== Champion Definitions =====
interface ChampDef {
  name: string; initial: string; color: string; type: ChampType;
  hp: number; mana: number; ad: number; attackRange: number;
  moveSpeed: number; radius: number; as: number;
  abilities: Record<AbilityKey, { cd: number; mana: number; maxLvl: number }>;
}

const CHAMPS: Record<ChampType, ChampDef> = {
  adc: {
    name: 'PUMP RANGER', initial: 'R', color: '#27ae60', type: 'adc',
    hp: 540, mana: 300, ad: 62, attackRange: 520, moveSpeed: 335, radius: 16, as: 0.72,
    abilities: {
      Q: { cd: 7, mana: 55, maxLvl: 5 },
      W: { cd: 14, mana: 40, maxLvl: 5 },
      E: { cd: 12, mana: 35, maxLvl: 5 },
      R: { cd: 110, mana: 100, maxLvl: 3 },
    }
  },
  melee: {
    name: 'PUMP KNIGHT', initial: 'K', color: '#4a90d9', type: 'melee',
    hp: 650, mana: 300, ad: 66, attackRange: 155, moveSpeed: 345, radius: 18, as: 0.68,
    abilities: {
      Q: { cd: 5, mana: 35, maxLvl: 5 },
      W: { cd: 14, mana: 50, maxLvl: 5 },
      E: { cd: 13, mana: 45, maxLvl: 5 },
      R: { cd: 90, mana: 100, maxLvl: 3 },
    }
  },
  mage: {
    name: 'PUMP SORCERER', initial: 'S', color: '#9b59b6', type: 'mage',
    hp: 510, mana: 520, ad: 52, attackRange: 510, moveSpeed: 330, radius: 15, as: 0.62,
    abilities: {
      Q: { cd: 6, mana: 55, maxLvl: 5 },
      W: { cd: 12, mana: 70, maxLvl: 5 },
      E: { cd: 15, mana: 40, maxLvl: 5 },
      R: { cd: 95, mana: 100, maxLvl: 3 },
    }
  },
  tank: {
    name: 'PUMP COLOSSUS', initial: 'C', color: '#7f8c8d', type: 'tank',
    hp: 780, mana: 310, ad: 58, attackRange: 155, moveSpeed: 325, radius: 21, as: 0.54,
    abilities: {
      Q: { cd: 8, mana: 45, maxLvl: 5 },
      W: { cd: 17, mana: 60, maxLvl: 5 },
      E: { cd: 10, mana: 40, maxLvl: 5 },
      R: { cd: 120, mana: 100, maxLvl: 3 },
    }
  }
};

const STRUCTS = {
  blue: {
    nexus: { x: 180, y: LANE_MID_Y },
    inhib: { x: 380, y: LANE_MID_Y },
    nexusTurret: { x: 280, y: LANE_MID_Y },
    inhibTurret: { x: 540, y: LANE_MID_Y },
    outerTurret: { x: 860, y: LANE_MID_Y }
  },
  red: {
    nexus: { x: MAP_W - 180, y: LANE_MID_Y },
    inhib: { x: MAP_W - 380, y: LANE_MID_Y },
    nexusTurret: { x: MAP_W - 280, y: LANE_MID_Y },
    inhibTurret: { x: MAP_W - 540, y: LANE_MID_Y },
    outerTurret: { x: MAP_W - 860, y: LANE_MID_Y }
  }
};

function champSpawn(team: Team): Vec2 {
  return team === 'blue'
    ? { x: 620, y: LANE_MID_Y - 60 }
    : { x: MAP_W - 620, y: LANE_MID_Y + 60 };
}

function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function norm(v: Vec2): Vec2 { const m = Math.hypot(v.x,v.y)||1; return {x:v.x/m, y:v.y/m}; }

function makeChampion(state: GameState, type: ChampType, team: Team, isPlayer: boolean): Champion {
  const def = CHAMPS[type];
  const spawn = champSpawn(team);
  const c: Champion = {
    id: state.nextId++, kind: 'champion', team, champType: type,
    pos: { ...spawn }, spawnPos: { ...spawn },
    hp: def.hp, maxHp: def.hp,
    mana: def.mana, maxMana: def.mana,
    attackDamage: def.ad, attackRange: def.attackRange,
    attackSpeed: def.as, attackCooldown: 0,
    moveSpeed: def.moveSpeed, radius: def.radius,
    alive: true, moveTarget: null, attackTargetId: null,
    xpReward: 0, goldReward: 0, lastDamageBy: null,
    name: def.name, initial: def.initial, color: def.color,
    level: 1, xp: 0, xpToNext: 280, hpRegen: 1.4, manaRegen: 1.8,
    gold: 0, kills: 0, deaths: 0, assists: 0, respawnTimer: 0,
    isPlayer, dashTarget: null, dashTimer: 0,
    abilities: {} as any
  };
  (['Q','W','E','R'] as AbilityKey[]).forEach(k => {
    const a = def.abilities[k];
    c.abilities[k] = { key: k, cooldown: 0, cooldownMax: a.cd, manaCost: a.mana, level: 0, maxLevel: a.maxLvl };
  });
  c.abilities.Q.level = 1;
  return c;
}

export function createFullGame(): GameState {
  const state: GameState = {
    entities: new Map(),
    projectiles: [],
    particles: [],
    floatingTexts: [],
    nextId: 1,
    time: 0,
    minionWaveTimer: 22,
    player: null,
    blueNexus: null,
    redNexus: null,
    blueInhib: null,
    redInhib: null,
    status: 'selecting',
    winner: null,
    blueKills: 0,
    redKills: 0,
    selectedChamp: null,
    msg: '',
    msgTimer: 0,
  };
  
  const bn = makeStructure(state, 'nexus', 'blue', STRUCTS.blue.nexus, 4200, 110);
  const bi = makeStructure(state, 'inhibitor', 'blue', STRUCTS.blue.inhib, 3200, 65);
  makeStructure(state, 'turret', 'blue', STRUCTS.blue.nexusTurret, 2100, 80);
  makeStructure(state, 'turret', 'blue', STRUCTS.blue.inhibTurret, 2100, 80);
  makeStructure(state, 'turret', 'blue', STRUCTS.blue.outerTurret, 2100, 80);
  
  state.blueNexus = bn;
  state.blueInhib = bi;
  
  const rn = makeStructure(state, 'nexus', 'red', STRUCTS.red.nexus, 4200, 110);
  const ri = makeStructure(state, 'inhibitor', 'red', STRUCTS.red.inhib, 3200, 65);
  makeStructure(state, 'turret', 'red', STRUCTS.red.nexusTurret, 2100, 80);
  makeStructure(state, 'turret', 'red', STRUCTS.red.inhibTurret, 2100, 80);
  makeStructure(state, 'turret', 'red', STRUCTS.red.outerTurret, 2100, 80);
  
  state.redNexus = rn;
  state.redInhib = ri;
  
  return state;
}

function makeStructure(state: GameState, kind: EntityKind, team: Team, pos: Vec2, hp: number, r: number): Entity {
  const e: Entity = {
    id: state.nextId++, kind, team, pos: { ...pos },
    hp, maxHp: hp, radius: r,
    attackDamage: kind === 'nexus' ? 0 : (kind === 'turret' ? 160 : 60),
    attackRange: kind === 'turret' ? 680 : (kind === 'inhibitor' ? 520 : 0),
    attackSpeed: 0.5, attackCooldown: 0,
    moveSpeed: 0, alive: true,
    moveTarget: null, attackTargetId: null,
    xpReward: 0, goldReward: 0, lastDamageBy: null
  };
  state.entities.set(e.id, e);
  return e;
}

export function resetForPlay(state: GameState) {
  const toDelete: number[] = [];
  state.entities.forEach((e, id) => { if (e.kind === 'champion') toDelete.push(id); });
  toDelete.forEach(id => state.entities.delete(id));
  
  state.projectiles = [];
  state.particles = [];
  state.floatingTexts = [];
  
  state.time = 0;
  state.minionWaveTimer = 22;
  state.blueKills = 0;
  state.redKills = 0;
  state.status = 'playing';
  state.winner = null;
  state.msg = '';
  state.msgTimer = 0;
  
  if (!state.selectedChamp) state.selectedChamp = 'melee';
  
  const player = makeChampion(state, state.selectedChamp, 'blue', true);
  const enemy = makeChampion(state, ['adc','melee','mage','tank'][Math.floor(Math.random()*4)] as ChampType, 'red', false);
  
  state.player = player;
  state.entities.set(player.id, player);
  state.entities.set(enemy.id, enemy);
}

function spawnMinionWave(state: GameState) {
  const lanes: Lane[] = ['top', 'mid', 'bot'];
  const yForLane = (l: Lane) => l === 'top' ? LANE_TOP_Y : (l === 'mid' ? LANE_MID_Y : LANE_BOT_Y);
  
  lanes.forEach(lane => {
    for (let i = 0; i < 3; i++) {
      const m: Entity = {
        id: state.nextId++, kind: 'minion', team: 'blue', lane,
        pos: { x: 660 + i * 22, y: yForLane(lane) + (i-1)*22 },
        hp: 260, maxHp: 260, radius: 12,
        attackDamage: 18, attackRange: 120, attackSpeed: 0.85, attackCooldown: 0.4,
        moveSpeed: 195, alive: true,
        moveTarget: null, attackTargetId: null,
        xpReward: 18, goldReward: 18, lastDamageBy: null
      };
      state.entities.set(m.id, m);
    }
    for (let i = 0; i < 3; i++) {
      const m: Entity = {
        id: state.nextId++, kind: 'minion', team: 'red', lane,
        pos: { x: MAP_W - 660 - i * 22, y: yForLane(lane) + (i-1)*22 },
        hp: 260, maxHp: 260, radius: 12,
        attackDamage: 18, attackRange: 120, attackSpeed: 0.85, attackCooldown: 0.4,
        moveSpeed: 195, alive: true,
        moveTarget: null, attackTargetId: null,
        xpReward: 18, goldReward: 18, lastDamageBy: null
      };
      state.entities.set(m.id, m);
    }
  });
}

export function update(state: GameState, dt: number) {
  if (state.status !== 'playing') return;
  
  state.time += dt;
  state.minionWaveTimer -= dt;
  
  if (state.minionWaveTimer <= 0) {
    spawnMinionWave(state);
    state.minionWaveTimer = 28;
  }
  
  const champions: Champion[] = [];
  state.entities.forEach(e => {
    if (e.kind === 'champion' && e.alive) champions.push(e as Champion);
  });
  
  champions.forEach(champ => {
    updateChampion(state, champ, dt);
  });
  
  state.entities.forEach(e => {
    if (e.kind === 'minion' && e.alive) updateMinion(state, e, dt);
  });
  
  state.entities.forEach(e => {
    if ((e.kind === 'turret' || e.kind === 'nexus') && e.alive) updateStructure(state, e, dt);
  });
  
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.pos.x += proj.vel.x * proj.speed * dt;
    proj.pos.y += proj.vel.y * proj.speed * dt;
    proj.life -= dt;
    
    let hit = false;
    state.entities.forEach(target => {
      if (!target.alive || target.team === proj.team) return;
      if (dist(proj.pos, target.pos) < target.radius + proj.radius) {
        target.hp -= proj.damage;
        target.lastDamageBy = proj.ownerId;
        
        state.particles.push({
          pos: { ...proj.pos }, vel: { x: (Math.random()-0.5)*80, y: (Math.random()-0.5)*80 },
          life: 0.4, maxLife: 0.4, color: proj.color, size: 4
        });
        
        if (target.hp <= 0) handleDeath(state, target, proj.ownerId);
        
        hit = true;
      }
    });
    
    if (hit || proj.life <= 0) state.projectiles.splice(i, 1);
  }
  
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const t = state.floatingTexts[i];
    t.pos.y += t.vy * dt;
    t.life -= dt;
    if (t.life <= 0) state.floatingTexts.splice(i, 1);
  }
  
  const p = state.player;
  if (p && p.alive) {
    p.hp = Math.min(p.maxHp, p.hp + p.hpRegen * dt);
    p.mana = Math.min(p.maxMana, p.mana + p.manaRegen * dt);
    Object.values(p.abilities).forEach(a => { if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt); });
  }
  
  state.entities.forEach(e => {
    if (e.kind === 'champion' && e.id !== p?.id && e.alive) {
      const c = e as Champion;
      c.hp = Math.min(c.maxHp, c.hp + c.hpRegen * dt);
      c.mana = Math.min(c.maxMana, c.mana + c.manaRegen * dt);
      Object.values(c.abilities).forEach(a => { if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt); });
    }
  });
  
  if (state.blueNexus && state.blueNexus.hp <= 0) {
    state.winner = 'red';
    state.status = 'gameover';
  }
  if (state.redNexus && state.redNexus.hp <= 0) {
    state.winner = 'blue';
    state.status = 'gameover';
  }
}

function updateChampion(state: GameState, c: Champion, dt: number) {
  if (c.attackCooldown > 0) c.attackCooldown -= dt;
  
  if (c.dashTarget && c.dashTimer > 0) {
    const dir = norm({ x: c.dashTarget.x - c.pos.x, y: c.dashTarget.y - c.pos.y });
    const speed = 720;
    c.pos.x += dir.x * speed * dt;
    c.pos.y += dir.y * speed * dt;
    c.dashTimer -= dt;
    if (c.dashTimer <= 0) c.dashTarget = null;
    return;
  }
  
  if (c.attackCooldown <= 0) {
    let target: Entity | null = null;
    
    if (c.attackTargetId) {
      const t = state.entities.get(c.attackTargetId);
      if (t && t.alive && dist(c.pos, t.pos) <= c.attackRange + 20) target = t;
    }
    
    if (!target) {
      let bestDist = Infinity;
      state.entities.forEach(ent => {
        if (!ent.alive || ent.team === c.team) return;
        const d = dist(c.pos, ent.pos);
        if (d < c.attackRange && d < bestDist) {
          bestDist = d; target = ent;
        }
      });
    }
    
    if (target) {
      const dir = norm({ x: target.pos.x - c.pos.x, y: target.pos.y - c.pos.y });
      state.projectiles.push({
        id: state.nextId++,
        team: c.team,
        pos: { x: c.pos.x + dir.x * 24, y: c.pos.y + dir.y * 24 },
        vel: dir,
        speed: 560,
        damage: c.attackDamage,
        radius: 6,
        ownerId: c.id,
        targetId: target.id,
        color: c.team === 'blue' ? '#7dd3fc' : '#fca5a5',
        life: 1.6,
        kind: 'auto'
      });
      c.attackCooldown = 1 / c.attackSpeed;
    }
  }
  
  if (c.moveTarget) {
    const dx = c.moveTarget.x - c.pos.x;
    const dy = c.moveTarget.y - c.pos.y;
    const d = Math.hypot(dx, dy);
    
    if (d < 8) {
      c.moveTarget = null;
    } else {
      const dir = { x: dx / d, y: dy / d };
      c.pos.x += dir.x * c.moveSpeed * dt;
      c.pos.y += dir.y * c.moveSpeed * dt;
      
      c.pos.x = Math.max(60, Math.min(MAP_W - 60, c.pos.x));
      c.pos.y = Math.max(60, Math.min(MAP_H - 60, c.pos.y));
    }
  }
  
  if (!c.isPlayer && !c.moveTarget && !c.attackTargetId) {
    const goalX = c.team === 'blue' ? MAP_W - 200 : 200;
    c.moveTarget = { x: goalX, y: c.pos.y + (Math.random() - 0.5) * 60 };
  }
}

function updateMinion(state: GameState, m: Entity, dt: number) {
  if (m.attackCooldown > 0) m.attackCooldown -= dt;
  
  let tgt: Entity | null = null;
  let best = Infinity;
  
  state.entities.forEach(e => {
    if (!e.alive || e.team === m.team) return;
    const d = dist(m.pos, e.pos);
    if (d < m.attackRange * 1.1 && d < best) { best = d; tgt = e; }
  });
  
  if (tgt && m.attackCooldown <= 0) {
    m.attackCooldown = 1.1;
    const dir = norm({ x: tgt.pos.x - m.pos.x, y: tgt.pos.y - m.pos.y });
    state.projectiles.push({
      id: state.nextId++, team: m.team,
      pos: { ...m.pos }, vel: dir, speed: 420,
      damage: m.attackDamage, radius: 5, ownerId: m.id, targetId: tgt.id,
      color: m.team === 'blue' ? '#a5b4fc' : '#fda4af',
      life: 1.2, kind: 'auto'
    });
  } else if (!tgt) {
    const goal = m.team === 'blue' 
      ? { x: MAP_W - 140, y: m.pos.y } 
      : { x: 140, y: m.pos.y };
    const dx = goal.x - m.pos.x, dy = goal.y - m.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    m.pos.x += (dx / d) * m.moveSpeed * dt * 0.9;
    m.pos.y += (dy / d) * m.moveSpeed * dt * 0.9;
  }
}

function updateStructure(state: GameState, e: Entity, dt: number) {
  if (e.attackCooldown > 0) e.attackCooldown -= dt;
  if (e.kind !== 'turret') return;
  
  let tgt: Entity | null = null;
  let best = Infinity;
  state.entities.forEach(ent => {
    if (!ent.alive || ent.team === e.team) return;
    const d = dist(e.pos, ent.pos);
    if (d < e.attackRange && d < best) {
      best = d; tgt = ent;
    }
  });
  
  if (tgt && e.attackCooldown <= 0) {
    e.attackCooldown = 1.6;
    const dir = norm({ x: tgt.pos.x - e.pos.x, y: tgt.pos.y - e.pos.y });
    state.projectiles.push({
      id: state.nextId++, team: e.team,
      pos: { ...e.pos }, vel: dir, speed: 680,
      damage: e.attackDamage, radius: 7, ownerId: e.id,
      targetId: tgt.id, color: e.team === 'blue' ? '#bae6fd' : '#fecaca',
      life: 1.8, kind: 'turret'
    });
  }
}

export function castAbility(state: GameState, caster: Champion, key: AbilityKey, target: Vec2) {
  const ab = caster.abilities[key];
  if (!ab || ab.cooldown > 0.1 || caster.mana < ab.manaCost || ab.level <= 0) return;
  
  caster.mana -= ab.manaCost;
  ab.cooldown = ab.cooldownMax;
  
  const dir = norm({ x: target.x - caster.pos.x, y: target.y - caster.pos.y });
  
  if (caster.champType === 'mage') {
    if (key === 'Q') {
      state.projectiles.push({
        id: state.nextId++, team: caster.team,
        pos: { x: caster.pos.x + dir.x * 30, y: caster.pos.y + dir.y * 30 },
        vel: dir, speed: 880, damage: 95 + ab.level * 28, radius: 18,
        ownerId: caster.id, targetId: null, color: '#c084fc', life: 2.2, kind: 'fireball'
      });
    } else if (key === 'W') {
      state.entities.forEach(ent => {
        if (!ent.alive || ent.team === caster.team) return;
        if (dist(ent.pos, caster.pos) < 210) {
          ent.hp -= 55 + ab.level * 22;
          if (ent.hp <= 0) handleDeath(state, ent, caster.id);
        }
      });
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2;
        state.particles.push({
          pos: { ...caster.pos }, vel: { x: Math.cos(ang) * 120, y: Math.sin(ang) * 120 },
          life: 0.6, maxLife: 0.6, color: '#bae6fd', size: 5
        });
      }
    } else if (key === 'E') {
      caster.dashTarget = { ...target };
      caster.dashTimer = 0.35;
    } else if (key === 'R') {
      state.projectiles.push({
        id: state.nextId++, team: caster.team,
        pos: { ...target }, vel: { x: 0, y: 0 }, speed: 0,
        damage: 200 + ab.level * 85, radius: 92,
        ownerId: caster.id, targetId: null, color: '#f472b6', life: 1.3, kind: 'aoe'
      });
    }
  }
  else if (caster.champType === 'adc') {
    if (key === 'Q') {
      state.projectiles.push({
        id: state.nextId++, team: caster.team,
        pos: { x: caster.pos.x + dir.x * 30, y: caster.pos.y + dir.y * 30 },
        vel: dir, speed: 1050, damage: 85 + ab.level * 27, radius: 12,
        ownerId: caster.id, targetId: null, color: '#86efac', life: 2.4, kind: 'pierce', piercing: true
      });
    }
    else if (key === 'W') {
      caster.attackSpeed *= 1.65;
      setTimeout(() => { if (caster && caster.alive) caster.attackSpeed /= 1.65; }, 4200);
    }
    else if (key === 'E') {
      caster.dashTarget = { x: caster.pos.x + dir.x * 240, y: caster.pos.y + dir.y * 240 };
      caster.dashTimer = 0.25;
    }
    else if (key === 'R') {
      for (let i = 0; i < 9; i++) {
        setTimeout(() => {
          if (!caster.alive) return;
          const off = { x: target.x + (Math.random() - 0.5) * 210, y: target.y + (Math.random() - 0.5) * 210 };
          state.projectiles.push({
            id: state.nextId++, team: caster.team,
            pos: off, vel: { x: 0, y: 1 }, speed: 60,
            damage: 42 + ab.level * 19, radius: 16, ownerId: caster.id,
            targetId: null, color: '#4ade80', life: 1.1, kind: 'rain'
          });
        }, i * 90);
      }
    }
  }
  else if (caster.champType === 'melee') {
    if (key === 'Q') {
      state.entities.forEach(ent => {
        if (!ent.alive || ent.team === caster.team) return;
        if (dist(ent.pos, caster.pos) < 165) {
          ent.hp -= 72 + ab.level * 31;
          if (ent.hp <= 0) handleDeath(state, ent, caster.id);
        }
      });
    }
    else if (key === 'E') {
      caster.dashTarget = target;
      caster.dashTimer = 0.3;
    }
    else if (key === 'R') {
      state.entities.forEach(ent => {
        if (!ent.alive || ent.team === caster.team) return;
        if (dist(ent.pos, caster.pos) < 190) {
          ent.hp -= 125 + ab.level * 75;
          if (ent.hp <= 0) handleDeath(state, ent, caster.id);
        }
      });
    }
  }
  else if (caster.champType === 'tank') {
    if (key === 'Q') {
      const near = [...state.entities.values()].find(en => en.alive && en.team !== caster.team && dist(en.pos, target) < 65);
      if (near) {
        near.hp -= 65 + ab.level * 34;
      }
    }
    else if (key === 'W') {
      caster.hp = Math.min(caster.maxHp, caster.hp + 90 + ab.level * 35);
    }
    else if (key === 'R') {
      caster.hp = Math.min(caster.maxHp, caster.hp + 190);
      caster.attackDamage += 22;
      setTimeout(() => { if (caster && caster.alive) caster.attackDamage -= 22; }, 6500);
    }
  }
}

function handleDeath(state: GameState, victim: Entity, killerId?: number) {
  victim.alive = false;
  victim.hp = 0;
  
  if (victim.kind === 'champion') {
    const champ = victim as Champion;
    champ.deaths++;
    if (killerId) {
      const killer = state.entities.get(killerId) as Champion | undefined;
      if (killer && killer.team !== champ.team) {
        killer.kills++;
        killer.gold += 280;
        killer.xp += 240;
        if (killer.team === 'blue') state.blueKills++; else state.redKills++;
      }
    }
    
    setTimeout(() => {
      if (!champ.alive) {
        champ.alive = true;
        champ.hp = champ.maxHp * 0.6;
        champ.mana = champ.maxMana * 0.7;
        champ.pos = { ...champ.spawnPos };
        champ.moveTarget = null;
        champ.attackTargetId = null;
      }
    }, 6500 + champ.level * 1400);
  }
  
  if (victim.kind === 'minion' && killerId) {
    const killer = state.entities.get(killerId) as Champion | undefined;
    if (killer) {
      killer.gold += victim.goldReward || 16;
      killer.xp += victim.xpReward || 18;
    }
  }
}