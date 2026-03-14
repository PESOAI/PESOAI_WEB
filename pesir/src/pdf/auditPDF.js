/* ══════════════════════════════════════════════════════════════
   auditPDF.js — PESO AI  v1
   Audit Trail PDF Export
   ─────────────────────────────────────────────────────────────
   Usage (from SystemPanels.jsx AuditPanel or anywhere):
     import { generateAuditPDF } from '../pdf/auditPDF';
     await generateAuditPDF(logs, { filter: 'all' }, logo);

   Expects each log entry to have:
     { admin | user, role, action, time | timestamp | created_at }
   ─────────────────────────────────────────────────────────────
   Shared helpers consumed from pdfHelpers.js:
     PT, ptx, pguard, makeCur, CW_PDF,
     drawPDFHeader, stampPDFFooters,
     drawPDFStatCards, drawPDFSectionBar, drawPDFTableHeader,
     loadjsPDF, getLogoBase64
══════════════════════════════════════════════════════════════ */

import {
  loadjsPDF,
  getLogoBase64,
  PT,
  ptx,
  pguard,
  makeCur,
  CW_PDF,
  drawPDFHeader,
  stampPDFFooters,
  drawPDFStatCards,
  drawPDFSectionBar,
  drawPDFTableHeader,
} from './pdfHelpers';

/* ── Layout constants (mirrors pdfHelpers.js internals) ──────── */
const PW    = 595.28;
const PH    = 841.89;
const ML    = 36;
const CW    = CW_PDF;            // 595.28 - 36 - 36 = 523.28
const ROW_H = 22;
const CELL_P = 7;

/* ── ISO 8601 → readable timestamp ──────────────────────────── */
const fmtTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 19).replace('T', '  ');
    return (
      d.toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }) +
      '  ' +
      d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  } catch {
    return String(iso).slice(0, 19).replace('T', '  ');
  }
};

/* ── Field accessor — handles multiple API naming conventions ── */
const getField = (log, ...keys) => {
  for (const k of keys) {
    if (log[k] != null && log[k] !== '') return log[k];
  }
  return '—';
};

/* ── Action pill colour map ─────────────────────────────────── */
//    Matches the conditional formatting in Audit Log sheet
const ACTION_STYLE = {
  Login:   { bg: PT.greenLt,     tc: PT.green  },
  Logout:  { bg: [226, 232, 240], tc: PT.textMid },
  Updated: { bg: PT.amberLt,     tc: PT.amber  },
  Created: { bg: PT.indigoLt,    tc: PT.indigo },
  Deleted: { bg: PT.redLt,       tc: PT.red    },
  Viewed:  { bg: [254, 237, 188], tc: [192, 86, 33] },
};

const actionStyle = (action) =>
  ACTION_STYLE[action] ?? { bg: PT.offWhite, tc: PT.textMid };

/* ── Draw action pill ───────────────────────────────────────── */
const drawActionPill = (doc, text, colX, rowY, colW) => {
  const { bg, tc } = actionStyle(text);
  const pillW = Math.min(colW - CELL_P * 2, 70);
  const pillH = 14;
  const pillX = colX + (colW - pillW) / 2;
  const pillY = rowY + (ROW_H - pillH) / 2;

  doc.setFillColor(...bg);
  doc.roundedRect(pillX, pillY, pillW, pillH, 3, 3, 'F');
  doc.setDrawColor(...tc);
  doc.setLineWidth(0.5);
  doc.roundedRect(pillX, pillY, pillW, pillH, 3, 3, 'S');
  ptx(doc, 'bold', 7.5, tc);
  doc.text(text, pillX + pillW / 2, pillY + pillH - 4, { align: 'center' });
};

/* ── Column layout — pre-calculated x positions ─────────────── */
const AUDIT_COLS = [
  { label: '#',         w: CW * 0.05 },
  { label: 'Admin',     w: CW * 0.26 },
  { label: 'Role',      w: CW * 0.13 },
  { label: 'Action',    w: CW * 0.17 },
  { label: 'Timestamp', w: CW * 0.39 },
];
// Attach x offset to each col
AUDIT_COLS.forEach((col, i) => {
  col.x = ML + AUDIT_COLS.slice(0, i).reduce((s, c) => s + c.w, 0);
});

