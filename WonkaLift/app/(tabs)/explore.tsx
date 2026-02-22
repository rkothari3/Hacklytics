import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WONKA } from '../../src/constants/wonka';
import { useAppData } from '../../src/contexts/AppDataContext';
import { useWorkout } from '../../src/contexts/WorkoutContext';

const CARD_BG = '#221000';
const BORDER = 'rgba(255,215,0,0.2)';
const CREAM_DIM = 'rgba(255,248,225,0.48)';
const GOLD_SOFT = 'rgba(255,215,0,0.1)';
const DAY_MS = 86_400_000;

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;
const BAR_H = 110;
const LINE_H = 210;

// ─── Section Header with gold accent bar ───────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <View style={styles.sectionAccentBar} />
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Avatar with gold ring glow ────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={styles.avatarRing}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  );
}

// ─── Stat Pill ─────────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

// ─── Grouped Bar Chart (last 7 days, all 4 users) ──────────────────
interface BarUser {
  name: string;
  color: string;
  dates: number[];
  isUser: boolean;
}

function WorkoutsBarChart({ users, hiddenUsers }: { users: BarUser[]; hiddenUsers: Set<string> }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const visibleUsers = users.filter(u => u.isUser || !hiddenUsers.has(u.name));

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const end = start + DAY_MS;
    return {
      short: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
      full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      counts: visibleUsers.map(u => u.dates.filter(ts => ts >= start && ts < end).length),
    };
  });

  const maxCount = Math.max(...days.flatMap(d => d.counts), 1);
  const groupW = CHART_W / 7;
  const barW = Math.max(Math.floor((groupW - 8) / Math.max(visibleUsers.length, 1)) - 1, 4);

  function clampDay(x: number) {
    return Math.max(0, Math.min(6, Math.floor((x / CHART_W) * 7)));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => setSelectedDay(clampDay(evt.nativeEvent.locationX)),
      onPanResponderMove: evt => setSelectedDay(clampDay(evt.nativeEvent.locationX)),
      onPanResponderRelease: () => setSelectedDay(null),
      onPanResponderTerminate: () => setSelectedDay(null),
    })
  ).current;

  return (
    <View>
      {/* Tooltip or hint */}
      {selectedDay !== null ? (
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipWeek}>{days[selectedDay].full}</Text>
            <View style={styles.tooltipDivider} />
          </View>
          <View style={styles.tooltipValues}>
            {visibleUsers.map((u, ui) => (
              <View key={u.name} style={styles.tooltipRow}>
                <View style={[styles.tooltipDot, { backgroundColor: u.color }]} />
                <Text style={[styles.tooltipName, u.isUser && styles.tooltipNameUser]}>
                  {u.isUser ? 'You' : u.name}
                </Text>
                <Text style={[styles.tooltipVal, { color: u.color }]}>
                  {days[selectedDay].counts[ui]} set{days[selectedDay].counts[ui] !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.chartHint}>↔  Touch &amp; drag to inspect daily activity</Text>
      )}

      {/* Chart */}
      <View
        {...panResponder.panHandlers}
        style={{ position: 'relative' }}
        collapsable={false}
      >
        {/* Day highlight background */}
        {selectedDay !== null && (
          <View style={[styles.dayHighlight, { left: selectedDay * groupW, width: groupW, height: BAR_H + 24 }]} />
        )}

        <View style={{ height: BAR_H, flexDirection: 'row', alignItems: 'flex-end' }}>
          {days.map((day, di) => {
            const isSelected = selectedDay === di;
            return (
              <View
                key={di}
                style={{ width: groupW, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1.5 }}
              >
                {visibleUsers.map((u, ui) => {
                  const h = Math.max((day.counts[ui] / maxCount) * BAR_H, 3);
                  return (
                    <View
                      key={ui}
                      style={{
                        width: barW,
                        height: h,
                        backgroundColor: u.color,
                        borderRadius: 3,
                        opacity: selectedDay !== null ? (isSelected ? 1 : 0.25) : (u.isUser ? 1 : 0.6),
                      }}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* Day labels */}
        <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 4 }}>
          {days.map((day, di) => (
            <Text
              key={di}
              style={{
                width: groupW,
                textAlign: 'center',
                fontSize: 10,
                color: selectedDay === di ? '#FFF8E1' : CREAM_DIM,
                fontWeight: selectedDay === di ? '800' : '600',
              }}
            >
              {day.short}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Interactive Drag-to-Inspect Line Chart ────────────────────────
interface LineData {
  label: string;
  color: string;
  points: { week: number; oneRM: number }[];
  isUser?: boolean;
}

function LineChart({ lines }: { lines: LineData[] }) {
  const [cursor, setCursor] = useState<number | null>(null);

  const WEEKS = 8;
  const plotH = LINE_H - 30;
  const colW = CHART_W / (WEEKS - 1);

  const allRM = lines.flatMap(l => l.points.map(p => p.oneRM));
  const minRM = Math.min(...allRM) - 2;
  const maxRM = Math.max(...allRM) + 2;
  const range = maxRM - minRM || 1;

  function toX(week: number) { return week * colW; }
  function toY(oneRM: number) { return plotH - ((oneRM - minRM) / range) * plotH; }
  function clampWeek(x: number) {
    return Math.round(Math.max(0, Math.min(WEEKS - 1, (x / CHART_W) * (WEEKS - 1))));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => setCursor(clampWeek(evt.nativeEvent.locationX)),
      onPanResponderMove: evt => setCursor(clampWeek(evt.nativeEvent.locationX)),
      onPanResponderRelease: () => setCursor(null),
      onPanResponderTerminate: () => setCursor(null),
    })
  ).current;

  return (
    <View>
      {/* Tooltip or hint */}
      {cursor !== null ? (
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipWeek}>{cursor === 0 ? 'Current' : `Week ${cursor}`}</Text>
            <View style={styles.tooltipDivider} />
          </View>
          <View style={styles.tooltipValues}>
            {lines.map(l => (
              <View key={l.label} style={styles.tooltipRow}>
                <View style={[styles.tooltipDot, { backgroundColor: l.color }]} />
                <Text style={[styles.tooltipName, l.isUser && styles.tooltipNameUser]}>
                  {l.label}
                </Text>
                <Text style={[styles.tooltipVal, { color: l.color }]}>
                  {l.points[cursor]?.oneRM ?? '–'} kg
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.chartHint}>↔  Touch &amp; drag to compare projections</Text>
      )}

      {/* Chart canvas */}
      <View
        {...panResponder.panHandlers}
        style={{ height: LINE_H, position: 'relative' }}
        collapsable={false}
      >
        {/* Subtle grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <View key={i} style={[styles.gridLine, { top: Math.round(f * plotH) }]} />
        ))}

        {/* Cursor line — glowing vertical rule */}
        {cursor !== null && (
          <View style={[styles.cursorLine, { left: toX(cursor) }]}>
            <View style={styles.cursorGlow} />
          </View>
        )}

        {/* Line segments */}
        {lines.map((line, li) =>
          line.points.slice(0, -1).map((pt, pi) => {
            const next = line.points[pi + 1];
            const x1 = toX(pt.week), y1 = toY(pt.oneRM);
            const x2 = toX(next.week), y2 = toY(next.oneRM);
            const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
            return (
              <View
                key={`seg-${li}-${pi}`}
                style={[styles.chartSeg, {
                  left: x1, top: y1, width: len,
                  borderColor: line.color,
                  borderTopWidth: line.isUser ? 2.5 : 1.5,
                  opacity: line.isUser ? 1 : 0.72,
                  transform: [{ rotateZ: `${angle}deg` }],
                }]}
              />
            );
          })
        )}

        {/* Data dots */}
        {lines.map((line, li) =>
          line.points.map((pt, pi) => {
            const highlighted = cursor === pt.week;
            const size = highlighted ? (line.isUser ? 13 : 10) : (line.isUser ? 7 : 5);
            return (
              <View
                key={`dot-${li}-${pi}`}
                style={[styles.chartDot, {
                  left: toX(pt.week) - size / 2,
                  top: toY(pt.oneRM) - size / 2,
                  width: size, height: size,
                  borderRadius: size / 2,
                  backgroundColor: line.color,
                  borderWidth: highlighted ? 2 : 0,
                  borderColor: WONKA.bg,
                  opacity: line.isUser ? 1 : (highlighted ? 1 : 0.8),
                  shadowColor: highlighted ? line.color : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: highlighted ? 0.8 : 0,
                  shadowRadius: highlighted ? 6 : 0,
                }]}
              />
            );
          })
        )}

        {/* X-axis labels — absolutely positioned to prevent last label overflow */}
        {Array.from({ length: WEEKS }).map((_, i) => {
          const labelW = 26;
          const cx = toX(i);
          const left = Math.max(0, Math.min(cx - labelW / 2, CHART_W - labelW));
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                top: plotH + 8,
                left,
                width: labelW,
                textAlign: 'center',
                fontSize: 9,
                color: cursor === i ? '#FFF8E1' : CREAM_DIM,
                fontWeight: cursor === i ? '800' : '500',
              }}
            >
              {i === 0 ? 'Now' : `W${i}`}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

// ─── Golden Ticket Leaderboard ─────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉'];

function Leaderboard({ entries }: { entries: { name: string; goldenTickets: number; isCurrentUser: boolean }[] }) {
  const sorted = [...entries].sort((a, b) => b.goldenTickets - a.goldenTickets);
  return (
    <View>
      {sorted.map((e, i) => (
        <View
          key={e.name}
          style={[
            styles.lbRow,
            e.isCurrentUser && styles.lbRowMe,
            i < sorted.length - 1 && !e.isCurrentUser && styles.lbRowBorder,
          ]}
        >
          <Text style={styles.lbMedal}>{MEDALS[i] ?? `${i + 1}.`}</Text>
          <Text style={[styles.lbName, e.isCurrentUser && styles.lbNameMe]}>
            {e.name}{e.isCurrentUser ? ' (you)' : ''}
          </Text>
          <View style={styles.lbTicketPill}>
            <Text style={styles.lbTicketCount}>{e.goldenTickets}</Text>
            <Text style={styles.lbTicketEmoji}> 🎫</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Profile Tab ───────────────────────────────────────────────────
export default function ProfileTab() {
  const { profile, workoutHistory, friendProfiles } = useAppData();
  const { leaderboard } = useWorkout();
  const [hiddenFriends, setHiddenFriends] = useState<Set<string>>(new Set());

  function toggleFriend(name: string) {
    setHiddenFriends(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // Brzycki-proxy 1RM projection: quality multiplier × compound growth from 30 kg base
  const userProjection = useMemo<{ week: number; oneRM: number }[]>(() => {
    const avgQuality =
      workoutHistory.length > 0
        ? workoutHistory.reduce((s, w) => s + w.qualityPct, 0) / workoutHistory.length
        : 72;
    const growthRate = 0.018 * (0.5 + avgQuality / 100);
    return Array.from({ length: 8 }, (_, i) => ({
      week: i,
      oneRM: parseFloat((30 * (1 + growthRate * i)).toFixed(1)),
    }));
  }, [workoutHistory]);

  const lineData: LineData[] = [
    { label: 'You', color: WONKA.gold, points: userProjection, isUser: true },
    ...friendProfiles
      .filter(f => !hiddenFriends.has(f.name))
      .map(f => ({ label: f.name, color: f.color, points: f.oneRmProjection })),
  ];

  const barUsers: BarUser[] = [
    { name: 'You', color: WONKA.gold, dates: workoutHistory.map(w => w.date), isUser: true },
    ...friendProfiles.map(f => ({ name: f.name, color: f.color, dates: f.workoutDates, isUser: false })),
  ];

  const totalGoldenTickets = workoutHistory.filter(w => w.goldenTicket).length;
  const totalReps = workoutHistory.reduce((s, w) => s + w.totalReps, 0);
  const avgQuality =
    workoutHistory.length > 0
      ? Math.round(workoutHistory.reduce((s, w) => s + w.qualityPct, 0) / workoutHistory.length)
      : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={WONKA.bg} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ── */}
        <View style={styles.profileRow}>
          <Avatar name={profile.name} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <View style={styles.statsRow}>
              <StatPill label="Sets" value={workoutHistory.length} />
              <StatPill label="Reps" value={totalReps} />
              <StatPill label="Quality" value={`${avgQuality}%`} />
            </View>
          </View>
        </View>

        {/* Social row */}
        <View style={styles.socialRow}>
          <Text style={styles.socialStat}>
            <Text style={styles.socialNum}>{profile.followers}</Text>{' followers'}
          </Text>
          <View style={styles.socialDivider} />
          <Text style={styles.socialStat}>
            <Text style={styles.socialNum}>{profile.following}</Text>{' following'}
          </Text>
        </View>

        {/* Golden ticket banner */}
        <View style={styles.ticketBanner}>
          <Text style={styles.ticketBannerEmoji}>🎫</Text>
          <View>
            <Text style={styles.ticketBannerCount}>{totalGoldenTickets}</Text>
            <Text style={styles.ticketBannerLabel}>
              Golden Ticket{totalGoldenTickets !== 1 ? 's' : ''} Earned
            </Text>
          </View>
        </View>

        {/* ── Shared friend toggles (controls both charts) ── */}
        <View style={styles.toggleRow}>
          <View style={[styles.chip, { borderColor: WONKA.gold, backgroundColor: 'rgba(255,215,0,0.12)' }]}>
            <View style={[styles.chipDot, { backgroundColor: WONKA.gold }]} />
            <Text style={[styles.chipLabel, { color: WONKA.gold }]}>You</Text>
          </View>
          {friendProfiles.map(f => {
            const active = !hiddenFriends.has(f.name);
            return (
              <TouchableOpacity
                key={f.name}
                style={[styles.chip, {
                  borderColor: f.color,
                  backgroundColor: active ? `${f.color}1E` : 'transparent',
                  opacity: active ? 1 : 0.35,
                }]}
                onPress={() => toggleFriend(f.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: f.color }]} />
                <Text style={[styles.chipLabel, { color: f.color }]}>{f.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Activity Bar Chart ── */}
        <SectionHeader title="Activity — Last 7 Days" sub="Sets per day · drag to inspect" />
        <View style={styles.chartCard}>
          <WorkoutsBarChart users={barUsers} hiddenUsers={hiddenFriends} />
        </View>

        {/* ── Strength Projection ── */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Projected 1RM — 8 Weeks" sub="Max lift estimate · quality-weighted growth" />
        </View>

        <View style={styles.chartCard}>
          <LineChart lines={lineData} />
        </View>

        {/* ── Leaderboard ── */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Golden Ticket Leaderboard" />
        </View>
        <View style={styles.chartCard}>
          <Leaderboard entries={leaderboard} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WONKA.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 52 },

  // Section header
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  sectionAccentBar: {
    width: 3,
    height: 38,
    backgroundColor: WONKA.gold,
    borderRadius: 2,
    marginTop: 1,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF8E1',
    letterSpacing: 0.15,
    marginBottom: 2,
  },
  sectionSub: { fontSize: 11, color: CREAM_DIM, fontWeight: '600' },

  // Profile header
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
    gap: 16,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: WONKA.gold,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WONKA.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: WONKA.bg },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF8E1',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statPill: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  statPillValue: { fontSize: 15, fontWeight: '900', color: WONKA.gold },
  statPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: CREAM_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },

  // Social row
  socialRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  socialStat: { fontSize: 12, color: CREAM_DIM },
  socialNum: { fontSize: 12, fontWeight: '800', color: '#FFF8E1' },
  socialDivider: { width: 1, height: 12, backgroundColor: BORDER, marginHorizontal: 12 },

  // Ticket banner
  ticketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: GOLD_SOFT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketBannerEmoji: { fontSize: 32 },
  ticketBannerCount: {
    fontSize: 24,
    fontWeight: '900',
    color: WONKA.gold,
    lineHeight: 28,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  ticketBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CREAM_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Chart card
  chartCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // Bar chart day highlight
  dayHighlight: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255,215,0,0.07)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
  },

  // Line chart
  chartHint: {
    fontSize: 10,
    color: CREAM_DIM,
    fontStyle: 'italic',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  tooltipCard: {
    backgroundColor: '#160800',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tooltipWeek: {
    fontSize: 10,
    fontWeight: '900',
    color: CREAM_DIM,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  tooltipDivider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  tooltipValues: { gap: 6 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tooltipDot: { width: 7, height: 7, borderRadius: 3.5 },
  tooltipName: { flex: 1, fontSize: 12, color: '#FFF8E1', fontWeight: '700' },
  tooltipNameUser: { color: WONKA.gold, fontWeight: '900' },
  tooltipVal: { fontSize: 13, fontWeight: '900' },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,248,225,0.08)',
  },
  cursorLine: {
    position: 'absolute',
    top: 0,
    bottom: 28,
    width: 1,
    backgroundColor: 'rgba(255,248,225,0.3)',
    alignItems: 'center',
  },
  cursorGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  chartSeg: { position: 'absolute', height: 0, transformOrigin: '0 0' },
  chartDot: { position: 'absolute' },
  xAxis: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  xLabel: { fontSize: 9, textAlign: 'center' },

  // Friend toggles
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  chipLabel: { fontSize: 12, fontWeight: '800' },

  // Leaderboard
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  lbRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  lbRowMe: {
    backgroundColor: 'rgba(255,215,0,0.09)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: WONKA.gold,
    paddingLeft: 10,
    marginVertical: 3,
    shadowColor: WONKA.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  lbMedal: { fontSize: 18, width: 34 },
  lbName: { flex: 1, fontSize: 14, color: '#FFF8E1', fontWeight: '700' },
  lbNameMe: { color: WONKA.gold, fontWeight: '900' },
  lbTicketPill: { flexDirection: 'row', alignItems: 'center' },
  lbTicketCount: { fontSize: 17, fontWeight: '900', color: WONKA.gold },
  lbTicketEmoji: { fontSize: 15 },
});
