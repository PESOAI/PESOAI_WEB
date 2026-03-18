import { RISK_THRESHOLDS, SPENDING_THRESHOLDS } from '../utils/formulaEngine';

/* ══════════════════════════════════════════════════════════════
   PDF SECTIONS CONFIG
══════════════════════════════════════════════════════════════ */
export const PDF_SECTIONS = [
  { id: 'kpis',       label: 'KPI Summary',             desc: 'Total users, income, expenses, savings',  icon: '📊' },
  { id: 'trend',      label: 'Financial Trend Table',   desc: 'Income / Expenses / Savings over time',   icon: '📈' },
  { id: 'savings',    label: 'Savings Distribution',    desc: 'Saver classification breakdown',          icon: '🥧' },
  { id: 'categories', label: 'Top Spending Categories', desc: 'Category shares and spend status',        icon: '💸' },
  { id: 'risk',       label: 'Risk Users Table',        desc: 'High/Medium/Low risk user list',          icon: '⚠️' },
];

/* ── Layout constants ────────────────────────────────────────── */
export const PW = 595.28, PH = 841.89, ML = 36, MR = 36, CW = PW - ML - MR;
const ROW_H     = 24;
const HDR_H     = 26;
const SECTION_H = 30;
const CELL_PAD  = 8;
const PAGE_TOP  = 42;
const PAGE_BOT  = PH - 36;

/* ── Colour palette ──────────────────────────────────────────── */
export const C = {
  navy:       [15,  30,  65 ],
  navyDark:   [10,  18,  40 ],
  teal:       [13,  148, 136],
  blue:       [37,  99,  235],
  white:      [255, 255, 255],
  offWhite:   [245, 247, 250],
  stripe:     [249, 250, 252],
  line:       [210, 218, 230],
  textDark:   [10,  15,  30 ],
  textMid:    [40,  55,  80 ],
  textMuted:  [80,  95,  115],
  green:      [15,  130, 55 ],
  greenLt:    [209, 250, 229],
  red:        [185, 28,  28 ],
  redLt:      [254, 218, 218],
  amber:      [146, 64,  14 ],
  amberLt:    [254, 237, 188],
  indigo:     [55,  48,  195],
  indigoLt:   [214, 219, 255],
  shadow:     [200, 215, 240],
};

/* ── Helpers ─────────────────────────────────────────────────── */
const setFont = (doc, style, size, color) => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

const guard = (doc, cur, need = 50, dateStr = '', period = '') => {
  if (cur.y + need > PAGE_BOT) {
    doc.addPage();
    drawPageHeader(doc, { dateStr, period });
    cur.y = PAGE_TOP + 6;
    return true;
  }
  return false;
};

export const makeCur = (start = 0) => {
  let y = start;
  return {
    get y() {
      return y;
    },
    set y(v) {
      y = v;
    },
    adv(n) {
      y += n;
    }
  };
};
export const fmtPDF = (v) => {
  const n = Number(v);
  if ((!v && v !== 0) || isNaN(n)) return '-';
  if (n >= 1_000_000) return 'PHP ' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return 'PHP ' + (n / 1_000).toFixed(1) + 'k';
  return 'PHP ' + n.toFixed(0);
};

/* ── Pill helpers ────────────────────────────────────────────── */
const pill = (text, bgColor, textColor) => ({ __pill: true, text, bgColor, textColor });

export const riskPill = (level) => {
  const map = { High: { bg: C.redLt, tc: C.red }, Medium: { bg: C.amberLt, tc: C.amber }, Low: { bg: C.greenLt, tc: C.green } };
  const { bg, tc } = map[level] || { bg: C.offWhite, tc: C.textMid };
  return pill(level, bg, tc);
};

export const saverPill = (name) => {
  const map = { 'Negative Saver': { bg: C.redLt, tc: C.red }, 'Low Saver': { bg: C.amberLt, tc: C.amber }, 'Mid Saver': { bg: C.indigoLt, tc: C.indigo }, 'High Saver': { bg: C.greenLt, tc: C.green } };
  const { bg, tc } = map[name] || { bg: C.offWhite, tc: C.textMid };
  return pill(name, bg, tc);
};

export const spendPill = (status) => {
  const map = { 'Over Limit': { bg: C.redLt, tc: C.red }, 'Caution': { bg: C.amberLt, tc: C.amber }, 'Normal': { bg: C.greenLt, tc: C.green } };
  const { bg, tc } = map[status] || { bg: C.offWhite, tc: C.textMid };
  return pill(status, bg, tc);
};