/* ── Draw table rows ─────────────────────────────────────────── */
const drawAuditRows = (doc, cur, logs) => {
  const drawHdr = () =>
    drawPDFTableHeader(doc, cur, AUDIT_COLS.map(c => ({ label: c.label, x: c.x })));

  drawHdr();

  logs.forEach((log, idx) => {
    // Page break — redraw header on new page
    if (cur.y + ROW_H > PH - 36) {
      doc.addPage();
      cur.y = 48;
      drawHdr();
    }

    const rowBg = idx % 2 === 1 ? PT.bgStripe : PT.white;
    doc.setFillColor(...rowBg);
    doc.rect(ML, cur.y, CW, ROW_H, 'F');
    doc.setDrawColor(...PT.lineGray);
    doc.setLineWidth(0.3);
    doc.line(ML, cur.y + ROW_H, ML + CW, cur.y + ROW_H);

    // Col 1 — row number (centred, muted)
    ptx(doc, 'normal', 7.5, PT.textMuted);
    doc.text(
      String(idx + 1),
      AUDIT_COLS[0].x + AUDIT_COLS[0].w / 2,
      cur.y + ROW_H - 7,
      { align: 'center' },
    );

    // Col 2 — admin / user (bold)
    ptx(doc, 'bold', 8, PT.textDark);
    doc.text(
      getField(log, 'admin', 'user', 'username', 'name').substring(0, 34),
      AUDIT_COLS[1].x + CELL_P,
      cur.y + ROW_H - 7,
    );

    // Col 3 — role (colour-coded: Main = indigo, Staff = textMid)
    const roleVal = getField(log, 'role');
    const roleFg  = /main/i.test(roleVal) ? PT.indigo : PT.textMid;
    ptx(doc, 'bold', 7.5, roleFg);
    doc.text(
      roleVal.substring(0, 14),
      AUDIT_COLS[2].x + AUDIT_COLS[2].w / 2,
      cur.y + ROW_H - 7,
      { align: 'center' },
    );

    // Col 4 — action pill
    const actionVal = getField(log, 'action');
    drawActionPill(doc, actionVal, AUDIT_COLS[3].x, cur.y, AUDIT_COLS[3].w);

    // Col 5 — readable timestamp
    ptx(doc, 'normal', 7.5, PT.textMid);
    doc.text(
      fmtTime(getField(log, 'time', 'timestamp', 'created_at')),
      AUDIT_COLS[4].x + CELL_P,
      cur.y + ROW_H - 7,
    );

    cur.adv(ROW_H);
  });

  cur.adv(10);
};

/* ── Inline formula note (matches pdfHelpers.js style) ──────── */
const drawFormulaNote = (doc, cur, text) => {
  pguard(doc, cur, 28);
  doc.setFillColor(245, 248, 255);
  doc.roundedRect(ML, cur.y, CW, 22, 3, 3, 'F');
  doc.setDrawColor(...PT.indigo);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, cur.y, CW, 22, 3, 3, 'S');
  doc.setFillColor(...PT.indigo);
  doc.rect(ML, cur.y, 4, 22, 'F');
  ptx(doc, 'bold', 7.5, PT.indigo);
  doc.text('Formula:', ML + 12, cur.y + 14);
  ptx(doc, 'normal', 7.5, PT.textMid);
  doc.text(text, ML + 60, cur.y + 14, { maxWidth: CW - 70 });
  cur.adv(30);
};

/* ── Action legend row ───────────────────────────────────────── */
const drawActionLegend = (doc, cur) => {
  pguard(doc, cur, 56);
  drawPDFSectionBar(doc, cur, 'Action Colour Legend');

  const items   = Object.entries(ACTION_STYLE);
  const itemW   = CW / items.length;

  items.forEach(([label, { bg, tc }], i) => {
    const px  = ML + i * itemW + 5;
    const pw  = itemW - 10;
    const ph  = 20;
    const py  = cur.y;

    doc.setFillColor(...bg);
    doc.roundedRect(px, py, pw, ph, 3, 3, 'F');
    doc.setDrawColor(...tc);
    doc.setLineWidth(0.5);
    doc.roundedRect(px, py, pw, ph, 3, 3, 'S');
    ptx(doc, 'bold', 7.5, tc);
    doc.text(label, px + pw / 2, py + ph - 6, { align: 'center' });
  });

  cur.adv(28);
};

