export type Team = 'blue' | 'red';
export type EntityKind = 'champion' | 'minion' | 'turret' | 'nexus' | 'inhibitor';
export type Lane = 'top' | 'mid' | 'bot';
export type ChampType = 'adc' | 'melee' | 'mage' | 'tank';

export interface Vec2 { x: number; y: number; }

export interface Entity {
  id: number;
  kind: EntityKind;
  team: Team;
  pos: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;
  attackCooldown: number;
  moveSpeed: number;
  alive: boolean;
  moveTarget: Vec2 | null;
  attackTargetId: number | null;
  xpReward: number;
  goldReward: number;
  lastDamageBy: number | null;
  lane?: Lane;
}

export type AbilityKey = 'Q' | 'W' | 'E' | 'R';

export interface AbilityState {
  key: AbilityKey;
  cooldown: number;
  cooldownMax: number;
  manaCost: number;
  level: number;
  maxLevel: number;
}

export interface Champion extends Entity {
  name: string;
  initial: string;
  color: string;
  level: number;
  xp: number;
  xpToNext: number;
  mana: number;
  maxMana: number;
  hpRegen: number;
  manaRegen: number;
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  respawnTimer: number;
  abilities: Record<AbilityKey, AbilityState>;
  isPlayer: boolean;
  dashTarget: Vec2 | null;
  dashTimer: number;
  spawnPos: Vec2;
  champType: ChampType;
}

export interface Projectile {
  id: number;
  team: Team;
  pos: Vec2;
  vel: Vec2;
  speed: number;
  damage: number;
  radius: number;
  ownerId: number;
  targetId: number | null;
  color: string;
  life: number;
  kind: string;
  piercing?: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  pos: Vec2;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface GameState {
  entities: Map<number, Entity>;
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  nextId: number;
  time: number;
  minionWaveTimer: number;
  player: Champion | null;
  blueNexus: Entity | null;
  redNexus: Entity | null;
  blueInhib: Entity | null;
  redInhib: Entity | null;
  status: 'menu' | 'selecting' | 'playing' | 'gameover';
  winner: Team | null;
  blueKills: number;
  redKills: number;
  selectedChamp: ChampType | null;
  msg: string;
  msgTimer: number;
}

export const MAP_W = 2400;
export const MAP_H = 1800;
export const LANE_TOP_Y = 300;
export const LANE_MID_Y = 900;
export const LANE_BOT_Y = 1500;