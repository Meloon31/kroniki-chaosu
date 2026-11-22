import { CLASSES } from './classes.js';
import {
  EQUIP_SLOTS,
  getEffectiveItemBaseStats,
  getFullSetBonus,
} from './items.js';
import type {
  ClassId,
  ComputedStats,
  EquippedGear,
  Rarity,
  RuneLevels,
  SkillRanks,
} from './types.js';

export function computePlayerStats(
  classId: ClassId,
  level: number,
  equipped: EquippedGear,
  skillRanks: SkillRanks,
  runes: RuneLevels,
  extraPartyCdrPct = 0
): ComputedStats {
  const cls = CLASSES[classId];
  const lvlDelta = Math.max(0, level - 1);

  // 1. Base class stats (exact Appendix scaling)
  let flatHp = cls.baseHp + lvlDelta * cls.hpPerLvl;
  const maxMana = Math.round(cls.baseMana + lvlDelta * cls.manaPerLvl);
  let flatAd = cls.baseAd + lvlDelta * cls.adPerLvl;
  let flatAp = cls.baseAp + lvlDelta * cls.apPerLvl;
  let flatDef = cls.baseDef + lvlDelta * cls.defPerLvl;

  let moveSpeedPct = 0;
  let attackSpeedPct = 0;
  let critChance = cls.baseCritChance;
  let critDamage = 155; // base 155% crit damage (capped at 235% to prevent one-shots)
  let cdr = extraPartyCdrPct;
  let damageReduction = 0;
  let dodgeChance = classId === 'elf' ? 5 : 2;
  let healPowerPct = 0;
  let shieldPowerPct = 0;

  let adPct = 0;
  let apPct = 0;
  let hpPct = 0;
  let defPct = 0;

  // 2. Equipped gear + set counts
  const setCounts: Record<Rarity, number> = {
    zwykly: 0,
    normalny: 0,
    mityczny: 0,
    legendarny: 0,
    boski: 0,
  };

  for (const slot of EQUIP_SLOTS) {
    const item = equipped[slot];
    if (!item) continue;
    setCounts[item.rarity]++;

    const eff = getEffectiveItemBaseStats(item);
    flatHp += eff.hp;
    flatAd += eff.ad;
    flatAp += eff.ap;
    flatDef += eff.def;

    const b = item.bonusStats;
    if (b.hp) flatHp += b.hp;
    if (b.ad) flatAd += b.ad;
    if (b.ap) flatAp += b.ap;
    if (b.def) flatDef += b.def;
    if (b.critChance) critChance += b.critChance;
    if (b.critDamage) critDamage += b.critDamage;
    if (b.attackSpeed) attackSpeedPct += b.attackSpeed;
    if (b.moveSpeed) moveSpeedPct += b.moveSpeed;
    if (b.cdr) cdr += b.cdr;
    if (b.healPower) {
      healPowerPct += b.healPower;
      shieldPowerPct += b.healPower;
    }
    if (b.dodge) dodgeChance += b.dodge;
  }

  // 3. Full Set Bonus (all 6 slots matching rarity)
  let activeSetRarity: Rarity | null = null;
  for (const rarity of Object.keys(setCounts) as Rarity[]) {
    if (setCounts[rarity] === EQUIP_SLOTS.length) {
      activeSetRarity = rarity;
      break;
    }
  }

  if (activeSetRarity) {
    const sb = getFullSetBonus(classId, activeSetRarity);
    if (sb.adPct) adPct += sb.adPct;
    if (sb.apPct) apPct += sb.apPct;
    if (sb.hpPct) hpPct += sb.hpPct;
    if (sb.defPct) defPct += sb.defPct;
    if (sb.attackSpeedPct) attackSpeedPct += sb.attackSpeedPct;
    if (sb.moveSpeedPct) moveSpeedPct += sb.moveSpeedPct;
    if (sb.healPowerPct) healPowerPct += sb.healPowerPct;
    if (sb.shieldPowerPct) shieldPowerPct += sb.shieldPowerPct;
    if (sb.cdrPct) cdr += sb.cdrPct;
  }

  // 4. Class Passive Skills (balanced so maxed passives feel strong without breaking balance)
  const p1 = skillRanks.passive1 || 0;
  const p2 = skillRanks.passive2 || 0;
  switch (classId) {
    case 'wojownik':
      adPct += p1 * 2.0;
      critChance += p2 * 0.9;
      attackSpeedPct += p2 * 1.6;
      break;
    case 'czarnoksieznik':
      apPct += p1 * 2.0;
      cdr += p2 * 1.2;
      critDamage += p2 * 2.2;
      break;
    case 'elf':
      moveSpeedPct += p1 * 1.4;
      dodgeChance += p1 * 1.2;
      adPct += p2 * 1.7;
      apPct += p2 * 1.7;
      break;
    case 'krasnolud':
      hpPct += p1 * 2.4;
      defPct += p2 * 2.6;
      break;
    case 'wrozka':
      healPowerPct += p1 * 2.5;
      shieldPowerPct += p1 * 2.5;
      cdr += p2 * 1.2;
      break;
  }

  // 5. Passive Boss Runes (EXACT Appendix values, 0..10 each)
  const rMalakor = Math.max(0, Math.min(10, runes.malakor || 0));
  const rAzirath = Math.max(0, Math.min(10, runes.azirath || 0));
  const rSylvara = Math.max(0, Math.min(10, runes.sylvara || 0));
  const rVaelgor = Math.max(0, Math.min(10, runes.vaelgor || 0));

  hpPct += rMalakor * 1.0;
  damageReduction += rMalakor * 0.5;

  attackSpeedPct += rAzirath * 1.0;
  moveSpeedPct += rAzirath * 0.5;

  critChance += rSylvara * 0.8;
  critDamage += rSylvara * 1.0;

  adPct += rVaelgor * 1.0;
  apPct += rVaelgor * 1.0;
  cdr += rVaelgor * 0.5;

  // Hard anti-immortality / anti-one-shot caps
  const maxHp = Math.round(flatHp * (1 + Math.min(75, hpPct) / 100));
  const ad = Math.round(flatAd * (1 + Math.min(70, adPct) / 100));
  const ap = Math.round(flatAp * (1 + Math.min(70, apPct) / 100));
  const def = Math.round(flatDef * (1 + Math.min(75, defPct) / 100));

  // Transparent RPG Combat Power metric used to show boss readiness (Normal -> Mityczny+7 -> Legendarny+7 -> Legendarny+9)
  const combatPower = Math.round(ad + ap + def * 1.15 + maxHp * 0.12);

  return {
    maxHp,
    maxMana,
    ad,
    ap,
    def,
    moveSpeed: Math.min(1.65, Number((cls.baseMoveSpeed * (1 + moveSpeedPct / 100)).toFixed(3))),
    attackSpeed: Math.min(1.75, Number((1 + attackSpeedPct / 100).toFixed(3))),
    critChance: Math.min(60, Number(critChance.toFixed(1))),
    critDamage: Math.min(235, Math.round(critDamage)),
    cdr: Math.min(35, Number(cdr.toFixed(1))),
    damageReduction: Math.min(22, Number(damageReduction.toFixed(1))),
    dodgeChance: Math.min(32, Number(dodgeChance.toFixed(1))),
    healPower: Math.min(1.85, Number((1 + healPowerPct / 100).toFixed(3))),
    shieldPower: Math.min(1.85, Number((1 + shieldPowerPct / 100).toFixed(3))),
    activeSetRarity,
    setCounts,
    weaponUpgradeGlow: equipped.bron?.upgradeLevel ?? 0,
    armorUpgradeGlow: equipped.zbroja?.upgradeLevel ?? 0,
    combatPower,
  };
}
