/* ══════════════════════════════════════════════════════════════
   auditPDF.js — generates Audit Trail PDF
   Called by: AuditPanel.jsx
══════════════════════════════════════════════════════════════ */
import {
  loadjsPDF, getLogoBase64,
  PT, PW, PH, ML, MR, CW_PDF,
  makeCur, ptx, palpha, pguard,
  drawPDFHeader, stampPDFFooters,
  drawPDFStatCards, drawPDFSectionBar, drawPDFTableHeader,
} from './pdfHelpers';

export const generateAuditPDF = async (logs, logoSrc) => {
  await loadjsPDF();
  const logoB64    = await getLogoBase64(logoSrc);
  const { jsPDF }  = window.jspdf;
  const doc        = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const cur        = makeCur();

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  cur.y = drawPDFHeader(doc, {
    title:    'Audit Trail Report',
    subtitle: `${logs.length} admin actions  ·  Exported ${dateStr} at ${timeStr}`,
    dateStr, timeStr, logoB64,
  });

  // ── Stat cards ──
  const countOf      = re => logs.filter(l => re.test((l.action || '').toLowerCase())).length;
  const uniqueAdmins = new Set(logs.map(l => l.admin_name).filter(Boolean)).size;
  drawPDFStatCards(doc, cur, [
    { label: 'Total Events',  value: logs.length,                               color: PT.indigo },
    { label: 'Create / Add',  value: countOf(/(creat|add)/),                    color: PT.green  },
    { label: 'Edit / Update', value: countOf(/(edit|updat|chang|pass|avatar)/), color: PT.amber  },
    { label: 'Delete',        value: countOf(/(delet|remov|clear)/),            color: PT.red    },
    { label: 'Admins',        value: uniqueAdmins,                              color: PT.blue   },
  ]);

  // ── Action distribution bar ──
  if (logs.length > 0) {
    ptx(doc, 'bold', 7.5, PT.textMid);
    doc.text('ACTION DISTRIBUTION', ML, cur.y - 2);
    const segs = [
      { color: PT.green, n: countOf(/(creat|add)/) },
      { color: PT.amber, n: countOf(/(edit|updat|chang|pass|avatar)/) },
      { color: PT.red,   n: countOf(/(delet|remov|clear)/) },
    ];
    const bh = 10;
    doc.setFillColor(...PT.lineGray);
    doc.roundedRect(ML, cur.y, CW_PDF, bh, 3, 3, 'F');
    let bx = ML;
    segs.forEach(s => {
      if (!s.n) return;
      const sw = (s.n / logs.length) * CW_PDF;
      doc.setFillColor(...s.color);
      doc.rect(bx, cur.y, sw, bh, 'F');
      bx += sw;
    });
    doc.setDrawColor(...PT.lineGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, cur.y, CW_PDF, bh, 3, 3, 'S');
    cur.adv(bh + 8);

    let lx = ML;
    [{ label: 'Create', color: PT.green }, { label: 'Edit', color: PT.amber }, { label: 'Delete', color: PT.red }].forEach(({ label, color }) => {
      doc.setFillColor(...color);
      doc.circle(lx + 4, cur.y + 4, 3.5, 'F');
      ptx(doc, 'normal', 7.5, PT.textMuted);
      doc.text(label, lx + 11, cur.y + 7.5);
      lx += 72;
    });
    cur.adv(18);
  }
  cur.adv(4);

  drawPDFSectionBar(doc, cur, `Audit Log — ${logs.length} records`);

  // ── Column layout ──
  const cols = (() => {
    const defs = [
      { label: 'Tag',       w: 58  },
      { label: 'Action',    w: 178 },
      { label: 'Admin',     w: 102 },
      { label: 'Role',      w: 136 },
      { label: 'Date/Time', w: 49  },
    ];
    let x = ML;
    return defs.map(d => { const out = { ...d, x }; x += d.w; return out; });
  })();

  const drawTHdr = () => drawPDFTableHeader(doc, cur, cols);
  drawTHdr();

  // ── Tag helper ──
  const getTag = (action = '') => {
    const a = action.toLowerCase();
    if (/(delet|remov|clear)/.test(a))            return { tag: 'DELETE', bg: PT.redLt,    txt: PT.red    };
    if (/(creat|add)/.test(a))                    return { tag: 'CREATE', bg: PT.greenLt,  txt: PT.green  };
    if (/(edit|updat|chang|pass|avatar)/.test(a)) return { tag: 'EDIT',   bg: PT.amberLt,  txt: PT.amber  };
    if (/(login|logout)/.test(a))                 return { tag: 'AUTH',   bg: PT.indigoLt, txt: PT.indigo };
    return                                               { tag: 'LOG',    bg: PT.offWhite, txt: PT.textMuted };
  };

  // ── Rows ──
  logs.forEach((entry, idx) => {
    const rowH = 22;
    if (pguard(doc, cur, rowH)) drawTHdr();
    const ry            = cur.y;
    const { tag, bg, txt } = getTag(entry.action);

    doc.setFillColor(...(idx % 2 === 0 ? PT.bgStripe : PT.white));
    doc.rect(ML, ry, CW_PDF, rowH, 'F');
    doc.setFillColor(...txt);
    doc.rect(ML, ry, 2.5, rowH, 'F');

    // Tag pill
    doc.setFillColor(...bg);
    doc.roundedRect(cols[0].x + 4, ry + 4.5, 49, 13, 3, 3, 'F');
    ptx(doc, 'bold', 6.5, txt);
    doc.text(tag, cols[0].x + 28.5, ry + 14, { align: 'center' });

    // Action
    ptx(doc, 'normal', 7.5, PT.textDark);
    doc.text(String(entry.action || '—').substring(0, 39), cols[1].x + 5, ry + 14);

    // Admin name
    ptx(doc, 'bold', 7.5, PT.blue);
    doc.text(String(entry.admin_name || '—').substring(0, 17), cols[2].x + 5, ry + 14);

    // Role pill
    const role    = String(entry.admin_role || '—');
    const isMain  = role === 'Main Admin';
    const roleBg  = isMain ? PT.indigoLt : PT.offWhite;
    const roleTxt = isMain ? PT.indigo   : PT.textMuted;
    doc.setFillColor(...roleBg);
    doc.roundedRect(cols[3].x + 5, ry + 5, 80, 13, 3, 3, 'F');
    doc.setDrawColor(...roleTxt);
    doc.setLineWidth(0.3);
    doc.roundedRect(cols[3].x + 5, ry + 5, 80, 13, 3, 3, 'S');
    ptx(doc, 'bold', 6.5, roleTxt);
    doc.text(role.substring(0, 14), cols[3].x + 45, ry + 14, { align: 'center' });

    // Timestamp
    if (entry.created_at) {
      const ts = new Date(entry.created_at);
      ptx(doc, 'normal', 6, PT.textMuted);
      doc.text(ts.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }), cols[4].x + 4, ry + 9.5);
      doc.text(ts.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }), cols[4].x + 4, ry + 18.5);
    }

    doc.setDrawColor(...PT.lineGray);
    doc.setLineWidth(0.25);
    doc.line(ML, ry + rowH, ML + CW_PDF, ry + rowH);
    cur.adv(rowH);
  });

  stampPDFFooters(doc, 'Audit Trail', doc.internal.getNumberOfPages());
  doc.save(`PESO_AI_AuditTrail_${now.toISOString().slice(0, 10)}.pdf`);
};