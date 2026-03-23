import pool from '../../config/db.js';

import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const formatAsciiDate = (value, options) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString('en-PH', options);
};

const printableText = (value, fallback = '-') => {
    if (value == null) return fallback;
    return String(value)
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || fallback;
};

const titleCase = (value, fallback = 'Uncategorized') => {
    const safe = printableText(value, fallback).toLowerCase();
    return safe
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatMoney = (value) => {
    const num = Number.parseFloat(value || 0);
    const parts = Math.abs(num).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

const buildMailer = () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
};

const exportTransactionsPDF = async (req, res) => {
    const { userId } = req.params;
    const { period = '30d', startDate, endDate } = req.query;

    let dateFilter;
    const params = [userId];

    switch (period) {
        case '7d':
            dateFilter = `transaction_date >= CURRENT_DATE - INTERVAL '7 days'`;
            break;
        case '30d':
            dateFilter = `transaction_date >= CURRENT_DATE - INTERVAL '30 days'`;
            break;
        case '60d':
            dateFilter = `transaction_date >= CURRENT_DATE - INTERVAL '60 days'`;
            break;
        case 'custom':
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate and endDate required for custom period.',
                    code: 'EXPORT_INVALID_RANGE',
                });
            }
            dateFilter = `transaction_date BETWEEN $2 AND $3`;
            params.push(startDate, endDate);
            break;
        default:
            return res.status(400).json({
                success: false,
                message: 'Invalid period.',
                code: 'EXPORT_INVALID_PERIOD',
            });
    }

    try {
        const [profileResult, txResult] = await Promise.all([
            pool.query(
                `SELECT u.first_name, u.last_name, u.email,
                        p.monthly_expenses, p.monthly_income
                 FROM users u
                 LEFT JOIN user_profiles p ON u.id = p.user_id
                 WHERE u.id = $1`,
                [userId]
            ),
            pool.query(
                `SELECT id, amount, category, description,
                        transaction_type, transaction_date
                 FROM transactions
                 WHERE user_id = $1 AND ${dateFilter}
                 ORDER BY transaction_date DESC`,
                params
            ),
        ]);

        const profile = profileResult.rows[0];
        const txs = txResult.rows.map((tx) => ({
            ...tx,
            category: printableText(tx.category, 'Uncategorized'),
            description: printableText(tx.description, '-'),
            transaction_type: printableText(tx.transaction_type, 'expense').toLowerCase() === 'income'
                ? 'income'
                : 'expense',
        }));

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
                code: 'EXPORT_USER_NOT_FOUND',
            });
        }

        const mailer = buildMailer();
        if (!mailer) {
            return res.status(500).json({
                success: false,
                message: 'Email delivery is not configured on the server.',
                code: 'EXPORT_EMAIL_NOT_CONFIGURED',
            });
        }

        const periodLabel = period === 'custom'
            ? `${startDate} to ${endDate}`
            : period === '7d'
                ? 'Last 7 Days'
                : period === '30d'
                    ? 'Last 30 Days'
                    : 'Last 60 Days';

        const chunks = [];
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        doc.on('data', (chunk) => chunks.push(chunk));

        await new Promise((resolve) => {
            doc.on('end', resolve);

            const pageW = 595 - 80;
            const safeFirstName = printableText(profile.first_name, 'User');
            const safeLastName = printableText(profile.last_name, '');
            const safeEmail = printableText(profile.email, 'No email');

            doc.rect(0, 0, 595, 110).fill('#2196F3');

            doc.fillColor('#FFFFFF')
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('PESO AI - Transaction Report', 40, 24, { width: pageW });

            doc.fontSize(10)
                .font('Helvetica')
                .text(`Period: ${periodLabel}`, 40, 52)
                .text(
                    `Generated: ${formatAsciiDate(new Date(), { dateStyle: 'long' })}  |  ${txs.length} transaction${txs.length !== 1 ? 's' : ''}`,
                    40,
                    67
                )
                .text(`Account: ${safeFirstName} ${safeLastName}   |   Email: ${safeEmail}`, 40, 82);

            const cardTop = 125;
            doc.roundedRect(40, cardTop, pageW, 90, 8).fillAndStroke('#F8F9FA', '#E0E0E0');

            doc.fillColor('#1A1A1A')
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('Summary', 56, cardTop + 12);

            doc.moveTo(56, cardTop + 28)
                .lineTo(40 + pageW - 16, cardTop + 28)
                .stroke('#E0E0E0');

            const budget = Number.parseFloat(profile.monthly_income || 0);
            const expenses = txs
                .filter((tx) => tx.transaction_type === 'expense')
                .reduce((sum, tx) => sum + Number.parseFloat(tx.amount || 0), 0);
            const remaining = budget - expenses;

            const col1 = 56;
            const col2 = 220;
            const col3 = 380;
            const rowY = cardTop + 38;

            doc.fillColor('#757575').fontSize(9).font('Helvetica').text('Budget', col1, rowY);
            doc.fillColor('#4CAF50').fontSize(13).font('Helvetica-Bold').text(`+ PHP ${formatMoney(budget)}`, col1, rowY + 13);

            doc.fillColor('#757575').fontSize(9).font('Helvetica').text('Total Expenses', col2, rowY);
            doc.fillColor('#F44336').fontSize(13).font('Helvetica-Bold').text(`- PHP ${formatMoney(expenses)}`, col2, rowY + 13);

            doc.fillColor('#757575').fontSize(9).font('Helvetica').text('Remaining', col3, rowY);
            doc.fillColor(remaining >= 0 ? '#2196F3' : '#F44336')
                .fontSize(13)
                .font('Helvetica-Bold')
                .text(`PHP ${formatMoney(remaining)}`, col3, rowY + 13);

            const catColors = ['#2196F3', '#4CAF50', '#F44336', '#FF9800', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];
            const catMap = {};
            txs.filter((tx) => tx.transaction_type === 'expense').forEach((tx) => {
                if (!catMap[tx.category]) catMap[tx.category] = 0;
                catMap[tx.category] += Number.parseFloat(tx.amount || 0);
            });
            const breakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

            const breakdownTop = cardTop + 105;
            doc.roundedRect(40, breakdownTop, pageW, 28 + breakdown.length * 20, 8)
                .fillAndStroke('#F8F9FA', '#E0E0E0');

            doc.fillColor('#1A1A1A')
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('Category Breakdown', 56, breakdownTop + 10);

            doc.moveTo(56, breakdownTop + 26)
                .lineTo(40 + pageW - 16, breakdownTop + 26)
                .stroke('#E0E0E0');

            breakdown.forEach(([cat, total], index) => {
                const y = breakdownTop + 34 + index * 20;
                const color = catColors[index % catColors.length];

                doc.circle(62, y + 5, 4).fill(color);
                doc.fillColor(color)
                    .fontSize(10)
                    .font('Helvetica-Bold')
                    .text(titleCase(cat), 72, y, { continued: true, width: 280 });

                doc.fillColor('#1A1A1A')
                    .font('Helvetica')
                    .text(`PHP ${formatMoney(total)}`, { align: 'right', width: pageW - 48 });
            });

            const tableTop = breakdownTop + 38 + breakdown.length * 20 + 16;
            doc.roundedRect(40, tableTop, pageW, 24, 4).fill('#2196F3');
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

            const columns = { date: 48, type: 130, cat: 195, desc: 300, amount: 460 };
            doc.text('Date', columns.date, tableTop + 7, { width: 80 });
            doc.text('Type', columns.type, tableTop + 7, { width: 60 });
            doc.text('Category', columns.cat, tableTop + 7, { width: 100 });
            doc.text('Description', columns.desc, tableTop + 7, { width: 155 });
            doc.text('Amount (PHP)', columns.amount, tableTop + 7, { width: 80, align: 'right' });

            let rowTop = tableTop + 26;
            txs.forEach((tx, index) => {
                if (rowTop > 760) {
                    doc.addPage();
                    rowTop = 40;
                }

                const bg = index % 2 === 0 ? '#FFFFFF' : '#F5F8FF';
                doc.rect(40, rowTop, pageW, 18).fill(bg);

                const dateStr = tx.transaction_date
                    ? formatAsciiDate(tx.transaction_date, { dateStyle: 'medium' })
                    : '-';
                const isExpense = tx.transaction_type === 'expense';
                const catIdx = breakdown.findIndex(([cat]) => cat === tx.category);
                const catColor = catIdx >= 0 ? catColors[catIdx % catColors.length] : '#607D8B';

                doc.fillColor('#1A1A1A')
                    .fontSize(8)
                    .font('Helvetica')
                    .text(dateStr, columns.date, rowTop + 4, { width: 80 })
                    .text(titleCase(tx.transaction_type, 'Expense'), columns.type, rowTop + 4, { width: 60 });

                doc.fillColor(catColor)
                    .font('Helvetica-Bold')
                    .text(titleCase(tx.category), columns.cat, rowTop + 4, { width: 100 });

                doc.fillColor('#1A1A1A')
                    .font('Helvetica')
                    .text(printableText(tx.description), columns.desc, rowTop + 4, { width: 155 });

                doc.fillColor(isExpense ? '#F44336' : '#4CAF50')
                    .font('Helvetica-Bold')
                    .text(`PHP ${formatMoney(tx.amount)}`, columns.amount, rowTop + 4, { width: 80, align: 'right' });

                rowTop += 18;
            });

            rowTop += 16;
            doc.moveTo(40, rowTop).lineTo(40 + pageW, rowTop).stroke('#E0E0E0');
            doc.fillColor('#9E9E9E')
                .fontSize(8)
                .font('Helvetica')
                .text('PESO AI  |  Confidential', 40, rowTop + 8, { align: 'center', width: pageW });

            doc.end();
        });

        const pdfBuffer = Buffer.concat(chunks);
        const filename = `peso_ai_report_${period}_${Date.now()}.pdf`;
        const gmailUser = process.env.GMAIL_USER;

        await mailer.sendMail({
            from: `"PESO AI" <${gmailUser}>`,
            to: profile.email,
            subject: `PESO AI - Transaction Report (${periodLabel})`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;">
                    <h2 style="color:#2196F3;margin-bottom:4px;">PESO AI</h2>
                    <h3 style="margin-top:0;">Transaction Report</h3>
                    <p>Hi ${printableText(profile.first_name, 'User')},</p>
                    <p>Your transaction report for <strong>${periodLabel}</strong> is attached.</p>
                    <p style="color:#888;font-size:12px;">This report was generated automatically by PESO AI.</p>
                </div>
            `,
            attachments: [{
                filename,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }],
        });

        return res.json({
            success: true,
            message: `Report sent to ${profile.email}`,
        });
    } catch (err) {
        console.error('[Export] exportTransactionsPDF:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate and send report.',
            code: 'EXPORT_PDF_FAILED',
        });
    }
};

export { exportTransactionsPDF };
