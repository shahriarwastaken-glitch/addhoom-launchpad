import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Bengali number converter
const toBn = (n: number) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

// Wrap text helper
const wrapText = (doc: jsPDF, text: string, maxWidth: number): string[] => {
  return doc.splitTextToSize(text, maxWidth) as string[];
};

// Draw footer on every page except cover
const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(255, 81, 0);
  doc.setLineWidth(0.5);
  doc.line(15, h - 15, w - 15, h - 15);
  doc.setFontSize(8);
  doc.setTextColor(92, 88, 83);
  doc.text('AdDhoom — বাংলাদেশের AI মার্কেটিং প্ল্যাটফর্ম', 15, h - 8);
  doc.text(`পৃষ্ঠা ${toBn(pageNum)} / ${toBn(totalPages)}`, w - 15, h - 8, { align: 'right' });
};

// Draw section header bar
const drawHeaderBar = (doc: jsPDF, text: string, y: number): number => {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 81, 0);
  doc.rect(0, y, w, 12, 'F');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(text, 15, y + 8.5);
  return y + 18;
};

export async function exportCompetitorPDF(
  analysis: any,
  workspaceName: string
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const ai = analysis.ai_analysis || analysis.analysis || {};
  const ads = analysis.ads_found || [];
  const counterStrategies = analysis.counter_strategies || ai.counter_strategies || [];
  const competitorName = analysis.competitor_name || 'Unknown';
  const competitorUrl = analysis.competitor_url || '';
  const createdAt = analysis.created_at ? new Date(analysis.created_at) : new Date();
  const dateStr = createdAt.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });

  // ═══════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════
  doc.setFillColor(255, 81, 0);
  doc.rect(0, 0, w, h, 'F');

  // Logo
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('AdDhoom', 20, 30);
  doc.setFontSize(12);
  doc.text('বিজ্ঞাপন দাও। ধুম তোলো।', 20, 42);

  // White box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 70, 180, 120, 4, 4, 'F');

  // Inside white box
  doc.setFontSize(22);
  doc.setTextColor(28, 27, 26);
  doc.text('প্রতিযোগী বিশ্লেষণ রিপোর্ট', w / 2, 95, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(255, 81, 0);
  doc.text(competitorName, w / 2, 115, { align: 'center' });

  if (competitorUrl) {
    doc.setFontSize(10);
    doc.setTextColor(92, 88, 83);
    doc.text(competitorUrl, w / 2, 127, { align: 'center' });
  }

  // Orange divider
  doc.setDrawColor(255, 81, 0);
  doc.setLineWidth(0.8);
  doc.line(60, 140, w - 60, 140);

  doc.setFontSize(10);
  doc.setTextColor(92, 88, 83);
  doc.text(`বিশ্লেষণের তারিখ: ${dateStr}`, w / 2, 152, { align: 'center' });

  // Bottom
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`প্রস্তুত করেছে: ${workspaceName}`, 20, h - 30);
  doc.setFontSize(9);
  doc.text('AdDhoom AI দ্বারা বিশ্লেষিত', 20, h - 22);

  // ═══════════════════════════════════════
  // PAGE 2 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════
  doc.addPage();
  let y = drawHeaderBar(doc, 'কার্যনির্বাহী সারসংক্ষেপ', 10);

  // Strategy type
  doc.setFontSize(11);
  doc.setTextColor(92, 88, 83);
  doc.text('স্ট্র্যাটেজি ওভারভিউ', 15, y + 2);
  y += 8;

  if (ai.strategy_type) {
    doc.setFontSize(16);
    doc.setTextColor(255, 81, 0);
    doc.text(ai.strategy_type, 15, y + 2);
    y += 12;
  }

  // Strengths
  if (ai.strengths?.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(28, 27, 26);
    doc.text('তারা যা ভালো করে', 15, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(92, 88, 83);
    for (const s of ai.strengths.slice(0, 6)) {
      doc.setFillColor(0, 185, 107);
      doc.circle(19, y - 1, 1.5, 'F');
      const lines = wrapText(doc, s, 160);
      doc.text(lines, 25, y);
      y += lines.length * 4.5 + 2;
      if (y > h - 30) { doc.addPage(); y = 15; }
    }
    y += 4;
  }

  // Weaknesses
  if (ai.weaknesses?.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(28, 27, 26);
    doc.text('তাদের দুর্বলতা', 15, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(92, 88, 83);
    for (const w2 of ai.weaknesses.slice(0, 6)) {
      doc.setFillColor(220, 38, 38);
      doc.circle(19, y - 1, 1.5, 'F');
      const lines = wrapText(doc, w2, 160);
      doc.text(lines, 25, y);
      y += lines.length * 4.5 + 2;
      if (y > h - 30) { doc.addPage(); y = 15; }
    }
    y += 4;
  }

  // Top patterns
  if (ai.top_patterns?.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(28, 27, 26);
    doc.text('শীর্ষ প্যাটার্নসমূহ', 15, y);
    y += 8;
    for (let i = 0; i < Math.min(ai.top_patterns.length, 5); i++) {
      // Gray box with orange left border
      doc.setFillColor(245, 243, 240);
      doc.rect(15, y - 4, 180, 12, 'F');
      doc.setFillColor(255, 81, 0);
      doc.rect(15, y - 4, 2, 12, 'F');
      doc.setFontSize(9);
      doc.setTextColor(28, 27, 26);
      const lines = wrapText(doc, `${toBn(i + 1)}. ${ai.top_patterns[i]}`, 170);
      doc.text(lines, 22, y + 1);
      y += 14;
      if (y > h - 30) { doc.addPage(); y = 15; }
    }
    y += 4;
  }

  // Top opportunity
  if (counterStrategies.length > 0) {
    if (y > h - 50) { doc.addPage(); y = 15; }
    doc.setFontSize(11);
    doc.setTextColor(28, 27, 26);
    doc.text('সবচেয়ে গুরুত্বপূর্ণ সুযোগ', 15, y);
    y += 6;
    // Highlighted box
    doc.setFillColor(255, 245, 232);
    doc.setDrawColor(255, 81, 0);
    doc.setLineWidth(0.5);
    const oppText = wrapText(doc, counterStrategies[0].description || '', 165);
    const boxH = 14 + oppText.length * 4.5;
    doc.roundedRect(15, y - 2, 180, boxH, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(28, 27, 26);
    doc.text(counterStrategies[0].title || '', 20, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(92, 88, 83);
    doc.text(oppText, 20, y + 12);
    y += boxH + 6;
  }

  // ═══════════════════════════════════════
  // PAGE 3 — ADS ANALYSIS
  // ═══════════════════════════════════════
  doc.addPage();
  y = drawHeaderBar(doc, `বিজ্ঞাপন বিশ্লেষণ — ${toBn(ads.length)}টি সক্রিয় বিজ্ঞাপন পাওয়া গেছে`, 10);

  if (ads.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(92, 88, 83);
    doc.text('কোনো সক্রিয় বিজ্ঞাপন পাওয়া যায়নি।', w / 2, y + 20, { align: 'center' });
  } else {
    const maxAds = Math.min(ads.length, 10);
    for (let i = 0; i < maxAds; i += 2) {
      if (y > h - 60) { doc.addPage(); y = 15; }
      for (let j = 0; j < 2 && i + j < maxAds; j++) {
        const ad = ads[i + j];
        const xOff = j === 0 ? 15 : 105;
        const cardW = 85;

        // Card bg
        doc.setFillColor(248, 247, 245);
        doc.roundedRect(xOff, y, cardW, 45, 2, 2, 'F');

        // Page name pill
        doc.setFillColor(255, 81, 0);
        doc.roundedRect(xOff + 3, y + 3, 40, 6, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text((ad.page_name || '').slice(0, 20), xOff + 5, y + 7);

        // Headline
        if (ad.headline) {
          doc.setFontSize(9);
          doc.setTextColor(28, 27, 26);
          const hLines = wrapText(doc, ad.headline, cardW - 8);
          doc.text(hLines.slice(0, 2), xOff + 4, y + 15);
        }

        // Body
        if (ad.body) {
          doc.setFontSize(8);
          doc.setTextColor(92, 88, 83);
          const bLines = wrapText(doc, ad.body, cardW - 8);
          doc.text(bLines.slice(0, 3), xOff + 4, y + 25);
        }

        // Date
        if (ad.running_since) {
          doc.setFontSize(7);
          doc.setTextColor(155, 148, 140);
          doc.text(`চলছে: ${new Date(ad.running_since).toLocaleDateString('bn-BD')}`, xOff + 4, y + 42);
        }
      }
      y += 50;
    }

    if (ads.length > 10) {
      doc.setFontSize(9);
      doc.setTextColor(255, 81, 0);
      doc.text(`আরো ${toBn(ads.length - 10)} টি বিজ্ঞাপন AdDhoom অ্যাপে দেখুন`, w / 2, y + 5, { align: 'center' });
    }
  }

  // ═══════════════════════════════════════
  // PAGE 4 — COUNTER STRATEGIES
  // ═══════════════════════════════════════
  if (counterStrategies.length > 0) {
    doc.addPage();
    y = drawHeaderBar(doc, 'আপনার কাউন্টার স্ট্র্যাটেজি', 10);

    const bnNums = ['০১', '০২', '০৩', '০৪', '০৫'];
    for (let i = 0; i < Math.min(counterStrategies.length, 3); i++) {
      const cs = counterStrategies[i];
      if (y > h - 70) { doc.addPage(); y = 15; }

      // Card with orange left border
      const descLines = wrapText(doc, cs.description || '', 160);
      const hookLines = wrapText(doc, cs.example_hook || '', 150);
      const cardH = 30 + descLines.length * 4.5 + hookLines.length * 4.5 + 10;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, y, 180, cardH, 2, 2, 'F');
      doc.setFillColor(255, 81, 0);
      doc.rect(15, y, 3, cardH, 'F');

      // Watermark number
      doc.setFontSize(36);
      doc.setTextColor(255, 224, 204);
      doc.text(bnNums[i] || toBn(i + 1), 170, y + 18);

      // Title
      doc.setFontSize(13);
      doc.setTextColor(28, 27, 26);
      doc.text(cs.title || '', 22, y + 10);

      // Description
      doc.setFontSize(10);
      doc.setTextColor(92, 88, 83);
      doc.text(descLines, 22, y + 18);

      // Example hook box
      const hookY = y + 20 + descLines.length * 4.5;
      doc.setFillColor(255, 245, 232);
      doc.setDrawColor(255, 81, 0);
      doc.setLineWidth(0.3);
      const hookBoxH = 8 + hookLines.length * 4.5;
      doc.roundedRect(22, hookY, 165, hookBoxH, 1, 1, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(255, 81, 0);
      doc.text('উদাহরণ হুক:', 26, hookY + 5);
      doc.setFontSize(10);
      doc.setTextColor(92, 88, 83);
      doc.text(hookLines, 26, hookY + 10);

      y += cardH + 8;
    }
  }

  // ═══════════════════════════════════════
  // PAGE 5 — RECOMMENDATION & BRANDING
  // ═══════════════════════════════════════
  doc.addPage();
  y = drawHeaderBar(doc, 'পরিশেষ সুপারিশ', 10);

  // Large recommendation box
  if (counterStrategies.length > 0) {
    doc.setFillColor(255, 81, 0);
    doc.roundedRect(15, y, 180, 60, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('আপনার সবচেয়ে বড় সুযোগ:', 25, y + 12);
    doc.setFontSize(16);
    doc.text(counterStrategies[0].title || '', 25, y + 24);
    doc.setFontSize(10);
    const recLines = wrapText(doc, counterStrategies[0].description || '', 155);
    doc.text(recLines.slice(0, 4), 25, y + 34);
    y += 70;
  }

  // CTA section
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(28, 27, 26);
  doc.text('AdDhoom দিয়ে এখনই শুরু করুন', w / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(92, 88, 83);
  doc.text('এই কাউন্টার স্ট্র্যাটেজি ব্যবহার করে আজই বিজ্ঞাপন তৈরি করুন', w / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(255, 81, 0);
  doc.text('www.addhoom.com', w / 2, y, { align: 'center' });

  // Back cover footer
  y = h - 40;
  doc.setFontSize(9);
  doc.setTextColor(92, 88, 83);
  doc.text('এই রিপোর্টটি AdDhoom AI দ্বারা তৈরি করা হয়েছে', w / 2, y, { align: 'center' });
  y += 6;
  doc.text(`রিপোর্ট তৈরির সময়: ${new Date().toLocaleString('bn-BD')}`, w / 2, y, { align: 'center' });
  y += 6;
  doc.text('AdDhoom — বাংলাদেশের #১ AI মার্কেটিং প্ল্যাটফর্ম', w / 2, y, { align: 'center' });

  // ═══════════════════════════════════════
  // Add footers to all pages except cover
  // ═══════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, totalPages - 1);
  }

  // Save
  const safeName = competitorName.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_');
  const dateFile = new Date().toISOString().split('T')[0];
  doc.save(`AdDhoom-Competitor-${safeName}-${dateFile}.pdf`);
}
