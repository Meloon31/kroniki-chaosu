import React, { useState } from 'react';
import { getMainBossByAct } from '../../shared/bosses';
import { CLASSES } from '../../shared/classes';
import {
  getTotalGuildShards,
  GUILD_COLORS,
  GUILD_EMBLEMS,
  GUILD_MAX_LEVEL,
  GUILD_UPGRADE_LIST,
  GuildState,
  GuildUpgradeId,
  isGuildActClearedToday,
} from '../../shared/guilds';
import type { RoomSummary } from '../../shared/types';
import { ACT_THEMES } from '../../shared/world';
import { soundEngine } from '../audio/soundEngine';

interface GuildModalProps {
  guild: GuildState | null;
  playerUid: string;
  localSocketId: string;
  room: RoomSummary | null;
  connected: boolean;
  onCreateGuild: (
    name: string,
    tag: string,
    emblem: string,
    color: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onJoinGuildByCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onInviteRoomMember: (targetSocketId: string) => Promise<{ ok: boolean; error?: string }>;
  onLeaveGuild: () => Promise<void>;
  onUpgradeGuild: (upgradeId: GuildUpgradeId) => Promise<{ ok: boolean; error?: string }>;
  onStartGuildAct: (globalLocation: number) => void;
  onClose: () => void;
}

export const GuildModal: React.FC<GuildModalProps> = ({
  guild,
  playerUid,
  localSocketId,
  room,
  connected,
  onCreateGuild,
  onJoinGuildByCode,
  onInviteRoomMember,
  onLeaveGuild,
  onUpgradeGuild,
  onStartGuildAct,
  onClose,
}) => {
  const [tab, setTab] = useState<'overview' | 'upgrades' | 'acts'>('overview');
  const [nameDraft, setNameDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [emblemDraft, setEmblemDraft] = useState(GUILD_EMBLEMS[0]);
  const [colorDraft, setColorDraft] = useState(GUILD_COLORS[0]);
  const [codeDraft, setCodeDraft] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const showMsg = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg });
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const handleCreate = async () => {
    const res = await onCreateGuild(nameDraft, tagDraft, emblemDraft, colorDraft);
    if (res.ok) {
      soundEngine.playLevelUp();
      showMsg(true, '🏰 Założono Gildię! Zaproś znajomych kodem lub bezpośrednio w pokoju!');
    } else {
      soundEngine.playPuzzleFail();
      showMsg(false, res.error || 'Nie udało się utworzyć Gildii.');
    }
  };

  const handleJoin = async () => {
    const res = await onJoinGuildByCode(codeDraft);
    if (res.ok) {
      soundEngine.playLevelUp();
      showMsg(true, '🏰 Dołączono do Gildii! Wszystkie bonusy Gildii są już aktywne!');
    } else {
      soundEngine.playPuzzleFail();
      showMsg(false, res.error || 'Nie udało się dołączyć do Gildii.');
    }
  };

  const handleInvite = async (targetSocketId: string, memberName: string) => {
    const res = await onInviteRoomMember(targetSocketId);
    if (res.ok) {
      soundEngine.playPuzzleTick();
      showMsg(true, `📨 Wysłano zaproszenie do Gildii dla gracza ${memberName}!`);
    } else {
      soundEngine.playPuzzleFail();
      showMsg(false, res.error || 'Nie można wysłać zaproszenia.');
    }
  };

  const handleUpgrade = async (id: GuildUpgradeId) => {
    const res = await onUpgradeGuild(id);
    if (res.ok) {
      soundEngine.playRuneUpgrade();
      showMsg(true, '⬆️ Gildia została wzmocniona! Nowy bonus działa dla wszystkich członków!');
    } else {
      soundEngine.playPuzzleFail();
      showMsg(false, res.error || 'Nie udało się ulepszyć Gildii.');
    }
  };

  const act8Done = isGuildActClearedToday(guild, 8);
  const act9Done = isGuildActClearedToday(guild, 9);
  const availableActsToday = (act8Done ? 0 : 1) + (act9Done ? 0 : 1);
  const totalShards = getTotalGuildShards(guild);