/* ══════════════════════════════════════════════════════════════
   DRAW FUNCTIONS
══════════════════════════════════════════════════════════════ */
const drawPageHeader = (doc, { dateStr, period }) => {
  doc.setFillColor(...C.navyDark);
  doc.rect(0, 0, PW, 30, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(0, 28, PW, 2.5, 'F');
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, 5, 30, 'F');
  setFont(doc, 'bold', 9, [185, 215, 255]);
  doc.text('PESO AI  ·  Admin Analytics Report', ML + 8, 19);
  setFont(doc, 'normal', 7.5, [120, 160, 210]);
  doc.text(`${period} Period  ·  ${dateStr}`, PW - MR, 19, { align: 'right' });
};

const drawCoverPage = (doc, { dateStr, timeStr, logoB64, period, selected, dashboardData }) => {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, PH, 'F');
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, 8, PH, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(0, PH - 6, PW, 6, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(0, 0, PW, 4, 'F');

  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', ML + 10, 60, 70, 70); } catch (_) {}
  }

  const tx = ML + (logoB64 ? 96 : 20);
  setFont(doc, 'bold', 32, C.white);
  doc.text('PESO AI', tx, 95);
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(2);
  doc.line(tx, 104, tx + 160, 104);
  setFont(doc, 'bold', 14, [185, 220, 255]);
  doc.text('Admin Analytics Report', tx, 122);
  setFont(doc, 'normal', 9, [140, 180, 230]);
  doc.text('Tabular Summary  ·  All financial metrics in structured table format', tx, 138);

  const bx = ML + 20, by = 185, bw = CW - 40, bh = 130;
  doc.setFillColor(25, 50, 100);
  doc.roundedRect(bx, by, bw, bh, 8, 8, 'F');
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(1.5);
  doc.roundedRect(bx, by, bw, bh, 8, 8, 'S');
  doc.setFillColor(...C.teal);
  doc.roundedRect(bx, by, 6, bh, 4, 4, 'F');

  setFont(doc, 'bold', 8, [140, 200, 220]);
  doc.text('REPORT DETAILS', bx + 24, by + 22);

  const infoRows = [
    ['Generated On',  dateStr],
    ['Time',          timeStr],
    ['Period Filter', period],
    ['Sections',      selected.map(s => ({ kpis: 'KPIs', trend: 'Trend', savings: 'Savings', categories: 'Categories', risk: 'Risk Users' })[s] || s).join('  ·  ')],
    ['Total Users',   String(dashboardData.kpis?.total_users ?? '-')],
  ];
  infoRows.forEach(([label, value], i) => {
    const ry = by + 38 + i * 18;
    setFont(doc, 'normal', 8, [120, 165, 215]);
    doc.text(label, bx + 24, ry);
    setFont(doc, 'bold', 8.5, C.white);
    doc.text(value, bx + 130, ry);
  });

  const sx = ML + 20, sy = 345;
  setFont(doc, 'bold', 8, [140, 200, 220]);
  doc.text('SECTIONS INCLUDED IN THIS REPORT', sx, sy);
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(0.5);
  doc.line(sx, sy + 4, sx + 220, sy + 4);

  const sectionLabels = {
    kpis:       '01  KEY PERFORMANCE INDICATORS',
    trend:      '02  FINANCIAL TREND TABLE',
    savings:    '03  SAVINGS DISTRIBUTION',
    categories: '04  TOP SPENDING CATEGORIES',
    risk:       '05  RISK USERS TABLE',
  };
  selected.forEach((sid, i) => {
    const label = sectionLabels[sid] || sid.toUpperCase();
    const col   = i % 2;
    const row   = Math.floor(i / 2);
    const ix    = sx + col * 260;
    const iy    = sy + 20 + row * 26;
    doc.setFillColor(...C.teal);
    doc.circle(ix + 4, iy - 3, 3, 'F');
    setFont(doc, 'bold', 8.5, C.white);
    doc.text(label, ix + 14, iy);
  });

  setFont(doc, 'bold', 8, [60, 100, 160]);
  doc.text('CONFIDENTIAL  ·  FOR INTERNAL USE ONLY', PW / 2, PH - 30, { align: 'center' });
  setFont(doc, 'normal', 7, [50, 85, 140]);
  doc.text('Generated by PESO AI Admin System  ·  ' + dateStr, PW / 2, PH - 18, { align: 'center' });
};

