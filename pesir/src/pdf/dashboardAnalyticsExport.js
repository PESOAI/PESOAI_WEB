/* ══════════════════════════════════════════════════════════════
   dashboardAnalyticsExport.js — PESO AI  v4
   - Inline formula column: SHORT 2-line max (readable in cell)
   - FORMULA LEGEND section at bottom of every sheet
     with full step-by-step breakdown
   - Row height 50 for formula rows so wrap shows properly
   ══════════════════════════════════════════════════════════════ */

import { LOGO_BASE64 } from './logoBase64.js';

const loadExcelJS = () =>
  new Promise((resolve, reject) => {
    if (window.ExcelJS) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ExcelJS'));
    document.head.appendChild(s);
  });

const triggerDownload = (buffer, filename) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const pesoFmt = (v) =>
  v != null
    ? `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '₱0.00';

const num       = (v) => Number(v) || 0;
const pct2      = (v) => `${num(v).toFixed(1)}%`;
const sharePct  = (v, t) => t > 0 ? Math.round((num(v) / t) * 100) : 0;

// ── SHORT inline formula strings (2 lines max) ────────────────
const fmtRatio  = (exp, inc) =>
  `Exp ÷ Inc × 100\n${pesoFmt(exp)} ÷ ${pesoFmt(inc)} × 100 = ${inc > 0 ? pct2((exp / inc) * 100) : '0.0%'}`;

const fmtNet    = (inc, exp) =>
  `Income − Expenses\n${pesoFmt(inc)} − ${pesoFmt(exp)} = ${pesoFmt(inc - exp)}`;

const fmtShare  = (spent, total, cat) =>
  `${cat} ÷ Total × 100\n${pesoFmt(spent)} ÷ ${pesoFmt(total)} × 100 = ${sharePct(spent, total)}%`;

const fmtSavRate = (name) => {
  const map = {
    'Negative Saver': `(Inc − Exp) ÷ Inc × 100\nResult < 0% → Expenses exceed income`,
    'Low Saver':      `(Inc − Exp) ÷ Inc × 100\nResult 0%–10% → Minimal savings`,
    'Mid Saver':      `(Inc − Exp) ÷ Inc × 100\nResult 10%–30% → Moderate savings`,
    'High Saver':     `(Inc − Exp) ÷ Inc × 100\nResult > 30% → Excellent savings`,
  };
  return map[name] ?? `(Inc − Exp) ÷ Inc × 100`;
};

const fmtAvgSav = (inc, exp, sav) =>
  `Avg Income − Avg Expenses\n${pesoFmt(inc)} − ${pesoFmt(exp)} = ${pesoFmt(sav)}`;

export const generateDashboardXLSX = async ({
  kpis,
  allRiskUsers = [],
  trendFilter  = 'monthly',
  trend        = [],
  savingsDist  = [],
  categories   = [],
}) => {
  await loadExcelJS();

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  /* ── COLOURS ─────────────────────────────────────────────── */
  const C = {
    navy:     'FF1E3A5F', navyDark: 'FF0F172A',
    white:    'FFFFFFFF', offWhite: 'FFF8FAFC',
    slate200: 'FFE2E8F0', slate400: 'FF94A3B8', slate600: 'FF475569',
    indigo:   'FF6366F1', indigoBg: 'FFEEF2FF',
    green:    'FF22C55E', greenBg:  'FFF0FDF4',
    red:      'FFEF4444', redBg:    'FFFFF5F5',
    amber:    'FFF59E0B', amberBg:  'FFFFFBEB',
    blue:     'FF3B82F6', blueBg:   'FFEFF6FF',
    teal:     'FF0D9488', tealBg:   'FFF0FDFA',
    riskHigh: 'FFEF4444', riskHighBg: 'FFFFF5F5',
    riskMed:  'FFF59E0B', riskMedBg:  'FFFFFBEB',
    riskLow:  'FF22C55E', riskLowBg:  'FFF0FDF4',
  };

  /* ── STYLE HELPERS ──────────────────────────────────────── */
  const solid = (a) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: a } });
  const thin  = (a = C.slate200) => ({
    top: { style: 'thin', color: { argb: a } }, bottom: { style: 'thin', color: { argb: a } },
    left: { style: 'thin', color: { argb: a } }, right: { style: 'thin', color: { argb: a } },
  });
  const btm = (a = C.slate200) => ({ bottom: { style: 'thin', color: { argb: a } } });

  const sc = (cell, { bg, fg = C.navyDark, bold = false, size = 10,
    align = 'left', valign = 'middle', wrap = false, italic = false } = {}) => {
    if (bg) cell.fill = solid(bg);
    cell.font      = { name: 'Calibri', size, bold, italic, color: { argb: fg } };
    cell.alignment = { horizontal: align, vertical: valign, wrapText: wrap };
  };

  /* ── LOGO ───────────────────────────────────────────────── */
  const addLogo = (ws, wb) => {
    try {
      const clean = LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');
      ws.addImage(wb.addImage({ base64: clean, extension: 'png' }),
        { tl: { col: 0.4, row: 0.7 }, ext: { width: 90, height: 90 }, editAs: 'oneCell' });
    } catch (e) { console.warn('Logo skip:', e.message); }
  };

  /* ── HEADER BLOCK ───────────────────────────────────────── */
  const buildHeader = (ws, wb, COLS, title, sub) => {
    for (let r = 1; r <= 5; r++) {
      ws.getRow(r).height = 22;
      for (let c = 1; c <= COLS; c++) ws.getCell(r, c).fill = solid(C.navy);
    }
    addLogo(ws, wb);
    ws.mergeCells(2, 3, 2, COLS - 1);
    ws.getCell(2, 3).value = title;
    sc(ws.getCell(2, 3), { fg: C.white, bold: true, size: 18, align: 'center' });
    ws.mergeCells(3, 3, 3, COLS - 1);
    ws.getCell(3, 3).value = sub;
    sc(ws.getCell(3, 3), { fg: C.white, size: 10, align: 'center' });
    ws.getCell(2, COLS).value = dateStr;
    sc(ws.getCell(2, COLS), { fg: C.white, size: 9, align: 'right', bold: true });
    ws.getCell(3, COLS).value = timeStr;
    sc(ws.getCell(3, COLS), { fg: C.white, size: 9, align: 'right' });
  };

  /* ── SECTION LABEL ──────────────────────────────────────── */
  const sectionRow = (ws, row, c1, c2, label, bg = C.navyDark) => {
    ws.mergeCells(row, c1, row, c2);
    ws.getRow(row).height = 26;
    ws.getCell(row, c1).value = label;
    sc(ws.getCell(row, c1), { bg, fg: C.white, bold: true, size: 11 });
  };

  /* ── TABLE HEADER ───────────────────────────────────────── */
  const tableHeader = (ws, row, labels) => {
    ws.getRow(row).height = 30;
    labels.forEach((lbl, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = lbl; cell.border = thin();
      sc(cell, { bg: C.navyDark, fg: C.white, bold: true, size: 10, align: 'center' });
    });
  };

  /* ── STAT CARD ──────────────────────────────────────────── */
  const statCard = (ws, vRow, lRow, c1, c2, value, label, bg) => {
    ws.mergeCells(vRow, c1, vRow, c2);
    ws.getCell(vRow, c1).value = value;
    sc(ws.getCell(vRow, c1), { bg, fg: C.white, bold: true, size: 22, align: 'center' });
    ws.mergeCells(lRow, c1, lRow, c2);
    ws.getCell(lRow, c1).value = label;
    sc(ws.getCell(lRow, c1), { bg, fg: C.white, size: 9, align: 'center' });
  };

  /* ── FOOTER ─────────────────────────────────────────────── */
  const footer = (ws, row, COLS) => {
    ws.mergeCells(row, 1, row, COLS);
    ws.getRow(row).height = 18;
    ws.getCell(row, 1).value =
      `PESO AI  ·  Dashboard Analytics Export  ·  ${dateStr} ${timeStr}  ·  Confidential`;
    sc(ws.getCell(row, 1), { fg: C.slate400, size: 9, align: 'center', italic: true });
  };

  /* ════════════════════════════════════════════════════════════
     FORMULA LEGEND BUILDER
     Adds a full step-by-step formula reference section
     below the data table on each sheet.
  ════════════════════════════════════════════════════════════ */
  const buildLegend = (ws, startRow, COLS, entries) => {
    // Gap row
    ws.getRow(startRow).height = 10;

    // Legend header
    sectionRow(ws, startRow + 1, 1, COLS, '  📐  FORMULA LEGEND  —  Step-by-step explanation of every calculation above', C.teal);

    // Column headers for legend table
    ws.getRow(startRow + 2).height = 28;
    [
      { v: 'Metric / Column',  w: 0.18 },
      { v: 'Formula Used',     w: 0.24 },
      { v: 'Step-by-Step Calculation',  w: 0.35 },
      { v: 'Result / Rule',    w: 0.23 },
    ].forEach(({ v }, ci) => {
      const cell = ws.getCell(startRow + 2, ci + 1);
      cell.value = v; cell.border = thin(C.teal);
      sc(cell, { bg: C.teal, fg: C.white, bold: true, size: 10, align: 'center' });
    });
    // Merge remaining cols into last visible header
    if (COLS > 4) ws.mergeCells(startRow + 2, 4, startRow + 2, COLS);

    // Data rows
    entries.forEach(({ metric, formula, steps, result }, idx) => {
      const r     = startRow + 3 + idx;
      const rowBg = idx % 2 === 0 ? C.tealBg : C.white;
      ws.getRow(r).height = 52; // tall enough to show multi-line wrap

      [
        { col: 1, val: metric,  fg: C.navyDark, bold: true  },
        { col: 2, val: formula, fg: C.teal,     bold: true  },
        { col: 3, val: steps,   fg: C.slate600, bold: false },
        { col: 4, val: result,  fg: C.navyDark, bold: true  },
      ].forEach(({ col, val, fg, bold }) => {
        const cell  = ws.getCell(r, col);
        cell.value  = val;
        cell.border = btm(C.teal);
        sc(cell, { bg: rowBg, fg, bold, size: 9, wrap: true, valign: 'top' });
      });
      // Merge result col across remaining cols if sheet is wider
      if (COLS > 4) ws.mergeCells(r, 4, r, COLS);
    });

    return startRow + 3 + entries.length; // return last used row
  };

  /* ── WORKBOOK ───────────────────────────────────────────── */
  const wb = new window.ExcelJS.Workbook();
  wb.creator = 'PESO AI'; wb.created = now; wb.modified = now;

  const riskUsers = Array.isArray(allRiskUsers) ? allRiskUsers : [];
  const highCount = riskUsers.filter(u => u.risk_level === 'High').length;
  const medCount  = riskUsers.filter(u => u.risk_level === 'Medium').length;
  const lowCount  = riskUsers.filter(u => u.risk_level === 'Low').length;
  const trendData = Array.isArray(trend) ? trend : [];
  const totalUsers = num(kpis?.total_users);
  const pctActive  = num(kpis?.pct_active);
  const activeCount = Math.round((pctActive / 100) * totalUsers);
  const avgInc = num(kpis?.avg_income);
  const avgExp = num(kpis?.avg_expenses);
  const avgSav = num(kpis?.avg_savings);

  /* ════════════════════════════════════════════════════════════
     SHEET 1 — DASHBOARD OVERVIEW
  ════════════════════════════════════════════════════════════ */
  const ws1 = wb.addWorksheet('Dashboard Overview', { views: [{ showGridLines: false }] });
  ws1.columns = [
    { width: 28 }, { width: 24 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 44 },
  ];
  const C1 = 8;

  buildHeader(ws1, wb, C1,
    'DASHBOARD ANALYTICS REPORT',
    `System Records as of ${dateStr}  ·  Period: ${trendFilter.toUpperCase()}`
  );

  ws1.getRow(7).height = 40; ws1.getRow(8).height = 20; ws1.getRow(9).height = 6;
  statCard(ws1, 7, 8, 1, 2, totalUsers,            'TOTAL USERS',   C.indigo);
  statCard(ws1, 7, 8, 3, 4, `${pctActive}%`,       'ACTIVE USERS',  C.green);
  statCard(ws1, 7, 8, 5, 6, pesoFmt(avgInc),       'AVG. INCOME',   C.blue);
  statCard(ws1, 7, 8, 7, 8, pesoFmt(avgExp),       'AVG. EXPENSES', C.red);

  ws1.getRow(10).height = 40; ws1.getRow(11).height = 20; ws1.getRow(12).height = 8;
  statCard(ws1, 10, 11, 1, 2, pesoFmt(avgSav), 'AVG. SAVINGS',  C.amber);
  statCard(ws1, 10, 11, 3, 4, highCount,        'HIGH RISK',     C.riskHigh);
  statCard(ws1, 10, 11, 5, 6, medCount,         'MEDIUM RISK',   C.riskMed);
  statCard(ws1, 10, 11, 7, 8, lowCount,         'LOW RISK',      C.riskLow);

  sectionRow(ws1, 13, 1, C1, '  KPI SUMMARY TABLE');
  tableHeader(ws1, 14, ['Metric', 'Value', 'Computed As (Short)', '', '', '', '', 'Full Description']);
  ws1.mergeCells(14, 3, 14, 7);
  sc(ws1.getCell(14, 3), { bg: C.navyDark, fg: C.white, bold: true, size: 10, align: 'center' });

  const kpiRows = [
    { m: 'Total Users',       v: totalUsers,         short: `Direct DB count = ${totalUsers}`,                                         desc: 'Total registered user accounts in the system', fg: C.indigo },
    { m: 'Active Users (%)',  v: `${pctActive}%`,    short: `${activeCount} ÷ ${totalUsers} × 100 = ${pctActive}%`,                    desc: 'Users who completed onboarding', fg: C.green },
    { m: 'Average Income',    v: pesoFmt(avgInc),    short: `Σ(incomes) ÷ ${totalUsers} = ${pesoFmt(avgInc)}`,                        desc: 'Mean gross income across all users', fg: C.blue },
    { m: 'Average Expenses',  v: pesoFmt(avgExp),    short: `Σ(expenses) ÷ ${totalUsers} = ${pesoFmt(avgExp)}`,                       desc: 'Mean total expenses across all users', fg: C.red },
    { m: 'Average Savings',   v: pesoFmt(avgSav),    short: `${pesoFmt(avgInc)} − ${pesoFmt(avgExp)} = ${pesoFmt(avgSav)}`,           desc: 'Avg Income minus Avg Expenses', fg: C.amber },
    { m: 'High Risk Users',   v: highCount,          short: `Ratio > 80%  →  count = ${highCount}`,                                   desc: 'Users with dangerously high expense ratio', fg: C.riskHigh },
    { m: 'Medium Risk Users', v: medCount,           short: `Ratio 50–80%  →  count = ${medCount}`,                                   desc: 'Users with moderate expense ratio', fg: C.riskMed },
    { m: 'Low Risk Users',    v: lowCount,           short: `Ratio < 50%  →  count = ${lowCount}`,                                    desc: 'Users with healthy expense ratio', fg: C.riskLow },
    { m: 'Total Risk Users',  v: riskUsers.length,   short: `${highCount} + ${medCount} + ${lowCount} = ${riskUsers.length}`,         desc: 'High + Medium + Low risk users', fg: C.indigo },
    { m: 'Report Period',     v: trendFilter.toUpperCase(), short: `Filter: ${trendFilter.toUpperCase()}`,                             desc: 'Grouping applied to trend data', fg: C.indigo },
    { m: 'Generated At',      v: `${dateStr} ${timeStr}`,    short: `Export timestamp`,                                               desc: 'Date and time this file was exported', fg: C.slate600 },
  ];

  kpiRows.forEach(({ m, v, short, desc, fg }, idx) => {
    const r     = 15 + idx;
    const rowBg = idx % 2 === 0 ? C.white : C.offWhite;
    ws1.getRow(r).height = 26;

    ws1.getCell(r, 1).value = m; ws1.getCell(r, 1).border = btm();
    sc(ws1.getCell(r, 1), { bg: rowBg, fg: C.navyDark, bold: true, size: 10 });

    ws1.getCell(r, 2).value = v; ws1.getCell(r, 2).border = btm();
    sc(ws1.getCell(r, 2), { bg: rowBg, fg, bold: true, size: 11, align: 'center' });

    ws1.mergeCells(r, 3, r, 7);
    ws1.getCell(r, 3).value = short; ws1.getCell(r, 3).border = btm();
    sc(ws1.getCell(r, 3), { bg: rowBg, fg: C.teal, size: 10, italic: true });

    ws1.getCell(r, 8).value = desc; ws1.getCell(r, 8).border = btm();
    sc(ws1.getCell(r, 8), { bg: rowBg, fg: C.slate600, size: 10 });
  });

  const leg1Start = 15 + kpiRows.length + 1;
  const leg1End = buildLegend(ws1, leg1Start, C1, [
    { metric: 'Active Users (%)',  formula: 'Active ÷ Total × 100',             steps: `Step 1: Count active users (onboarding = true) = ${activeCount}\nStep 2: Divide by total users = ${activeCount} ÷ ${totalUsers}\nStep 3: Multiply by 100 = ${pctActive}%`,  result: `${pctActive}%` },
    { metric: 'Average Income',    formula: 'Σ(All Incomes) ÷ Total Users',     steps: `Step 1: Sum all user income records\nStep 2: Divide by total users = ${totalUsers}\nStep 3: Result = ${pesoFmt(avgInc)} per user`,                                               result: pesoFmt(avgInc) },
    { metric: 'Average Expenses',  formula: 'Σ(All Expenses) ÷ Total Users',    steps: `Step 1: Sum all user expense records\nStep 2: Divide by total users = ${totalUsers}\nStep 3: Result = ${pesoFmt(avgExp)} per user`,                                              result: pesoFmt(avgExp) },
    { metric: 'Average Savings',   formula: 'Avg Income − Avg Expenses',        steps: `Step 1: Take Avg Income = ${pesoFmt(avgInc)}\nStep 2: Subtract Avg Expenses = ${pesoFmt(avgExp)}\nStep 3: ${pesoFmt(avgInc)} − ${pesoFmt(avgExp)} = ${pesoFmt(avgSav)}`,        result: pesoFmt(avgSav) },
    { metric: 'Risk Classification',formula: 'Expense Ratio = Exp ÷ Inc × 100',steps: `HIGH RISK:   Expense Ratio > 80%  (expenses heavily exceed income)\nMEDIUM RISK: Expense Ratio 50%–80%  (expenses high relative to income)\nLOW RISK:    Expense Ratio < 50%  (expenses within healthy range)`,  result: 'Ratio threshold rules' },
    { metric: 'Total Risk Users',  formula: 'High + Medium + Low',              steps: `Step 1: Count High risk = ${highCount}\nStep 2: Count Medium risk = ${medCount}\nStep 3: Count Low risk = ${lowCount}\nStep 4: ${highCount} + ${medCount} + ${lowCount} = ${riskUsers.length}`, result: `${riskUsers.length} users` },
  ]);

  footer(ws1, leg1End + 2, C1);

  /* ════════════════════════════════════════════════════════════
     SHEET 2 — FINANCIAL TREND
  ════════════════════════════════════════════════════════════ */
  const ws2 = wb.addWorksheet('Financial Trend', {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 9 }],
  });
  ws2.columns = [
    { width: 7  }, { width: 20 }, { width: 24 },
    { width: 24 }, { width: 24 }, { width: 24 },
    { width: 18 }, { width: 40 },
  ];
  const C2 = 8;

  buildHeader(ws2, wb, C2,
    'FINANCIAL TREND DATA',
    `Period: ${trendFilter.toUpperCase()}  ·  Column H = short formula per row  ·  See FORMULA LEGEND below for full breakdown`
  );

  sectionRow(ws2, 7, 1, C2, `  FINANCIAL TREND TABLE  —  ${trendFilter.toUpperCase()}  ·  ${trendData.length} record(s)`);
  tableHeader(ws2, 8, ['#', 'Period', 'Avg. Income (₱)', 'Avg. Expenses (₱)', 'Avg. Savings (₱)', 'Net (Inc − Exp)', 'Status', 'Formula (Short)']);

  if (trendData.length === 0) {
    ws2.getRow(9).height = 34;
    ws2.mergeCells(9, 1, 9, C2);
    ws2.getCell(9, 1).value = 'No trend data. Switch the period filter on the dashboard and re-export.';
    ws2.getCell(9, 1).border = thin(C.amber);
    sc(ws2.getCell(9, 1), { bg: C.amberBg, fg: C.amber, size: 10, italic: true, wrap: true, align: 'center' });
  } else {
    trendData.forEach((row, idx) => {
      const r     = 9 + idx;
      const rowBg = idx % 2 === 0 ? C.white : C.offWhite;
      ws2.getRow(r).height = 50; // tall so 2-line wrap is fully visible

      const inc   = num(row.avg_income);
      const exp   = num(row.avg_expenses);
      const sav   = num(row.avg_savings);
      const net   = inc - exp;
      const label = row.label ?? `Period ${idx + 1}`;

      const setNum = (col, val, fg) => {
        const cell = ws2.getCell(r, col);
        cell.value = val; cell.numFmt = '"₱"#,##0.00'; cell.border = btm();
        sc(cell, { bg: rowBg, fg, bold: true, size: 10, align: 'right', valign: 'middle' });
      };

      ws2.getCell(r, 1).value = idx + 1; ws2.getCell(r, 1).border = btm();
      sc(ws2.getCell(r, 1), { bg: rowBg, fg: C.slate400, size: 10, align: 'center', valign: 'middle' });

      ws2.getCell(r, 2).value = label; ws2.getCell(r, 2).border = btm();
      sc(ws2.getCell(r, 2), { bg: rowBg, fg: C.navyDark, bold: true, size: 10, valign: 'middle' });

      setNum(3, inc, C.green);
      setNum(4, exp, C.red);
      setNum(5, sav, C.indigo);

      const cNet = ws2.getCell(r, 6);
      cNet.value = net; cNet.numFmt = '"₱"#,##0.00'; cNet.border = btm();
      sc(cNet, { bg: net >= 0 ? C.greenBg : C.redBg, fg: net >= 0 ? C.green : C.red, bold: true, size: 10, align: 'right', valign: 'middle' });

      const status = net > 0 ? '▲ Surplus' : net < 0 ? '▼ Deficit' : '● Break Even';
      const sFg    = net > 0 ? C.green : net < 0 ? C.red : C.amber;
      const sBg    = net > 0 ? C.greenBg : net < 0 ? C.redBg : C.amberBg;
      ws2.getCell(r, 7).value = status; ws2.getCell(r, 7).border = btm();
      sc(ws2.getCell(r, 7), { bg: sBg, fg: sFg, bold: true, size: 9, align: 'center', valign: 'middle' });

      // SHORT formula — 2 lines max, fully visible at height 50
      ws2.getCell(r, 8).value = fmtNet(inc, exp);
      ws2.getCell(r, 8).border = btm();
      sc(ws2.getCell(r, 8), { bg: rowBg, fg: C.teal, size: 9, italic: true, wrap: true, valign: 'top' });
    });

    // Period average row
    const avgRow = 9 + trendData.length;
    ws2.getRow(avgRow).height = 28;
    const avgOf = (k) => { const v = trendData.map(r => num(r[k])); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; };
    const pAvgInc = avgOf('avg_income'); const pAvgExp = avgOf('avg_expenses');
    const pAvgSav = avgOf('avg_savings'); const pAvgNet = pAvgInc - pAvgExp;

    ws2.mergeCells(avgRow, 1, avgRow, 2);
    ws2.getCell(avgRow, 1).value = `PERIOD AVERAGE  (${trendData.length} periods)`;
    sc(ws2.getCell(avgRow, 1), { bg: C.navyDark, fg: C.white, bold: true, size: 10, align: 'right' });

    [[3, pAvgInc], [4, pAvgExp], [5, pAvgSav], [6, pAvgNet]].forEach(([ci, val]) => {
      const cell = ws2.getCell(avgRow, ci);
      cell.value = val; cell.numFmt = '"₱"#,##0.00';
      sc(cell, { bg: C.navyDark, fg: C.white, bold: true, size: 10, align: 'right' });
    });
    ws2.getCell(avgRow, 7).value = '—';
    sc(ws2.getCell(avgRow, 7), { bg: C.navyDark, fg: C.white, size: 10, align: 'center' });
    ws2.getCell(avgRow, 8).value = `Avg across ${trendData.length} ${trendFilter} periods`;
    sc(ws2.getCell(avgRow, 8), { bg: C.navyDark, fg: C.white, size: 9, italic: true });

    const leg2Start = avgRow + 1;
    const leg2End = buildLegend(ws2, leg2Start, C2, [
      { metric: 'Avg. Income (Col C)',    formula: 'Σ(user incomes) ÷ user count',      steps: `Step 1: Sum all user income records for this period\nStep 2: Divide by number of active users\nStep 3: Result = average income per user for that period`,       result: 'Shown in green' },
      { metric: 'Avg. Expenses (Col D)',  formula: 'Σ(user expenses) ÷ user count',     steps: `Step 1: Sum all user expense records for this period\nStep 2: Divide by number of active users\nStep 3: Result = average expenses per user for that period`,    result: 'Shown in red' },
      { metric: 'Avg. Savings (Col E)',   formula: 'Σ(user savings) ÷ user count',      steps: `Step 1: Sum (income − expenses) for each user\nStep 2: Divide by number of active users\nStep 3: Result = average net savings per user for that period`,      result: 'Shown in indigo' },
      { metric: 'Net (Col F)',            formula: 'Avg Income − Avg Expenses',         steps: `Step 1: Take Avg Income for this period (Col C)\nStep 2: Subtract Avg Expenses for this period (Col D)\nStep 3: Positive = Surplus (income > expenses)  |  Negative = Deficit`,         result: 'Green = surplus  Red = deficit' },
      { metric: 'Period Average (last row)', formula: 'Σ(all period values) ÷ period count', steps: `Step 1: Sum all rows in each column (C, D, E, F)\nStep 2: Divide by total number of periods (${trendData.length})\nStep 3: Shows overall trend average across the full date range`, result: `${trendData.length} periods averaged` },
    ]);

    footer(ws2, leg2End + 2, C2);
  }

  /* ════════════════════════════════════════════════════════════
     SHEET 3 — CATEGORY SPENDING
  ════════════════════════════════════════════════════════════ */
  const ws3 = wb.addWorksheet('Category Spending', {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 8 }],
  });
  ws3.columns = [
    { width: 6  }, { width: 28 }, { width: 24 },
    { width: 14 }, { width: 16 }, { width: 38 },
  ];
  const C3 = 6;

  buildHeader(ws3, wb, C3,
    'TOP SPENDING CATEGORIES',
    `Column F = short formula  ·  See FORMULA LEGEND below for full breakdown`
  );

  sectionRow(ws3, 7, 1, C3, '  CATEGORY SPENDING BREAKDOWN');
  tableHeader(ws3, 8, ['#', 'Category', 'Total Spent (₱)', 'Share (%)', 'Status', 'Formula (Short)']);

  const top6      = (Array.isArray(categories) ? categories : []).slice(0, 6);
  const top6Total = top6.reduce((s, c) => s + num(c.total_spent), 0);

  top6.forEach((cat, idx) => {
    const r      = 9 + idx;
    const rowBg  = idx % 2 === 0 ? C.white : C.offWhite;
    const spent  = num(cat.total_spent);
    const share  = sharePct(spent, top6Total);
    const status = share > 30 ? 'Over Limit' : share > 20 ? 'Caution' : 'Normal';
    const sFg    = status === 'Over Limit' ? C.red   : status === 'Caution' ? C.amber : C.green;
    const sBg    = status === 'Over Limit' ? C.redBg : status === 'Caution' ? C.amberBg : C.greenBg;

    ws3.getRow(r).height = 50;

    ws3.getCell(r, 1).value = idx + 1; ws3.getCell(r, 1).border = btm();
    sc(ws3.getCell(r, 1), { bg: rowBg, fg: C.slate400, size: 10, align: 'center', valign: 'middle' });

    ws3.getCell(r, 2).value = cat.category ?? '—'; ws3.getCell(r, 2).border = btm();
    sc(ws3.getCell(r, 2), { bg: rowBg, fg: C.navyDark, bold: true, size: 10, valign: 'middle' });

    const cS = ws3.getCell(r, 3);
    cS.value = spent; cS.numFmt = '"₱"#,##0.00'; cS.border = btm();
    sc(cS, { bg: rowBg, fg: C.navyDark, size: 10, align: 'right', valign: 'middle' });

    const cSh = ws3.getCell(r, 4);
    cSh.value = share; cSh.numFmt = '0"%"'; cSh.border = btm();
    sc(cSh, { bg: rowBg, fg: C.indigo, bold: true, size: 10, align: 'center', valign: 'middle' });

    ws3.getCell(r, 5).value = status; ws3.getCell(r, 5).border = btm();
    sc(ws3.getCell(r, 5), { bg: sBg, fg: sFg, bold: true, size: 9, align: 'center', valign: 'middle' });

    // SHORT formula — 2 lines
    ws3.getCell(r, 6).value = fmtShare(spent, top6Total, cat.category ?? 'Cat');
    ws3.getCell(r, 6).border = btm();
    sc(ws3.getCell(r, 6), { bg: rowBg, fg: C.teal, size: 9, italic: true, wrap: true, valign: 'top' });
  });

  // Totals row
  const catTot = 9 + top6.length;
  ws3.getRow(catTot).height = 28;
  ws3.mergeCells(catTot, 1, catTot, 2);
  ws3.getCell(catTot, 1).value = 'TOTAL (Top 6)';
  sc(ws3.getCell(catTot, 1), { bg: C.navyDark, fg: C.white, bold: true, size: 10, align: 'right' });
  const cT = ws3.getCell(catTot, 3);
  cT.value = top6Total; cT.numFmt = '"₱"#,##0.00';
  sc(cT, { bg: C.navyDark, fg: C.white, bold: true, size: 11, align: 'right' });
  ws3.getCell(catTot, 4).value = '100%';
  sc(ws3.getCell(catTot, 4), { bg: C.navyDark, fg: C.white, bold: true, size: 11, align: 'center' });
  ws3.mergeCells(catTot, 5, catTot, C3);
  ws3.getCell(catTot, 5).value = `Σ Top-6 = ${top6.map(c => pesoFmt(num(c.total_spent))).join(' + ')} = ${pesoFmt(top6Total)}`;
  sc(ws3.getCell(catTot, 5), { bg: C.navyDark, fg: C.white, size: 9, italic: true, wrap: true });

  const leg3Start = catTot + 1;
  const leg3End = buildLegend(ws3, leg3Start, C3, [
    { metric: 'Share % (Col D)',    formula: 'Category Spend ÷ Total × 100',   steps: `Step 1: Take total spent for this category (Col C)\nStep 2: Divide by sum of all top-6 categories = ${pesoFmt(top6Total)}\nStep 3: Multiply by 100 to get percentage`,  result: 'Higher % = larger budget portion' },
    { metric: 'Status (Col E)',     formula: 'Share % threshold check',        steps: `OVER LIMIT:  Share > 30%  →  Exceeds recommended max per category\nCAUTION:     Share 20%–30%  →  Approaching limit, monitor spending\nNORMAL:      Share < 20%  →  Within healthy acceptable range`,         result: 'Colour-coded badge' },
    { metric: 'TOTAL row',         formula: 'Σ(all category totals)',          steps: `Step 1: Add up spent amounts for all 6 categories\nStep 2: ${top6.map(c => pesoFmt(num(c.total_spent))).join(' + ')}\nStep 3: = ${pesoFmt(top6Total)}`,                  result: pesoFmt(top6Total) },
  ]);
  footer(ws3, leg3End + 2, C3);

  /* ════════════════════════════════════════════════════════════
     SHEET 4 — SAVINGS DISTRIBUTION
  ════════════════════════════════════════════════════════════ */
  const ws4 = wb.addWorksheet('Savings Distribution', { views: [{ showGridLines: false }] });
  ws4.columns = [
    { width: 24 }, { width: 16 }, { width: 14 }, { width: 38 }, { width: 12 },
  ];
  const C4 = 5;

  buildHeader(ws4, wb, C4,
    'SAVINGS DISTRIBUTION',
    `Column D = short formula  ·  See FORMULA LEGEND below for full breakdown`
  );

  sectionRow(ws4, 7, 1, C4, '  SAVER CLASSIFICATION BREAKDOWN');
  tableHeader(ws4, 8, ['Classification', 'Count', 'Share (%)', 'Formula (Short)', '']);

  const savFg = { 'Negative Saver': C.red, 'Low Saver': C.amber, 'Mid Saver': C.indigo, 'High Saver': C.green };
  const savBg = { 'Negative Saver': C.redBg, 'Low Saver': C.amberBg, 'Mid Saver': C.indigoBg, 'High Saver': C.greenBg };
  const savData  = Array.isArray(savingsDist) ? savingsDist : [];
  const savTotal = savData.reduce((s, d) => s + (d.value || 0), 0);

  savData.forEach((d, idx) => {
    const r     = 9 + idx;
    const rowBg = idx % 2 === 0 ? C.white : C.offWhite;
    const fg    = savFg[d.name] ?? C.indigo;
    const bg    = savBg[d.name] ?? C.indigoBg;
    const share = sharePct(d.value, savTotal);
    ws4.getRow(r).height = 50;

    ws4.getCell(r, 1).value = d.name; ws4.getCell(r, 1).border = btm();
    sc(ws4.getCell(r, 1), { bg, fg, bold: true, size: 10, valign: 'middle' });

    ws4.getCell(r, 2).value = d.value ?? 0; ws4.getCell(r, 2).border = btm();
    sc(ws4.getCell(r, 2), { bg: rowBg, fg, bold: true, size: 13, align: 'center', valign: 'middle' });

    const cSh = ws4.getCell(r, 3);
    cSh.value = share; cSh.numFmt = '0"%"'; cSh.border = btm();
    sc(cSh, { bg: rowBg, fg, bold: true, size: 10, align: 'center', valign: 'middle' });

    // SHORT formula — 2 lines
    ws4.getCell(r, 4).value = fmtSavRate(d.name);
    ws4.getCell(r, 4).border = btm();
    sc(ws4.getCell(r, 4), { bg: rowBg, fg: C.teal, size: 9, italic: true, wrap: true, valign: 'top' });
  });

  const leg4Start = 9 + savData.length + 1;
  const leg4End = buildLegend(ws4, leg4Start, C4, [
    { metric: 'Savings Rate formula',   formula: '(Income − Expenses) ÷ Income × 100',   steps: `Step 1: Calculate net savings = User Income − User Expenses\nStep 2: Divide by User Income\nStep 3: Multiply by 100 to get savings rate %`,    result: 'Percentage of income saved' },
    { metric: 'Negative Saver',         formula: 'Savings Rate < 0%',                    steps: `Condition: (Income − Expenses) ÷ Income × 100  <  0%\nMeaning: Expenses are GREATER than income\nAction needed: Immediate financial counselling`,    result: 'Expenses > Income' },
    { metric: 'Low Saver',              formula: 'Savings Rate 0% – 10%',                steps: `Condition: 0% ≤ Savings Rate < 10%\nMeaning: Saving less than 10% of income\nRecommendation: Reduce discretionary spending`,                        result: '0% to 10% saved' },
    { metric: 'Mid Saver',              formula: 'Savings Rate 10% – 30%',               steps: `Condition: 10% ≤ Savings Rate < 30%\nMeaning: Saving between 10–30% of income\nRecommendation: Continue good habits, aim for 30%`,                  result: '10% to 30% saved' },
    { metric: 'High Saver',             formula: 'Savings Rate > 30%',                   steps: `Condition: Savings Rate ≥ 30%\nMeaning: Saving more than 30% of income\nRecommendation: Excellent — consider investing surplus`,                    result: '> 30% saved' },
    { metric: 'Share % (Col C)',        formula: 'Count ÷ Total Users × 100',            steps: `Step 1: Take count for this classification\nStep 2: Divide by total users = ${savTotal}\nStep 3: Multiply by 100 to get % of user base`,             result: 'Distribution percentage' },
  ]);
  footer(ws4, leg4End + 2, C4);

  /* ════════════════════════════════════════════════════════════
     SHEET 5 — RISK USERS
  ════════════════════════════════════════════════════════════ */
  const ws5 = wb.addWorksheet('Risk Users', {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 10 }],
  });
  ws5.columns = [
    { width: 6  }, { width: 28 }, { width: 30 },
    { width: 22 }, { width: 22 }, { width: 16 },
    { width: 14 }, { width: 38 },
  ];
  const C5 = 8;

  buildHeader(ws5, wb, C5,
    'RISK USERS REPORT',
    `Column H = short formula per user  ·  See FORMULA LEGEND below for full breakdown`
  );

  ws5.getRow(7).height = 40; ws5.getRow(8).height = 20; ws5.getRow(9).height = 8;
  statCard(ws5, 7, 8, 1, 3, highCount, 'HIGH RISK',   C.riskHigh);
  statCard(ws5, 7, 8, 4, 5, medCount,  'MEDIUM RISK', C.riskMed);
  statCard(ws5, 7, 8, 6, 8, lowCount,  'LOW RISK',    C.riskLow);

  tableHeader(ws5, 10, [
    '#', 'Full Name', 'Email',
    'Total Income (₱)', 'Total Expenses (₱)', 'Exp. Ratio', 'Risk Level',
    'Formula (Short)',
  ]);

  riskUsers.forEach((u, idx) => {
    const r     = 11 + idx;
    const rl    = u.risk_level;
    const rFg   = rl === 'High' ? C.riskHigh : rl === 'Medium' ? C.riskMed : C.riskLow;
    const rBg   = rl === 'High' ? C.riskHighBg : rl === 'Medium' ? C.riskMedBg : C.riskLowBg;
    const rowBg = idx % 2 === 0 ? C.white : C.offWhite;
    const name  = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
    const uInc  = num(u.total_income);
    const uExp  = num(u.total_expenses);
    const ratio = num(u.expense_ratio);
    ws5.getRow(r).height = 50;

    ws5.getCell(r, 1).value = idx + 1; ws5.getCell(r, 1).border = btm();
    sc(ws5.getCell(r, 1), { bg: rowBg, fg: C.slate400, size: 10, align: 'center', valign: 'middle' });

    ws5.getCell(r, 2).value = name.toUpperCase(); ws5.getCell(r, 2).border = btm();
    sc(ws5.getCell(r, 2), { bg: rowBg, fg: C.navyDark, bold: true, size: 10, valign: 'middle' });

    ws5.getCell(r, 3).value = u.email ?? '—'; ws5.getCell(r, 3).border = btm();
    sc(ws5.getCell(r, 3), { bg: rowBg, fg: C.slate600, size: 10, valign: 'middle' });

    const cInc = ws5.getCell(r, 4);
    cInc.value = uInc; cInc.numFmt = '"₱"#,##0.00'; cInc.border = btm();
    sc(cInc, { bg: rowBg, fg: C.green, size: 10, align: 'right', valign: 'middle' });

    const cExp = ws5.getCell(r, 5);
    cExp.value = uExp; cExp.numFmt = '"₱"#,##0.00'; cExp.border = btm();
    sc(cExp, { bg: rowBg, fg: C.red, size: 10, align: 'right', valign: 'middle' });

    ws5.getCell(r, 6).value = `${ratio.toFixed(1)}%`; ws5.getCell(r, 6).border = btm();
    sc(ws5.getCell(r, 6), { bg: rowBg, fg: rFg, bold: true, size: 10, align: 'center', valign: 'middle' });

    ws5.getCell(r, 7).value = rl ?? '—'; ws5.getCell(r, 7).border = btm();
    sc(ws5.getCell(r, 7), { bg: rBg, fg: rFg, bold: true, size: 9, align: 'center', valign: 'middle' });

    // SHORT formula — 2 lines max, fully visible at height 50
    ws5.getCell(r, 8).value = fmtRatio(uExp, uInc);
    ws5.getCell(r, 8).border = btm();
    sc(ws5.getCell(r, 8), { bg: rowBg, fg: C.teal, size: 9, italic: true, wrap: true, valign: 'top' });
  });

  const leg5Start = 11 + riskUsers.length + 1;
  const leg5End = buildLegend(ws5, leg5Start, C5, [
    { metric: 'Expense Ratio (Col F)',  formula: 'Total Expenses ÷ Total Income × 100',  steps: `Step 1: Take user's Total Expenses (Col E)\nStep 2: Divide by user's Total Income (Col D)\nStep 3: Multiply by 100 to get expense ratio %`,   result: 'Higher % = more financial risk' },
    { metric: 'HIGH RISK classification',   formula: 'Expense Ratio > 80%',              steps: `Condition: Expense Ratio is GREATER THAN 80%\nMeaning: User spends more than 80 centavos of every peso earned\nAction: Immediate financial intervention recommended`, result: 'Ratio > 80%' },
    { metric: 'MEDIUM RISK classification', formula: 'Expense Ratio 50% – 80%',          steps: `Condition: Expense Ratio is between 50% and 80%\nMeaning: User spends more than half their income\nRecommendation: Monitor closely, reduce non-essential expenses`,    result: 'Ratio 50%–80%' },
    { metric: 'LOW RISK classification',    formula: 'Expense Ratio < 50%',              steps: `Condition: Expense Ratio is LESS THAN 50%\nMeaning: User spends less than half their income\nResult: Healthy financial behaviour, continue good habits`,           result: 'Ratio < 50%' },
  ]);
  footer(ws5, leg5End + 2, C5);

  /* ── WRITE & DOWNLOAD ─────────────────────────────────── */
  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer, `PESO_Dashboard_Analytics_${now.toISOString().split('T')[0]}.xlsx`);
};