/* ── Summary breakdown bar (action counts) ───────────────────── */
const drawActionBreakdown = (doc, cur, logs) => {
  pguard(doc, cur, 60);
  drawPDFSectionBar(doc, cur, 'Action Breakdown Summary');

  const counts = {};
  logs.forEach(l => {
    const a = getField(l, 'action');
    counts[a] = (counts[a] || 0) + 1;
  });

  const total   = logs.length || 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const barH    = 14;
  const gap     = 8;

  entries.forEach(([action, count], i) => {
    pguard(doc, cur, barH + gap + 2);

    const { bg, tc } = actionStyle(action);
    const pct        = count / total;
    const maxBarW    = CW - 100 - 60;

    // Label
    ptx(doc, 'bold', 8, PT.textDark);
    doc.text(action, ML, cur.y + barH - 4);

    // Bar track
    doc.setFillColor(230, 235, 245);
    doc.roundedRect(ML + 100, cur.y, maxBarW, barH, 2, 2, 'F');

    // Bar fill
    doc.setFillColor(...bg);
    doc.roundedRect(ML + 100, cur.y, Math.max(maxBarW * pct, 6), barH, 2, 2, 'F');
    doc.setDrawColor(...tc);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML + 100, cur.y, Math.max(maxBarW * pct, 6), barH, 2, 2, 'S');

    // Count + pct
    ptx(doc, 'bold', 8, tc);
    doc.text(
      `${count}  (${(pct * 100).toFixed(1)}%)`,
      ML + 100 + maxBarW + 8,
      cur.y + barH - 4,
    );

    cur.adv(barH + gap);
  });

  cur.adv(6);
};

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT
   generateAuditPDF(logs, options, logoSrc)
   ─────────────────────────────────────────────────────────────
   @param  logs      Array of audit log entries from API
   @param  options   { filter: 'all' | 'today' | action string }
   @param  logoSrc   logo import (same as other PDFs in this project)
