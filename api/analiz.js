function markdownToHtml(text) {
    if (!text) return '';
    return text
        // Başlıklar
        .replace(/^### (.+)$/gm, '<h3 style="color:#0d2d6b;font-size:14px;margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="color:#0d2d6b;font-size:16px;margin:20px 0 10px;border-bottom:2px solid #e8edf5;padding-bottom:6px;">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="color:#0d2d6b;font-size:18px;margin:0 0 12px;">$1</h1>')
        // Kalın
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // İtalik
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Blockquote
        .replace(/^> (.+)$/gm, '<div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px 14px;margin:8px 0;border-radius:0 6px 6px 0;font-size:13px;">$1</div>')
        // Yatay çizgi
        .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e8edf5;margin:16px 0;">')
        // Tablo satırları
        .replace(/^\|(.+)\|$/gm, (match, content) => {
            const cells = content.split('|').map(c => c.trim());
            if (cells.every(c => /^[-:]+$/.test(c))) return ''; // separator satırını atla
            const isHeader = content.includes('---');
            const tag = 'td';
            return '<tr>' + cells.map(c => `<${tag} style="padding:8px 12px;border:1px solid #e8edf5;font-size:13px;">${c}</${tag}>`).join('') + '</tr>';
        })
        // Tablo wrap
        .replace(/((<tr>.+<\/tr>\n?)+)/g, '<table style="width:100%;border-collapse:collapse;margin:10px 0;">$1</table>')
        // Code block
        .replace(/```[\s\S]*?```/g, match => {
            const code = match.replace(/```\w*\n?/, '').replace(/```/, '');
            return `<pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap;">${code}</pre>`;
        })
        // Satır sonları
        .replace(/\n/g, '<br>');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, image, hastaOzeti } = req.body;

    try {
        const content = [];

        if (image) {
            if (image.startsWith('data:application/pdf')) {
                content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: image.replace('data:application/pdf;base64,', '') } });
            } else {
                const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
                content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: image.replace(/^data:image\/\w+;base64,/, '') } });
            }
        }
        content.push({ type: 'text', text: prompt });

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content }] })
        });

        const claudeData = await claudeRes.json();
        const aiRapor = claudeData.content?.[0]?.text || 'AI raporu oluşturulamadı.';

        // Hasta bilgilerini de HTML'e çevir
        const hastaHtml = (hastaOzeti || '')
            .replace(/⚠️/g, '<span style="color:#c0152a;">⚠️</span>')
            .replace(/🚨/g, '<span style="color:#c0152a;">🚨</span>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
<div style="max-width:720px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0d2d6b,#1a4a9e);padding:28px 32px;">
    <div style="color:white;font-size:20px;font-weight:700;font-family:Georgia,serif;">Op. Dr. Tunç Koç</div>
    <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px;letter-spacing:1px;">İSTANBUL OMURGA SAĞLIĞI MERKEZİ · YENİ HASTA BAŞVURUSU</div>
    <div style="margin-top:12px;background:rgba(255,255,255,0.15);border-radius:6px;padding:8px 14px;display:inline-block;">
      <span style="color:white;font-size:13px;font-weight:600;">${new Date().toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
    </div>
  </div>

  <!-- AI RAPOR -->
  <div style="padding:28px 32px;border-bottom:2px solid #f0f4f8;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <div style="width:4px;height:24px;background:#0d2d6b;border-radius:2px;"></div>
      <span style="font-size:13px;font-weight:700;color:#0d2d6b;text-transform:uppercase;letter-spacing:1px;">🤖 AI Klinik Değerlendirme</span>
    </div>
    <div style="font-size:14px;line-height:1.8;color:#1a1a1a;">
      ${markdownToHtml(aiRapor)}
    </div>
  </div>

  <!-- HASTA BİLGİLERİ -->
  <div style="padding:24px 32px;background:#f8fafc;border-bottom:2px solid #f0f4f8;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
      <div style="width:4px;height:24px;background:#0d2d6b;border-radius:2px;"></div>
      <span style="font-size:13px;font-weight:700;color:#0d2d6b;text-transform:uppercase;letter-spacing:1px;">📋 Hasta Özeti</span>
    </div>
    <div style="font-size:13px;line-height:2;color:#333;">${hastaHtml}</div>
  </div>

  <!-- FOOTER -->
  <div style="padding:16px 32px;background:#f0f4f8;">
    <p style="margin:0;font-size:11px;color:#999;text-align:center;">Bu e-posta Op. Dr. Tunç Koç Kliniği Hasta Bilgi Formu sistemi tarafından otomatik oluşturulmuştur.</p>
  </div>

</div>
</body>
</html>`;

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
            body: JSON.stringify({
                from: 'Hasta Formu <onboarding@resend.dev>',
                to: ['dr.tunckoc@gmail.com'],
                subject: `🏥 Yeni Hasta Başvurusu — ${new Date().toLocaleDateString('tr-TR')}`,
                html: emailHtml
            })
        });

        return res.status(200).json({ result: aiRapor });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