const drawSection = (doc, cur, text, ctx = {}) => {
  guard(doc, cur, SECTION_H + HDR_H + ROW_H * 2, ctx.dateStr, ctx.period);
  doc.setFillColor(...C.navy);
  doc.rect(ML, cur.y, CW, SECTION_H, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(ML, cur.y, 5, SECTION_H, 'F');
  setFont(doc, 'bold', 9.5, C.white);
  doc.text(text.toUpperCase(), ML + 16, cur.y + SECTION_H - 9);
  cur.adv(SECTION_H + 6);
};

const drawTable = (doc, cur, cols, rows, opts = {}) => {
  const { accentColors = null, headerBg = C.navyDark, headerText = C.white, zebra = true, ctx = {} } = opts;
  const { dateStr = '', period = '' } = ctx;

  const drawHdr = () => {
    if (cur.y + HDR_H + ROW_H * 2 > PAGE_BOT) {
      doc.addPage();
      drawPageHeader(doc, { dateStr, period });
      cur.y = PAGE_TOP + 6;
    }
    doc.setFillColor(...headerBg);
    doc.rect(ML, cur.y, CW, HDR_H, 'F');
    doc.setFillColor(...C.teal);
    doc.rect(ML, cur.y, 5, HDR_H, 'F');
    doc.setDrawColor(...C.teal);
    doc.setLineWidth(1.5);
    doc.line(ML, cur.y + HDR_H, ML + CW, cur.y + HDR_H);
    setFont(doc, 'bold', 8.5, headerText);
    let x = ML;
    cols.forEach(col => {
      const align = col.align || 'left';
      const tx = align === 'right' ? x + col.width - CELL_PAD : align === 'center' ? x + col.width / 2 : x + CELL_PAD + 6;
      doc.text(col.label, tx, cur.y + HDR_H - 7, { align });
      x += col.width;
    });
    cur.adv(HDR_H);
  };

  drawHdr();

  rows.forEach((row, idx) => {
    if (cur.y + ROW_H > PAGE_BOT) {
      doc.addPage();
      drawPageHeader(doc, { dateStr, period });
      cur.y = PAGE_TOP + 6;
      drawHdr();
    }
    const rowBg = zebra && idx % 2 === 1 ? C.stripe : C.white;
    doc.setFillColor(...rowBg);
    doc.rect(ML, cur.y, CW, ROW_H, 'F');
    if (accentColors && accentColors[idx]) {
      doc.setFillColor(...accentColors[idx]);
      doc.rect(ML, cur.y, 5, ROW_H, 'F');
    }
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.4);
    doc.line(ML, cur.y + ROW_H, ML + CW, cur.y + ROW_H);

    let x = ML;
    row.forEach((cell, ci) => {
      const col   = cols[ci];
      const align = col.align || 'left';
      const padX  = ci === 0 ? CELL_PAD + 6 : CELL_PAD;
      const tx = align === 'right' ? x + col.width - CELL_PAD : align === 'center' ? x + col.width / 2 : x + padX;

      if (cell && cell.__pill) {
        const { text: pt, bgColor, textColor } = cell;
        const pillW = Math.min(col.width - CELL_PAD * 2, 86);
        const pillH = 15;
        const pillX = align === 'center' ? x + (col.width - pillW) / 2 : align === 'right' ? x + col.width - CELL_PAD - pillW : x + padX;
        const pillY = cur.y + (ROW_H - pillH) / 2;
        doc.setFillColor(...bgColor);
        doc.roundedRect(pillX, pillY, pillW, pillH, 3, 3, 'F');
        doc.setDrawColor(...textColor);
        doc.setLineWidth(0.6);
        doc.roundedRect(pillX, pillY, pillW, pillH, 3, 3, 'S');
        setFont(doc, 'bold', 8, textColor);
        doc.text(pt, pillX + pillW / 2, pillY + pillH - 4, { align: 'center' });
        setFont(doc, 'normal', 9, C.textDark);
      } else if (cell !== '' && cell != null) {
        setFont(doc, ci === 0 ? 'bold' : 'normal', 9, C.textDark);
        doc.text(String(cell), tx, cur.y + ROW_H - 7, { align, maxWidth: col.width - CELL_PAD * 2 });
      }
      x += col.width;
    });
    cur.adv(ROW_H);
  });
  cur.adv(14);
};