══════════════════════════════════════════════════════════════ */
export const generateAuditPDF = async (logs = [], options = {}, logoSrc = null) => {
  await loadjsPDF();
  const logoB64 = logoSrc ? await getLogoBase64(logoSrc) : null;
  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const cur       = makeCur();

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  /* ── Apply optional filter ────────────────────────────────── */
  const { filter = 'all' } = options;
  const todayStr   = now.toISOString().slice(0, 10);
  const filteredLogs = filter === 'today'
    ? logs.filter(l => getField(l, 'time', 'timestamp', 'created_at').startsWith(todayStr))
    : filter !== 'all'
    ? logs.filter(l => getField(l, 'action').toLowerCase() === filter.toLowerCase())
    : logs;

  /* ── Derived KPIs ─────────────────────────────────────────── */
  const todayCount  = logs.filter(l =>
    getField(l, 'time', 'timestamp', 'created_at').startsWith(todayStr)
  ).length;
  const deletions   = logs.filter(l => /deleted/i.test(getField(l, 'action'))).length;
  const logins      = logs.filter(l => /^login$/i.test(getField(l, 'action'))).length;

  // Most active admin
  const adminCounts = {};
  logs.forEach(l => {
    const a = getField(l, 'admin', 'user', 'username', 'name');
    adminCounts[a] = (adminCounts[a] || 0) + 1;
  });
  const [[mostActive, mostActiveCount] = ['—', 0]] =
    Object.entries(adminCounts).sort((a, b) => b[1] - a[1]);

  /* ── Page 1: Header ───────────────────────────────────────── */
  const filterLabel = filter === 'all' ? 'All Records' : filter === 'today' ? "Today's Activity" : filter;
  cur.y = drawPDFHeader(doc, {
    title:    'Audit Trail Report',
    subtitle: `Admin activity log  ·  ${filteredLogs.length} entries  ·  Filter: ${filterLabel}`,
    dateStr,
    timeStr,
    logoB64,
  });

  /* ── Stat cards ───────────────────────────────────────────── */
  drawPDFStatCards(doc, cur, [
    { label: 'Total Logs',    value: logs.length,    color: PT.indigo },
    { label: 'Actions Today', value: todayCount,     color: PT.teal   },
    { label: 'Deletions',     value: deletions,      color: PT.red    },
    { label: 'Logins',        value: logins,         color: PT.green  },
  ]);

  /* ── Most Active Admin callout ────────────────────────────── */
  pguard(doc, cur, 28);
  doc.setFillColor(...PT.offWhite);
  doc.roundedRect(ML, cur.y, CW, 28, 4, 4, 'F');
  doc.setFillColor(...PT.teal);
  doc.rect(ML, cur.y, 4, 28, 'F');
  ptx(doc, 'bold', 7.5, PT.teal);
  doc.text('MOST ACTIVE ADMIN', ML + 14, cur.y + 11);
  ptx(doc, 'bold', 9.5, PT.navyDark);
  doc.text(mostActive, ML + 14, cur.y + 22);
  ptx(doc, 'normal', 7.5, PT.textMuted);
  doc.text(
    `${mostActiveCount} action${mostActiveCount !== 1 ? 's' : ''}`,
    ML + 14 + doc.getTextWidth(mostActive) + 10,
    cur.y + 22,
  );
  cur.adv(36);

  /* ── Action breakdown bars ────────────────────────────────── */
  if (logs.length > 0) {
    drawActionBreakdown(doc, cur, logs);
  }

  /* ── Main audit log table ─────────────────────────────────── */
  drawPDFSectionBar(
    doc, cur,
    `Audit Log  ·  ${filteredLogs.length} Record${filteredLogs.length !== 1 ? 's' : ''}${filter !== 'all' ? `  ·  Filtered: ${filterLabel}` : ''}`,
  );

  if (filteredLogs.length === 0) {
    pguard(doc, cur, 40);
    doc.setFillColor(...PT.offWhite);
    doc.roundedRect(ML, cur.y, CW, 36, 4, 4, 'F');
    ptx(doc, 'italic', 9, PT.textMuted);
    doc.text('No audit log entries match the selected filter.', ML + CW / 2, cur.y + 22, { align: 'center' });
    cur.adv(44);
  } else {
    drawAuditRows(doc, cur, filteredLogs);
  }

  /* ── Timestamp formula note ───────────────────────────────── */
  drawFormulaNote(
    doc, cur,
    'Timestamp: TEXT(DATEVALUE(LEFT(iso,10)) + TIMEVALUE(MID(iso,12,8)), "DD-MMM-YYYY HH:MM")  ·  Parsed from ISO 8601 format (e.g. 2026-03-14T14:25:00.000Z)',
  );

  /* ── Action colour legend ─────────────────────────────────── */
  drawActionLegend(doc, cur);

  /* ── Security note if deletions detected ─────────────────── */
  if (deletions > 0) {
    pguard(doc, cur, 30);
    doc.setFillColor(...PT.redLt);
    doc.roundedRect(ML, cur.y, CW, 26, 4, 4, 'F');
    doc.setDrawColor(...PT.red);
    doc.setLineWidth(0.8);
    doc.roundedRect(ML, cur.y, CW, 26, 4, 4, 'S');
    doc.setFillColor(...PT.red);
    doc.rect(ML, cur.y, 4, 26, 'F');
    ptx(doc, 'bold', 8, PT.red);
    doc.text('⚠  Security Alert:', ML + 14, cur.y + 17);
    ptx(doc, 'normal', 8, PT.red);
    doc.text(
      `${deletions} deletion action${deletions !== 1 ? 's' : ''} detected in this log. Review immediately.`,
      ML + 110,
      cur.y + 17,
    );
    cur.adv(34);
  }

  /* ── Stamp footers on all pages ───────────────────────────── */
  stampPDFFooters(doc, 'Audit Trail Report', doc.internal.getNumberOfPages());

  doc.save(`PESO_Audit_Trail_${now.toISOString().slice(0, 10)}.pdf`);
};