  const otherRoomMembers = (room?.members || []).filter((m) => m.id !== localSocketId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="comic-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 95vw)',
          maxHeight: '91vh',
          overflowY: 'auto',
          padding: 20,
          background: 'linear-gradient(160deg, #1b2142 0%, #10142a 100%)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 className="comic-title" style={{ margin: 0, fontSize: 30, color: guild ? guild.color : '#fbbf24' }}>
              {guild ? `${guild.emblem} [${guild.tag}] ${guild.name}` : '🏰 GILDIA & AKTY GILDYJNE'}
            </h2>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Rozwijaj Gildię do 10 poziomu (do +10% AD/AP, +10% DEF, +500 HP, +10% Kryt) i biegaj 2 Akty Gildyjne raz dziennie (100% drop Odłamka)!
            </div>
          </div>
          <button className="comic-btn comic-btn-red" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Zamknij [G]
          </button>
        </div>

        {feedback && (
          <div
            className="comic-panel-sm"
            style={{
              padding: '8px 14px',
              marginBottom: 12,
              borderColor: feedback.ok ? '#4ade80' : '#f87171',
              background: feedback.ok ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
              color: feedback.ok ? '#bbf7d0' : '#fecaca',
              fontSize: 12.5,
              fontWeight: 900,
            }}
          >
            {feedback.msg}
          </div>
        )}

        {/* ======================================================= */}
        {/* NO GUILD YET: CREATE OR JOIN BY CODE                    */}
        {/* ======================================================= */}
        {!guild ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* Create Guild Card */}
            <div className="comic-panel-sm" style={{ padding: 16, borderColor: '#fbbf24' }}>
              <div className="comic-title" style={{ fontSize: 22, color: '#fde047', marginBottom: 8 }}>
                ✨ ZAŁÓŻ NOWĄ GILDIĘ
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>NAZWA GILDII (3–24 znaki)</label>
                <input
                  type="text"
                  value={nameDraft}
                  maxLength={24}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="np. Strażnicy Chaosu"
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '2px solid #334155',
                    background: '#0f1221',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>TAG GILDII (2–4 znaki)</label>
                <input
                  type="text"
                  value={tagDraft}
                  maxLength={4}
                  onChange={(e) => setTagDraft(e.target.value.toUpperCase())}
                  placeholder="np. SMK"
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '2px solid #334155',
                    background: '#0f1221',
                    color: '#fde047',
                    fontWeight: 900,
                    letterSpacing: 2,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 5 }}>HERB GILDII</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {GUILD_EMBLEMS.map((em) => (
                    <button
                      key={em}
                      onClick={() => setEmblemDraft(em)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        border: emblemDraft === em ? '2.5px solid #fde047' : '2px solid #334155',
                        background: emblemDraft === em ? 'rgba(250,204,21,0.22)' : '#0f1221',
                        fontSize: 20,
                        cursor: 'pointer',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 5 }}>KOLOR SZTANDARU</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {GUILD_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => setColorDraft(col)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 99,
                        background: col,
                        border: colorDraft === col ? '3px solid #fff' : '2px solid #111118',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                className="comic-btn comic-btn-gold"
                disabled={!connected}
                onClick={handleCreate}
                style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
              >
                🏰 Załóż Gildię (Za Darmo!)
              </button>
            </div>

            {/* Join By Code + Perks Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="comic-panel-sm" style={{ padding: 16, borderColor: '#38bdf8' }}>
                <div className="comic-title" style={{ fontSize: 22, color: '#7dd3fc', marginBottom: 8 }}>
                  🔑 DOŁĄCZ KODEM ZAPROSZENIA
                </div>
                <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>
                  Wpisz kod Gildii od znajomego (np. <strong>G-7K2M9</strong> lub samo <strong>7K2M9</strong>) albo poproś go o zaproszenie w pokoju Co-op!
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={codeDraft}
                    maxLength={12}
                    onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && connected && codeDraft.trim().length >= 4) {
                        handleJoin();
                      }
                    }}
                    placeholder="G-XXXXX lub XXXXX"
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 9,
                      border: '2px solid #334155',
                      background: '#0f1221',
                      color: '#fff',
                      fontWeight: 900,
                      letterSpacing: 1.5,
                    }}
                  />
                  <button
                    className="comic-btn comic-btn-blue"
                    disabled={!connected || codeDraft.trim().length < 4}
                    onClick={handleJoin}
                    style={{ padding: '9px 16px', fontSize: 13 }}
                  >
                    Dołącz
                  </button>
                </div>
              </div>

              <div className="comic-panel-sm" style={{ padding: 14, borderColor: '#10b981', background: 'rgba(16,185,129,0.08)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: '#4ade80', marginBottom: 6 }}>
                  🌟 DLACZEGO WARTO MIEĆ GILDIĘ?
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>
                  <li><strong>4 Ulepszenia Gildii (0→10):</strong> do <strong>+10% AD/AP</strong>, <strong>+10% DEF</strong>, <strong>+500 HP</strong> i <strong>+10% Kryt</strong>!</li>
                  <li><strong>2 Ekskluzywne Akty Gildyjne:</strong> Złota Cytadela Bractwa & Sanktuarium Szmaragdowego Smoka!</li>
                  <li><strong>100% Drop Odłamka Gildii:</strong> 1 losowy odłamek z każdego Aktu Gildyjnego dziennie (max 2 dziennie)!</li>
                  <li><strong>Przyjazny próg wejścia:</strong> wystarczy sprzęt <strong>Mityczny +6</strong> (3 min epickiej walki z bossem)!</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 3 Guild Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              <button
                className={`comic-btn ${tab === 'overview' ? 'comic-btn-gold' : 'comic-btn-dark'}`}
                onClick={() => setTab('overview')}
                style={{ padding: '9px 12px', fontSize: 13 }}
              >
                🏰 Członkowie ({guild.members.length}/20)
              </button>
              <button
                className={`comic-btn ${tab === 'upgrades' ? 'comic-btn-green' : 'comic-btn-dark'}`}
                onClick={() => setTab('upgrades')}
                style={{ padding: '9px 12px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6 }}
              >
                <span>⬆️ Rozwój Gildii</span>
                {totalShards > 0 && (
                  <span style={{ background: '#111', color: '#4ade80', borderRadius: 99, padding: '0 7px', fontSize: 11 }}>
                    {totalShards}
                  </span>
                )}
              </button>
              <button
                className={`comic-btn ${tab === 'acts' ? 'comic-btn-blue' : 'comic-btn-dark'}`}
                onClick={() => setTab('acts')}
                style={{ padding: '9px 12px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6 }}
              >
                <span>🐉 Akty Gildyjne</span>
                {availableActsToday > 0 && (
                  <span style={{ background: '#fde047', color: '#111', borderRadius: 99, padding: '0 7px', fontSize: 11 }}>
                    {availableActsToday}/2
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: OVERVIEW & MEMBERS + INVITE */}
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Guild Invite Code + Summary Bar */}
                <div
                  className="comic-panel-sm"
                  style={{
                    padding: 14,
                    borderColor: guild.color,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>KOD ZAPROSZENIA DO GILDII</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#fde047', letterSpacing: 2 }}>
                      {guild.code}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="comic-btn comic-btn-gold"
                      onClick={() => {
                        navigator.clipboard?.writeText(guild.code).catch(() => {});
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 1800);
                      }}
                      style={{ padding: '8px 14px', fontSize: 12.5 }}
                    >
                      {copiedCode ? '✓ Skopiowano kod!' : '📋 Kopiuj Kod Gildii'}
                    </button>
                    {!confirmLeave ? (
                      <button
                        className="comic-btn comic-btn-dark"
                        onClick={() => setConfirmLeave(true)}
                        style={{ padding: '8px 12px', fontSize: 12, color: '#fca5a5' }}
                      >
                        🚪 Opuść Gildię
                      </button>
                    ) : (
                      <button
                        className="comic-btn comic-btn-red"
                        onClick={async () => {
                          await onLeaveGuild();
                          setConfirmLeave(false);
                        }}
                        style={{ padding: '8px 12px', fontSize: 12 }}
                      >
                        ✓ Potwierdź opuszczenie
                      </button>
                    )}
                  </div>
                </div>

                {/* Invite Teammates from Current Co-op Room */}
                {otherRoomMembers.length > 0 && (
                  <div className="comic-panel-sm" style={{ padding: 12, borderColor: '#38bdf8', background: 'rgba(56,189,248,0.08)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 900, color: '#7dd3fc', marginBottom: 8 }}>
                      📨 ZAPROŚ ZNAJOMYCH Z AKTUALNEGO POKOJU CO-OP:
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {otherRoomMembers.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 10,
                            background: '#0f1221',
                            border: '1.5px solid #334155',
                          }}
                        >
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#fff' }}>
                            {m.name} ({CLASSES[m.classId].name}, P.{m.level})
                          </span>
                          <button
                            className="comic-btn comic-btn-blue"
                            onClick={() => handleInvite(m.id, m.name)}
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            📨 Zaproś
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Guild Bonuses Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {GUILD_UPGRADE_LIST.map((u) => {
                    const lvl = guild.upgrades[u.id] || 0;
                    return (
                      <div
                        key={u.id}
                        className="comic-panel-sm"
                        style={{ padding: '8px 10px', textAlign: 'center', borderColor: u.color }}
                      >
                        <div style={{ fontSize: 18 }}>{u.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>{u.name}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: u.color }}>
                          {u.formatBonus(lvl)}
                        </div>
                        <div style={{ fontSize: 10, color: '#cbd5e1' }}>Poz. {lvl}/10</div>
                      </div>
                    );
                  })}
                </div>

                {/* Members List */}
                <div style={{ fontSize: 12.5, fontWeight: 900, color: '#94a3b8' }}>
                  CZŁONKOWIE GILDII ({guild.members.length}):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
                  {guild.members.map((m) => (
                    <div
                      key={m.playerUid}
                      className="comic-panel-sm"
                      style={{
                        padding: '8px 12px',
                        borderColor: m.playerUid === playerUid ? '#fde047' : '#2c3454',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 13.5, color: '#fff' }}>
                          {m.role === 'leader' ? '👑 ' : '⚔️ '}
                          {m.name}
                          {m.playerUid === playerUid ? ' (Ty)' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: CLASSES[m.classId].primaryColor, fontWeight: 700 }}>
                          {CLASSES[m.classId].name} • Poz. {m.level}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: m.role === 'leader' ? '#854d0e' : '#1e293b',
                          color: m.role === 'leader' ? '#fef08a' : '#94a3b8',
                        }}
                      >
                        {m.role === 'leader' ? 'LIDER' : 'CZŁONEK'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: GUILD UPGRADES (0..10) */}
            {tab === 'upgrades' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                  Odłamki Gildii dropią <strong>wyłącznie z końcowych Bossów 2 Aktów Gildyjnych (100% szansy, max 2 dziennie)</strong>. Każde ulepszenie działa od razu dla <strong>wszystkich członków Gildii</strong>!
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                  {GUILD_UPGRADE_LIST.map((u) => {
                    const lvl = guild.upgrades[u.id] || 0;
                    const shards = guild.shards[u.id] || 0;
                    const canUp = lvl < GUILD_MAX_LEVEL && shards >= 1;
                    return (
                      <div
                        key={u.id}
                        className="comic-panel-sm"
                        style={{ padding: 15, borderColor: u.color }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: '#121629',
                                border: `2.5px solid ${u.color}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 23,
                              }}
                            >
                              {u.icon}
                            </div>
                            <div>
                              <div className="comic-title" style={{ fontSize: 21, color: u.color, lineHeight: 1 }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{u.perLevelDesc}</div>
                            </div>
                          </div>
                          <div
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: '#0f1221',
                              border: `2px solid ${u.color}`,
                              fontWeight: 900,
                              color: '#fde047',
                            }}
                          >
                            {lvl} / {GUILD_MAX_LEVEL}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            height: 11,
                            background: '#0b0e1c',
                            border: '2px solid #111118',
                            borderRadius: 7,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${(lvl / GUILD_MAX_LEVEL) * 100}%`,
                              height: '100%',
                              background: u.color,
                              transition: 'width 0.25s',
                            }}
                          />
                        </div>

                        <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 900, color: lvl > 0 ? '#4ade80' : '#64748b' }}>
                          Aktywny bonus Gildii: {lvl > 0 ? u.formatBonus(lvl) : 'Brak (Poziom 0)'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{u.maxDesc}</div>

                        <div
                          style={{
                            marginTop: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#fde047' }}>
                            W skarbcu: 💠 {shards}× {u.shardName}
                          </span>
                          <button
                            className="comic-btn comic-btn-green"
                            disabled={!canUp}
                            onClick={() => handleUpgrade(u.id)}
                            style={{ padding: '7px 14px', fontSize: 12 }}
                          >
                            {lvl >= GUILD_MAX_LEVEL ? '🏆 MAX (10/10)' : '⬆️ Ulepsz (1 Odłamek)'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: 2 DAILY GUILD ACTS (100% DROP) */}
            {tab === 'acts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  className="comic-panel-sm"
                  style={{
                    padding: '10px 14px',
                    borderColor: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.1)',
                    fontSize: 12.5,
                    color: '#fef08a',
                    fontWeight: 800,
                  }}
                >
                  🏰 Każdy z 2 Aktów Gildyjnych można przejść <strong>1 raz dziennie</strong> dla Gildii! Końcowy Boss ma <strong>100% szansy</strong> na drop 1 losowego Odłamka Gildii (max 2 dziennie). Wystarczy ekwipunek <strong>Mityczny +6</strong> (ok. 3 min walki z Bossem)!
                </div>

                {[
                  { act: 8 as const, startLoc: 106, bossLoc: 120, done: act8Done, roman: 'I', icon: '🏰' },
                  { act: 9 as const, startLoc: 121, bossLoc: 135, done: act9Done, roman: 'II', icon: '🐉' },
                ].map((entry) => {
                  const theme = ACT_THEMES[entry.act];
                  const boss = getMainBossByAct(entry.act);
                  return (
                    <div
                      key={entry.act}
                      className="comic-panel-sm"
                      style={{
                        padding: 16,
                        borderColor: entry.done ? '#22c55e' : theme.accentGlowColor,
                        background: entry.done
                          ? 'rgba(34, 197, 94, 0.12)'
                          : `linear-gradient(135deg, ${theme.accentGlowColor}22, rgba(14, 18, 36, 0.94))`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 22 }}>{entry.icon}</span>
                            <span className="comic-title" style={{ fontSize: 23, color: theme.accentGlowColor }}>
                              {theme.name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 900,
                                padding: '2px 9px',
                                borderRadius: 99,
                                background: entry.done ? '#15803d' : '#854d0e',
                                color: '#fff',
                              }}
                            >
                              {entry.done ? '✅ UKOŃCZONY DZISIAJ' : '🟢 DOSTĘPNY DZISIAJ (1/1)'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>{theme.subtitle}</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#fde047', marginTop: 6 }}>
                            👑 Boss Końcowy (Lok. 15): <strong>{boss.name}</strong> • 🛡️ {boss.recommendedGear}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#4ade80', marginTop: 2 }}>
                            🎁 Gwarantowany Drop (100%): 1× Losowy Odłamek Gildii (Atak / Obrona / Życie / Kryt)
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 185 }}>
                          <button
                            className="comic-btn comic-btn-gold"
                            disabled={entry.done}
                            onClick={() => {
                              onStartGuildAct(entry.startLoc);
                              onClose();
                            }}
                            style={{ padding: '8px 14px', fontSize: 12.5, opacity: entry.done ? 0.5 : 1 }}
                          >
                            {entry.done ? '✓ Wróć jutro' : `▶ Start Aktu ${entry.roman} (Lok. 1)`}
                          </button>
                          <button
                            className="comic-btn comic-btn-purple"
                            disabled={entry.done}
                            onClick={() => {
                              onStartGuildAct(entry.bossLoc);
                              onClose();
                            }}
                            style={{ padding: '7px 14px', fontSize: 12, opacity: entry.done ? 0.5 : 1 }}
                          >
                            {entry.done ? '🔒 Boss pokonany dziś' : `👑 Rajd na Bossa (Lok. 15)`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
