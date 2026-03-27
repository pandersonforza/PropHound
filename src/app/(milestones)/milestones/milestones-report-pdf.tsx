import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Polygon,
} from "@react-pdf/renderer";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const SLATE_900 = "#0f172a";
const SLATE_700 = "#334155";
const SLATE_500 = "#64748b";
const SLATE_200 = "#e2e8f0";
const SLATE_50  = "#f8fafc";
const WHITE     = "#ffffff";
const EMERALD   = "#059669";
const AMBER     = "#d97706";
const ACCENT    = "#6366f1";

// PropHound logo reproduced from public/logo.svg using pre-computed absolute
// coordinates (translate(50,50) applied, second polygon rotated 20°).
function PropHoundLogo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Outer decagon — teal */}
      <Polygon
        points="50,12 72.2,19.2 86,37.2 86,62.8 72.2,80.8 50,88 27.8,80.8 14,62.8 14,37.2 27.8,19.2"
        fill="#1a7a7a"
        opacity="0.9"
      />
      {/* Rotated outer decagon — lighter teal */}
      <Polygon
        points="63,14.3 81.4,28.7 88.2,50.3 79.5,74.3 60.3,86.5 37,85.7 18.6,71.4 11.8,49.7 20.5,25.7 39.7,13.5"
        fill="#2a9a9a"
        opacity="0.6"
      />
      {/* Inner decagon — white */}
      <Polygon
        points="50,24 65.2,28.9 74.7,41.2 74.7,58.8 65.2,71.1 50,76 34.8,71.1 25.3,58.8 25.3,41.2 34.8,28.9"
        fill="white"
      />
    </Svg>
  );
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: WHITE,
    paddingHorizontal: 40,
    paddingVertical: 40,
    fontSize: 9,
    color: SLATE_900,
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: SLATE_900,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flexDirection: "column", gap: 5 },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBrandName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE },
  headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: WHITE },
  headerSub: { fontSize: 9, color: "#94a3b8" },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 3 },
  headerMeta: { fontSize: 8, color: "#94a3b8" },
  headerMetaValue: { fontSize: 8, color: WHITE },

  // ─── Summary cards ─────────────────────────────────────────────────────────
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: SLATE_50,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  summaryLabel: { fontSize: 8, color: SLATE_500, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: SLATE_900 },
  summaryCardGreen: { borderLeftColor: EMERALD },
  summaryCardAmber: { borderLeftColor: AMBER },

  // ─── Status pills ──────────────────────────────────────────────────────────
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  pillGreen: { backgroundColor: "#d1fae5" },
  pillSlate: { backgroundColor: SLATE_200 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillDotGreen: { backgroundColor: EMERALD },
  pillDotSlate: { backgroundColor: SLATE_500 },
  pillText: { fontSize: 8, color: SLATE_700, fontFamily: "Helvetica-Bold" },
  pillSub: { fontSize: 8, color: SLATE_500 },

  // ─── Section heading ───────────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: SLATE_700,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
  },

  // ─── Table ─────────────────────────────────────────────────────────────────
  table: { marginBottom: 20 },
  thead: {
    flexDirection: "row",
    backgroundColor: SLATE_900,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 2,
  },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE },
  tr: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 3,
  },
  trAlt: { backgroundColor: SLATE_50 },
  trTotal: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#e0e7ff",
    borderRadius: 4,
    marginTop: 2,
  },
  td:     { fontSize: 8, color: SLATE_700 },
  tdBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: SLATE_900 },
  tdGreen: { fontSize: 8, color: EMERALD, fontFamily: "Helvetica-Bold" },
  tdAmber: { fontSize: 8, color: AMBER,   fontFamily: "Helvetica-Bold" },
  tdMuted: { fontSize: 8, color: SLATE_500 },
  tdAddr:  { fontSize: 7, color: SLATE_500, marginTop: 2 },

  // ─── Year table column widths ──────────────────────────────────────────────
  yearCol1: { flex: 1 },
  yearCol2: { flex: 2, textAlign: "right" },

  // ─── Project milestone table column widths ─────────────────────────────────
  colProject:   { width: 115 },
  colMilestone: { flex: 1 },
  colStatus:    { width: 54 },
  colDate:      { width: 54 },
  colMoney:     { width: 54, textAlign: "right" },

  // ─── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: SLATE_500 },
});

export interface MilestonesReportProps {
  groupFilter: string;
  dateLabel: string;
  exportDate: string;
  totalExpected: number;
  totalPaid: number;
  totalRemaining: number;
  completedCount: number;
  pendingCount: number;
  feesByYearData: { year: number; expected: number; paid: number; remaining: number }[];
  projectGroups: {
    project: { id: string; name: string; address: string };
    milestones: {
      id: string;
      name: string;
      status: string;
      expectedDate: string | null;
      completedDate: string | null;
      devFee: number;
      paidAmount: number;
    }[];
  }[];
}