const stampFooters = (doc, totalPages) => {
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFillColor(...C.navyDark);
    doc.rect(0, PH - 28, PW, 28, 'F');
    doc.setFillColor(...C.teal);
    doc.rect(0, PH - 28, PW, 2, 'F');
    setFont(doc, 'normal', 7.5, [140, 185, 230]);
    doc.text('PESO AI  ·  Admin Analytics Report  ·  Confidential', ML, PH - 10);
    setFont(doc, 'bold', 7.5, [180, 210, 255]);
    doc.text(`Page ${pg} of ${totalPages}`, PW - MR, PH - 10, { align: 'right' });
  }
};

/* ── jsPDF loader ────────────────────────────────────────────── */
const loadjsPDF = () => new Promise(resolve => {
  if (window.jspdf) { resolve(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = resolve;
  document.head.appendChild(s);
});

const getPDFLogoBase64 = async (logoSrc) => {
  try {
    const res  = await fetch(logoSrc);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
};

/* ══════════════════════════════════════════════════════════════
   MAIN GENERATE PDF
══════════════════════════════════════════════════════════════ */
export const generatePDF = async (selected, dashboardData, logoSrc) => {
  await loadjsPDF();
  const logoB64 = await getPDFLogoBase64(logoSrc);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const cur = makeCur();

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const period  = (dashboardData.trendFilter || 'monthly').charAt(0).toUpperCase()
                + (dashboardData.trendFilter || 'monthly').slice(1);
  const ctx     = { dateStr, period };

  // PAGE 1: Cover
  drawCoverPage(doc, { dateStr, timeStr, logoB64, period, selected, dashboardData });

  // PAGE 2+: Data
  doc.addPage();
  drawPageHeader(doc, ctx);
  cur.y = PAGE_TOP + 10;

  let sectionNum = 1;

  /* ── KPIs ── */
  if (selected.includes('kpis') && dashboardData.kpis) {
    const k = dashboardData.kpis;
    drawSection(doc, cur, `${sectionNum++}. Key Performance Indicators`, ctx);
    drawTable(doc, cur, [
      { label: 'METRIC',      width: CW * 0.30 },
      { label: 'VALUE',       width: CW * 0.28, align: 'right' },
      { label: 'DESCRIPTION', width: CW * 0.42 },
    ], [
      ['Total Users',   String(k.total_users ?? '0'),  'All registered users in the system'],
      ['Active Users',  `${k.pct_active ?? 0}%`,       'Users active within current period'],
      ['Avg. Income',   fmtPDF(k.avg_income),           'Average income across all users'],
      ['Avg. Expenses', fmtPDF(k.avg_expenses),         'Average total expenses per user'],
      ['Avg. Savings',  fmtPDF(k.avg_savings),          'Average savings (income − expenses)'],
    ], { accentColors: [C.indigo, C.green, C.blue, C.red, C.amber], ctx });
  }

  /* ── Trend ── */
  if (selected.includes('trend') && dashboardData.trend?.length > 0) {
    drawSection(doc, cur, `${sectionNum++}. Financial Trend  (${period})`, ctx);
    const trendRows = dashboardData.trend.map(d => {
      const inc = Number(d.avg_income || 0);
      const sav = Number(d.avg_savings || 0);
      const exp = Number(d.avg_expenses || 0);
      let rate = '-';
      if (inc > 0) rate = ((sav / inc) * 100).toFixed(1) + '%';
      else if (sav !== 0 && exp > 0) rate = 'Deficit';
      return [String(d.label || '-'), fmtPDF(inc), fmtPDF(exp), fmtPDF(sav), rate];
    });
    drawTable(doc, cur, [
      { label: 'PERIOD / LABEL', width: CW * 0.22 },
      { label: 'AVG. INCOME',    width: CW * 0.20, align: 'right' },
      { label: 'AVG. EXPENSES',  width: CW * 0.20, align: 'right' },
      { label: 'AVG. SAVINGS',   width: CW * 0.20, align: 'right' },
      { label: 'SAVINGS RATE',   width: CW * 0.18, align: 'right' },
    ], trendRows, {
      accentColors: dashboardData.trend.map(d => Number(d.avg_savings || 0) >= 0 ? C.green : C.red),
      ctx,
    });
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(ML, cur.y - 8, CW, 20, 3, 3, 'F');
    doc.setDrawColor(...C.indigo);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, cur.y - 8, CW, 20, 3, 3, 'S');
    doc.setFillColor(...C.indigo);
    doc.rect(ML, cur.y - 8, 4, 20, 'F');
    setFont(doc, 'bold', 7.5, C.indigo);
    doc.text('Formula:', ML + 12, cur.y + 6);
    setFont(doc, 'normal', 7.5, C.textMid);
    doc.text('Savings Rate = (AVG. SAVINGS ÷ AVG. INCOME) × 100   |   Shown as "Deficit" when income = 0 but expenses exist.', ML + 52, cur.y + 6);
    cur.adv(22);
  }

  /* ── Savings Distribution ── */
  if (selected.includes('savings') && dashboardData.savingsDist?.length > 0) {
    const dist  = dashboardData.savingsDist.filter(d => d.value > 0);
    const total = dist.reduce((s, d) => s + d.value, 0);
    drawSection(doc, cur, `${sectionNum++}. Savings Distribution`, ctx);
    const savRows = dist.map(d => {
      const share = total > 0 ? ((d.value / total) * 100).toFixed(1) + '%' : '0%';
      return [d.name, String(d.value), share, saverPill(d.name)];
    });
    savRows.push(['TOTAL', String(total), '100%', '']);
    const savAccents = dist.map(d => ({ 'Negative Saver': C.red, 'Low Saver': C.amber, 'Mid Saver': C.indigo, 'High Saver': C.green })[d.name] || C.teal);
    savAccents.push(C.teal);
    drawTable(doc, cur, [
      { label: 'CLASSIFICATION', width: CW * 0.38 },
      { label: 'USER COUNT',     width: CW * 0.20, align: 'right' },
      { label: 'SHARE (%)',      width: CW * 0.18, align: 'right' },
      { label: 'STATUS',         width: CW * 0.24, align: 'center' },
    ], savRows, { accentColors: savAccents, ctx });
  }

  /* ── Categories ── */
  if (selected.includes('categories') && dashboardData.categories?.length > 0) {
    const top6      = dashboardData.categories.slice(0, 6);
    const top6Total = top6.reduce((s, c) => s + Number(c.total_spent || 0), 0);
    drawSection(doc, cur, `${sectionNum++}. Top Spending Categories`, ctx);
    const catRows = top6.map((c, i) => {
      const share  = top6Total > 0 ? Math.round((Number(c.total_spent) / top6Total) * 100) : 0;
      const status = share >= SPENDING_THRESHOLDS.CRITICAL ? 'Over Limit' : share >= SPENDING_THRESHOLDS.CAUTION ? 'Caution' : 'Normal';
      return [String(i + 1), c.category, fmtPDF(c.total_spent), share + '%', spendPill(status)];
    });
    drawTable(doc, cur, [
      { label: '#',           width: CW * 0.07, align: 'center' },
      { label: 'CATEGORY',    width: CW * 0.30 },
      { label: 'TOTAL SPENT', width: CW * 0.22, align: 'right' },
      { label: 'SHARE (%)',   width: CW * 0.15, align: 'right' },
      { label: 'STATUS',      width: CW * 0.26, align: 'center' },
    ], catRows, {
      accentColors: top6.map(c => { const h = c.color_hex || '#6366F1'; return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }),
      ctx,
    });
  }

  /* ── Risk Users ── */
  if (selected.includes('risk') && dashboardData.allRiskUsers?.length > 0) {
    drawSection(doc, cur, `${sectionNum++}. Risk Users  (by Expense Ratio)`, ctx);
    const highCt = dashboardData.allRiskUsers.filter(u => u.risk_level === 'High').length;
    const medCt  = dashboardData.allRiskUsers.filter(u => u.risk_level === 'Medium').length;
    const lowCt  = dashboardData.allRiskUsers.filter(u => u.risk_level === 'Low').length;
    drawTable(doc, cur, [
      { label: 'RISK LEVEL', width: CW * 0.34, align: 'center' },
      { label: 'USER COUNT', width: CW * 0.33, align: 'center' },
      { label: 'THRESHOLD',  width: CW * 0.33, align: 'center' },
    ], [
      [{ __pill: true, text: 'High Risk',   bgColor: C.redLt,   textColor: C.red   }, String(highCt), `Expense Ratio ≥ ${RISK_THRESHOLDS.HIGH}%`],
      [{ __pill: true, text: 'Medium Risk', bgColor: C.amberLt, textColor: C.amber }, String(medCt),  `Expense Ratio ≥ ${RISK_THRESHOLDS.MEDIUM}%`],
      [{ __pill: true, text: 'Low Risk',    bgColor: C.greenLt, textColor: C.green }, String(lowCt),  `Expense Ratio < ${RISK_THRESHOLDS.MEDIUM}%`],
    ], { accentColors: [C.red, C.amber, C.green], ctx });

    doc.setFillColor(245, 248, 255);
    doc.roundedRect(ML, cur.y - 8, CW, 20, 3, 3, 'F');
    doc.setDrawColor(...C.indigo);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, cur.y - 8, CW, 20, 3, 3, 'S');
    doc.setFillColor(...C.indigo);
    doc.rect(ML, cur.y - 8, 4, 20, 'F');
    setFont(doc, 'bold', 7.5, C.indigo);
    doc.text('Formula:', ML + 12, cur.y + 6);
    setFont(doc, 'normal', 7.5, C.textMid);
    doc.text("Expense Ratio = (AVG. EXPENSES ÷ AVG. INCOME) × 100   |   Columns below show Income & Expenses so you can verify each user's ratio.", ML + 52, cur.y + 6);
    cur.adv(22);

    const sortOrder = { High: 0, Medium: 1, Low: 2 };
    const sorted = [...dashboardData.allRiskUsers].sort((a, b) => (sortOrder[a.risk_level] ?? 3) - (sortOrder[b.risk_level] ?? 3));
    drawTable(doc, cur, [
      { label: 'FULL NAME',     width: CW * 0.20 },
      { label: 'EMAIL',         width: CW * 0.22 },
      { label: 'AVG. INCOME',   width: CW * 0.14, align: 'right' },
      { label: 'AVG. EXPENSES', width: CW * 0.14, align: 'right' },
      { label: 'EXP. RATIO',    width: CW * 0.12, align: 'right' },
      { label: 'RISK LEVEL',    width: CW * 0.18, align: 'center' },
    ], sorted.map(u => [
      (u.full_name || '-').substring(0, 22),
      (u.email     || '-').substring(0, 26),
      fmtPDF(u.total_income),
      fmtPDF(u.total_expenses),
      Number(u.expense_ratio).toFixed(1) + '%',
      riskPill(u.risk_level),
    ]), {
      accentColors: sorted.map(u => ({ High: C.red, Medium: C.amber, Low: C.green })[u.risk_level] || C.teal),
      ctx,
    });
  }

  stampFooters(doc, doc.internal.getNumberOfPages());
  doc.save(`PESO_AI_Analytics_${now.toISOString().slice(0, 10)}.pdf`);
};

/* ═══════════════════════════════════════════════════════════════════════════════
   EXECUTIVE SUMMARY (ONE-PAGE)
═══════════════════════════════════════════════════════════════════════════════ */
export const generateExecutiveSummaryPDF = async (dashboardData, logoSrc) => {
  await loadjsPDF();
  const logoB64 = await getPDFLogoBase64(logoSrc);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const period  = (dashboardData.trendFilter || 'monthly').charAt(0).toUpperCase()
                + (dashboardData.trendFilter || 'monthly').slice(1);

  drawPageHeader(doc, { dateStr, period });

  let y = PAGE_TOP + 12;
  setFont(doc, 'bold', 16, C.textDark);
  doc.text('Executive Summary', ML, y);
  setFont(doc, 'normal', 8.5, C.textMuted);
  doc.text(`Generated ${dateStr} · ${timeStr}`, ML, y + 14);

  // KPI cards
  const k = dashboardData.kpis || {};
  const statY = y + 26;
  const cardW = CW / 3;
  const stats = [
    { label: 'Avg. Income',   value: fmtPDF(k.avg_income),   color: C.green },
    { label: 'Avg. Expenses', value: fmtPDF(k.avg_expenses), color: C.red   },
    { label: 'Avg. Savings',  value: fmtPDF(k.avg_savings),  color: C.indigo },
  ];
  stats.forEach((s, i) => {
    const cx = ML + i * cardW;
    doc.setFillColor(...C.offWhite);
    doc.roundedRect(cx + 2, statY, cardW - 4, 42, 6, 6, 'F');
    doc.setFillColor(...s.color);
    doc.rect(cx + 2, statY, 4, 42, 'F');
    setFont(doc, 'bold', 14, s.color);
    doc.text(String(s.value), cx + cardW / 2 + 2, statY + 24, { align: 'center' });
    setFont(doc, 'normal', 7.5, C.textMuted);
    doc.text(s.label.toUpperCase(), cx + cardW / 2 + 2, statY + 35, { align: 'center' });
  });

  const cur = makeCur(statY + 56);
  const ctx = { dateStr, period };

  // Income & Savings Snapshot
  drawSection(doc, cur, 'Income & Savings Snapshot', ctx);
  const avgIncome = Number(k.avg_income || 0);
  const avgSavings = Number(k.avg_savings || 0);
  const avgExpenses = Number(k.avg_expenses || 0);
  const savingsRate = avgIncome > 0 ? ((avgSavings / avgIncome) * 100).toFixed(1) + '%' : 'N/A';
  const expenseRatio = avgIncome > 0 ? ((avgExpenses / avgIncome) * 100).toFixed(1) + '%' : 'N/A';
  drawTable(doc, cur, [
    { label: 'METRIC', width: CW * 0.40 },
    { label: 'VALUE',  width: CW * 0.60, align: 'right' },
  ], [
    ['Average Income',  fmtPDF(k.avg_income)],
    ['Average Expenses',fmtPDF(k.avg_expenses)],
    ['Average Savings', fmtPDF(k.avg_savings)],
    ['Savings Rate',    savingsRate],
    ['Expense Ratio',   expenseRatio],
  ], { ctx });

  // Income vs Expenses (last 3)
  const trend = Array.isArray(dashboardData.trend) ? dashboardData.trend : [];
  const tail3 = trend.slice(-3);
  if (tail3.length > 0) {
    drawSection(doc, cur, 'Income vs Expenses (Last 3)', ctx);
    drawTable(doc, cur, [
      { label: 'PERIOD',        width: CW * 0.34 },
      { label: 'AVG. INCOME',   width: CW * 0.33, align: 'right' },
      { label: 'AVG. EXPENSES', width: CW * 0.33, align: 'right' },
    ], tail3.map(d => [String(d.label || '-'), fmtPDF(d.avg_income), fmtPDF(d.avg_expenses)]), { ctx });
  }

  // User Growth
  const usersFromTrend = trend
    .map(d => Number(d.user_count ?? d.total_users ?? d.users))
    .filter(v => Number.isFinite(v));
  const lastTrendUsers = usersFromTrend.length > 0 ? usersFromTrend[usersFromTrend.length - 1] : 0;
  const currentUsers = Number.isFinite(Number(k.total_users)) ? Number(k.total_users) : (lastTrendUsers || 0);
  const prevUsersRaw = Number(k.prev_total_users ?? k.total_users_prev ?? k.total_users_previous ?? NaN);
  const prevUsers = Number.isFinite(prevUsersRaw) ? prevUsersRaw : (usersFromTrend[0] || NaN);
  const growthPct = prevUsers && Number.isFinite(prevUsers) && prevUsers > 0
    ? (((currentUsers - prevUsers) / prevUsers) * 100).toFixed(1) + '%'
    : 'N/A';
  drawSection(doc, cur, 'User Growth', ctx);
  drawTable(doc, cur, [
    { label: 'METRIC', width: CW * 0.40 },
    { label: 'VALUE',  width: CW * 0.60, align: 'right' },
  ], [
    ['Total Users', String(currentUsers || 0)],
    ['Active Users %', `${k.pct_active ?? 0}%`],
    ['Growth Rate', growthPct],
  ], { ctx });

  // Top Spending Categories (Top 3)
  const cats = Array.isArray(dashboardData.categories) ? dashboardData.categories : [];
  if (cats.length > 0) {
    const top3 = cats.slice(0, 3);
    const total = top3.reduce((s, c) => s + Number(c.total_spent || 0), 0);
    drawSection(doc, cur, 'Top Spending Categories (Top 3)', ctx);
    drawTable(doc, cur, [
      { label: 'CATEGORY', width: CW * 0.50 },
      { label: 'TOTAL',    width: CW * 0.30, align: 'right' },
      { label: 'SHARE',    width: CW * 0.20, align: 'right' },
    ], top3.map(c => {
      const share = total > 0 ? Math.round((Number(c.total_spent || 0) / total) * 100) + '%' : '0%';
      return [String(c.category || '-'), fmtPDF(c.total_spent), share];
    }), { ctx });
  }

  // Risk Overview
  const risks = Array.isArray(dashboardData.allRiskUsers) ? dashboardData.allRiskUsers : [];
  if (risks.length > 0) {
    const highCt = risks.filter(u => u.risk_level === 'High').length;
    const medCt  = risks.filter(u => u.risk_level === 'Medium').length;
    const lowCt  = risks.filter(u => u.risk_level === 'Low').length;
    drawSection(doc, cur, 'Risk Overview', ctx);
    drawTable(doc, cur, [
      { label: 'LEVEL', width: CW * 0.50 },
      { label: 'USERS', width: CW * 0.50, align: 'right' },
    ], [
      ['High Risk', String(highCt)],
      ['Medium Risk', String(medCt)],
      ['Low Risk', String(lowCt)],
    ], { ctx });
  }

  stampFooters(doc, doc.internal.getNumberOfPages());
  doc.save(`PESO_AI_Executive_Summary_${now.toISOString().slice(0, 10)}.pdf`);
};
/* ══════════════════════════════════════════════════════════════
   SHARED PDF UTILITIES — used by auditPDF.js, usersPDF.js, etc.
══════════════════════════════════════════════════════════════ */

// Aliases para sa auditPDF / usersPDF compatibility
export const CW_PDF = CW;

export const getLogoBase64 = getPDFLogoBase64;

export { loadjsPDF };

// PT — shared colour tokens (mirrors C but named PT for other PDFs)
export const PT = {
  navy:      C.navy,
  navyDark:  C.navyDark,
  teal:      C.teal,
  blue:      C.blue,
  white:     C.white,
  offWhite:  C.offWhite,
  bgStripe:  C.stripe,
  lineGray:  C.line,
  textDark:  C.textDark,
  textMid:   C.textMid,
  textMuted: C.textMuted,
  green:     C.green,
  greenLt:   C.greenLt,
  red:       C.red,
  redLt:     C.redLt,
  amber:     C.amber,
  amberLt:   C.amberLt,
  indigo:    C.indigo,
  indigoLt:  C.indigoLt,
};

// ptx — font shorthand used by auditPDF / usersPDF
export const ptx = (doc, style, size, color) => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

// palpha — fill with opacity helper
export const palpha = (doc, color, opacity = 1) => {
  doc.setFillColor(...color);
  doc.setGState && doc.setGState(new doc.GState({ opacity }));
};

// pguard — page guard for auditPDF / usersPDF
export const pguard = (doc, cur, need = 30) => {
  if (cur.y + need > PH - 36) {
    doc.addPage();
    cur.y = 42 + 6;
    return true;
  }
  return false;
};

// drawPDFHeader — cover/header for auditPDF / usersPDF
export const drawPDFHeader = (doc, { title, subtitle, dateStr, timeStr, logoB64 }) => {
  doc.setFillColor(...C.navyDark);
  doc.rect(0, 0, PW, 72, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(0, 70, PW, 3, 'F');
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, 6, 72, 'F');

  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', ML + 8, 12, 40, 40); } catch (_) {}
  }
  const tx = ML + (logoB64 ? 58 : 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('PESO AI  ·  ' + title, tx, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 180, 230);
  doc.text(subtitle, tx, 48);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 140, 200);
  doc.text(`Generated: ${dateStr}  ·  ${timeStr}`, tx, 62);

  return 84; // returns starting y for content
};

