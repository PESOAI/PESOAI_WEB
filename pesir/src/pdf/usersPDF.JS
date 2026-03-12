/* ══════════════════════════════════════════════════════════════
   usersPDF.js — generates User Management PDF
   Updated: location + last_active_at restored
   Called by: UserManagement.jsx
══════════════════════════════════════════════════════════════ */
import {
  loadjsPDF, getLogoBase64,
  PT, PW, PH, ML, MR, CW_PDF,
  makeCur, ptx, palpha, pguard,
  drawPDFHeader, stampPDFFooters,
  drawPDFStatCards, drawPDFSectionBar, drawPDFTableHeader,
} from './pdfHelpers';

export const generateUsersPDF = async (users, filters, logoSrc) => {
  await loadjsPDF();
  const logoB64   = await getLogoBase64(logoSrc);
  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const cur       = makeCur();

  const now      = new Date();
  const dateStr  = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr  = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const active   = users.filter(u => u.onboarding_completed === true).length;
  const inactive = users.filter(u => u.onboarding_completed !== true).length;
  const actRate  = users.length ? Math.round((active / users.length) * 100) : 0;

  const filterLine = [
    filters.search && `Search: "${filters.search}"`,
    filters.status && filters.status !== 'All' && `Status: ${filters.status}`,
  ].filter(Boolean).join('  ·  ') || 'All users';

  const fullName = u => [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';

  cur.y = drawPDFHeader(doc, {
    title:    'User Access Control Report',
    subtitle: `${users.length} users  ·  ${filterLine}  ·  ${dateStr}`,
    dateStr, timeStr, logoB64,
  });

  // ── Stat cards ──
  drawPDFStatCards(doc, cur, [
    { label: 'Total Users', value: users.length, color: PT.blue  },
    { label: 'Active',      value: active,        color: PT.green },
    { label: 'Inactive',    value: inactive,      color: PT.red   },
    { label: 'Active Rate', value: actRate + '%', color: PT.teal  },
  ]);

  // ── Status distribution bar ──
  if (users.length > 0) {
    ptx(doc, 'bold', 7.5, PT.textMid);
    doc.text('ACCOUNT STATUS DISTRIBUTION', ML, cur.y - 2);
    const bh = 11, actW = (active / users.length) * CW_PDF;
    doc.setFillColor(...PT.lineGray);
    doc.roundedRect(ML, cur.y, CW_PDF, bh, 4, 4, 'F');
    if (actW > 0) {
      doc.setFillColor(...PT.green);
      doc.roundedRect(ML, cur.y, actW, bh, 4, 4, 'F');
      if (actW < CW_PDF - 4) doc.rect(ML + actW - 4, cur.y, 4, bh, 'F');
    }
    if (actW < CW_PDF) {
      doc.setFillColor(...PT.red);
      doc.roundedRect(ML + actW, cur.y, CW_PDF - actW, bh, 4, 4, 'F');
      if (actW > 4) doc.rect(ML + actW, cur.y, 4, bh, 'F');
    }
    ptx(doc, 'bold', 7, PT.white);
    if (actW > 55)           doc.text(`${active} Active`,    ML + actW / 2,                   cur.y + 8, { align: 'center' });
    if (CW_PDF - actW > 60) doc.text(`${inactive} Inactive`, ML + actW + (CW_PDF - actW) / 2, cur.y + 8, { align: 'center' });
    doc.setDrawColor(...PT.lineGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, cur.y, CW_PDF, bh, 4, 4, 'S');
    cur.adv(bh + 22);
  }

  drawPDFSectionBar(doc, cur, `User Records — ${users.length} users`);

  // ── Column layout (restored: Location + Last Active) ──
  const cols = (() => {
    const defs = [
      { label: '#',           w: 22  },
      { label: 'Full Name',   w: 110 },
      { label: 'Email',       w: 130 },
      { label: 'Location',    w: 70  },
      { label: 'Joined',      w: 55  },
      { label: 'Last Active', w: 62  },
      { label: 'Status',      w: 41  },
    ];
    let x = ML;
    return defs.map(d => { const out = { ...d, x }; x += d.w; return out; });
  })();

  const drawTHdr = () => drawPDFTableHeader(doc, cur, cols);
  drawTHdr();

  const fmtDate = d => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  users.forEach((user, idx) => {
    const rowH  = 22;
    if (pguard(doc, cur, rowH)) drawTHdr();
    const ry    = cur.y;
    const isAct = user.onboarding_completed === true;
    const name  = fullName(user);

    doc.setFillColor(...(idx % 2 === 0 ? PT.bgStripe : PT.white));
    doc.rect(ML, ry, CW_PDF, rowH, 'F');
    doc.setFillColor(...(isAct ? PT.green : PT.red));
    doc.rect(ML, ry, 2.5, rowH, 'F');

    // Row number
    ptx(doc, 'normal', 7, PT.textMuted);
    doc.text(String(idx + 1), cols[0].x + 6, ry + 14.5);

    // Avatar circle
    doc.setFillColor(...(isAct ? PT.greenLt : PT.redLt));
    doc.circle(cols[1].x + 10, ry + 11, 7.5, 'F');
    doc.setDrawColor(...(isAct ? PT.green : PT.red));
    doc.setLineWidth(0.5);
    doc.circle(cols[1].x + 10, ry + 11, 7.5, 'S');
    ptx(doc, 'bold', 7, isAct ? PT.green : PT.red);
    doc.text((user.first_name || '?').charAt(0).toUpperCase(), cols[1].x + 10, ry + 14.5, { align: 'center' });

    // Name
    ptx(doc, 'bold', 8, PT.textDark);
    doc.text(name.substring(0, 18), cols[1].x + 22, ry + 14.5);

    // Email
    ptx(doc, 'normal', 7.5, PT.textMid);
    doc.text(String(user.email || '—').substring(0, 24), cols[2].x + 5, ry + 14.5);

    // Location
    ptx(doc, 'normal', 7.5, PT.textMuted);
    doc.text(String(user.location || '—').substring(0, 12), cols[3].x + 5, ry + 14.5);

    // Joined
    doc.text(fmtDate(user.created_at), cols[4].x + 5, ry + 14.5);

    // Last Active
    doc.text(fmtDate(user.last_active_at), cols[5].x + 5, ry + 14.5);

    // Status pill
    doc.setFillColor(...(isAct ? PT.greenLt : PT.redLt));
    doc.roundedRect(cols[6].x + 2, ry + 5, 35, 12, 3, 3, 'F');
    ptx(doc, 'bold', 6.5, isAct ? PT.green : PT.red);
    doc.text(isAct ? 'ACTIVE' : 'INACT.', cols[6].x + 19.5, ry + 14, { align: 'center' });

    doc.setDrawColor(...PT.lineGray);
    doc.setLineWidth(0.25);
    doc.line(ML, ry + rowH, ML + CW_PDF, ry + rowH);
    cur.adv(rowH);
  });

  stampPDFFooters(doc, 'User Management', doc.internal.getNumberOfPages());
  doc.save(`PESO_AI_Users_${now.toISOString().slice(0, 10)}.pdf`);
};