export function MilestonesReportDocument({
  groupFilter,
  dateLabel,
  exportDate,
  totalExpected,
  totalPaid,
  totalRemaining,
  completedCount,
  pendingCount,
  feesByYearData,
  projectGroups,
}: MilestonesReportProps) {
  const totalMilestones = completedCount + pendingCount;

  return (
    <Document title="Milestones Overview" author="PropHound">
      <Page size="A4" style={s.page} orientation="landscape">

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {/* Brand row: logo + name */}
            <View style={s.headerBrand}>
              <PropHoundLogo size={28} />
              <Text style={s.headerBrandName}>PropHound</Text>
            </View>
            {/* Report title */}
            <Text style={s.headerTitle}>Milestones Overview</Text>
            <Text style={s.headerSub}>
              {groupFilter === "All" ? "All Groups" : `Group: ${groupFilter}`}
              {"  ·  "}
              {dateLabel}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>Exported</Text>
            <Text style={s.headerMetaValue}>{exportDate}</Text>
          </View>
        </View>

        {/* ── Summary cards ── */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Total Expected Fees</Text>
            <Text style={s.summaryValue}>{fmt(totalExpected)}</Text>
          </View>
          <View style={[s.summaryCard, s.summaryCardGreen]}>
            <Text style={s.summaryLabel}>Paid to Date</Text>
            <Text style={[s.summaryValue, { color: EMERALD }]}>{fmt(totalPaid)}</Text>
          </View>
          <View style={[s.summaryCard, s.summaryCardAmber]}>
            <Text style={s.summaryLabel}>Remaining</Text>
            <Text style={[s.summaryValue, { color: AMBER }]}>{fmt(totalRemaining)}</Text>
          </View>
        </View>

        {/* ── Status pills ── */}
        <View style={s.statusRow}>
          <View style={[s.pill, s.pillGreen]}>
            <View style={[s.pillDot, s.pillDotGreen]} />
            <Text style={s.pillText}>{completedCount}</Text>
            <Text style={s.pillSub}> Completed</Text>
          </View>
          <View style={[s.pill, s.pillSlate]}>
            <View style={[s.pillDot, s.pillDotSlate]} />
            <Text style={s.pillText}>{pendingCount}</Text>
            <Text style={s.pillSub}> Pending</Text>
          </View>
          <View style={[s.pill, s.pillSlate]}>
            <Text style={s.pillSub}>
              {totalMilestones} total milestones across {projectGroups.length} projects
            </Text>
          </View>
        </View>

        {/* ── Dev Fees by Year ── */}
        {feesByYearData.length > 0 && (
          <View style={s.table}>
            <Text style={s.sectionHeading}>Dev Fees by Year</Text>
            <View style={s.thead}>
              <Text style={[s.th, s.yearCol1]}>Year</Text>
              <Text style={[s.th, s.yearCol2]}>Expected</Text>
              <Text style={[s.th, s.yearCol2]}>Paid</Text>
              <Text style={[s.th, s.yearCol2]}>Remaining</Text>
            </View>
            {feesByYearData.map((row, i) => (
              <View key={row.year} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                <Text style={[s.tdBold, s.yearCol1]}>{row.year}</Text>
                <Text style={[s.td,     s.yearCol2]}>{fmt(row.expected)}</Text>
                <Text style={[s.tdGreen,s.yearCol2]}>{fmt(row.paid)}</Text>
                <Text style={[s.tdAmber,s.yearCol2]}>{fmt(row.remaining)}</Text>
              </View>
            ))}
            <View style={s.trTotal}>
              <Text style={[s.tdBold,  s.yearCol1]}>Total</Text>
              <Text style={[s.tdBold,  s.yearCol2]}>{fmt(feesByYearData.reduce((a, r) => a + r.expected, 0))}</Text>
              <Text style={[s.tdGreen, s.yearCol2]}>{fmt(feesByYearData.reduce((a, r) => a + r.paid,     0))}</Text>
              <Text style={[s.tdAmber, s.yearCol2]}>{fmt(feesByYearData.reduce((a, r) => a + r.remaining,0))}</Text>
            </View>
          </View>
        )}

        {/* ── Project Milestones ── */}
        <View style={s.table}>
          <Text style={s.sectionHeading}>Project Milestones</Text>

          <View style={s.thead}>
            <Text style={[s.th, s.colProject]}>Project</Text>
            <Text style={[s.th, s.colMilestone]}>Milestone</Text>
            <Text style={[s.th, s.colStatus]}>Status</Text>
            <Text style={[s.th, s.colDate]}>Expected</Text>
            <Text style={[s.th, s.colDate]}>Completed</Text>
            <Text style={[s.th, s.colMoney]}>Dev Fee</Text>
            <Text style={[s.th, s.colMoney]}>Paid</Text>
            <Text style={[s.th, s.colMoney]}>Remaining</Text>
          </View>

          {projectGroups.map(({ project, milestones }) =>
            milestones.map((m, i) => (
              <View key={m.id} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>

                {/* Project name + address — only on first row of each project */}
                <View style={s.colProject}>
                  {i === 0 ? (
                    <>
                      <Text style={s.tdBold}>{project.name}</Text>
                      {project.address ? (
                        <Text style={s.tdAddr}>{project.address}</Text>
                      ) : null}
                    </>
                  ) : null}
                </View>

                <Text style={[s.td, s.colMilestone]}>{m.name}</Text>
                <Text style={[m.status === "Completed" ? s.tdGreen : s.tdMuted, s.colStatus]}>
                  {m.status}
                </Text>
                <Text style={[s.td, s.colDate]}>
                  {m.expectedDate  ? new Date(m.expectedDate).toLocaleDateString()  : "—"}
                </Text>
                <Text style={[s.td, s.colDate]}>
                  {m.completedDate ? new Date(m.completedDate).toLocaleDateString() : "—"}
                </Text>
                <Text style={[s.td,     s.colMoney]}>{fmt(m.devFee)}</Text>
                <Text style={[s.tdGreen,s.colMoney]}>{fmt(m.paidAmount)}</Text>
                <Text style={[s.tdAmber,s.colMoney]}>{fmt(m.devFee - m.paidAmount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>PropHound · Milestones Overview</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