// stampPDFFooters — footer for auditPDF / usersPDF
export const stampPDFFooters = (doc, reportName, totalPages) => {
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFillColor(...C.navyDark);
    doc.rect(0, PH - 28, PW, 28, 'F');
    doc.setFillColor(...C.teal);
    doc.rect(0, PH - 28, PW, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 185, 230);
    doc.text(`PESO AI  ·  ${reportName}  ·  Confidential`, ML, PH - 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 210, 255);
    doc.text(`Page ${pg} of ${totalPages}`, PW - MR, PH - 10, { align: 'right' });
  }
};

// drawPDFStatCards — stat summary row
export const drawPDFStatCards = (doc, cur, stats) => {
  const cardW = CW / stats.length;
  stats.forEach((s, i) => {
    const cx = ML + i * cardW;
    doc.setFillColor(...C.offWhite);
    doc.roundedRect(cx + 2, cur.y, cardW - 4, 38, 6, 6, 'F');
    doc.setFillColor(...s.color);
    doc.rect(cx + 2, cur.y, 4, 38, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...s.color);
    doc.text(String(s.value), cx + cardW / 2 + 2, cur.y + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(s.label.toUpperCase(), cx + cardW / 2 + 2, cur.y + 33, { align: 'center' });
  });
  cur.adv(48);
};

// drawPDFSectionBar — dark section divider
export const drawPDFSectionBar = (doc, cur, text) => {
  doc.setFillColor(...C.navy);
  doc.rect(ML, cur.y, CW, 26, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(ML, cur.y, 5, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.white);
  doc.text(text.toUpperCase(), ML + 14, cur.y + 17);
  cur.adv(32);
};

// drawPDFTableHeader — table column headers
export const drawPDFTableHeader = (doc, cur, cols) => {
  doc.setFillColor(...C.navyDark);
  doc.rect(ML, cur.y, CW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  cols.forEach(col => {
    doc.text(col.label, col.x + 5, cur.y + 15);
  });
  cur.adv(22);
};
