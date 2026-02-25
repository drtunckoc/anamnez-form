export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, image, hastaOzeti } = req.body;

    try {
        // 1. Claude API - AI raporu oluştur
        const content = [];

        if (image) {
            if (image.startsWith('data:application/pdf')) {
                content.push({
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: image.replace('data:application/pdf;base64,', '')
                    }
                });
            } else {
                const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: image.replace(/^data:image\/\w+;base64,/, '')
                    }
                });
            }
        }

        content.push({ type: 'text', text: prompt });

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 2000,
                messages: [{ role: 'user', content }]
            })
        });

        const claudeData = await claudeRes.json();
        const aiRapor = claudeData.content?.[0]?.text || 'AI raporu oluşturulamadı.';

        // 2. Resend API - E-posta gönder
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
  .header { background: #0d2d6b; color: white; padding: 24px 32px; border-radius: 12px 12px 0 0; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
  .section { padding: 20px 32px; border-bottom: 1px solid #e8edf5; }
  .section h2 { color: #0d2d6b; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; }
  .ai-rapor { background: #f0f4ff; border-left: 4px solid #0d2d6b; padding: 16px 20px; border-radius: 0 8px 8px 0; white-space: pre-wrap; font-size: 13px; line-height: 1.8; }
  .bilgi-satir { font-size: 13px; line-height: 2; }
  .kirmizi { color: #c0152a; font-weight: bold; }
  .footer { background: #f8fafc; padding: 16px 32px; border-radius: 0 0 12px 12px; font-size: 11px; color: #888; }
</style>
</head>
<body>
<div class="header">
  <h1>Op. Dr. Tunç Koç — Yeni Hasta Başvurusu</h1>
  <p>İstanbul Omurga Sağlığı Merkezi · Hasta Bilgi Formu</p>
</div>

<div class="section">
  <h2>🤖 AI Klinik Değerlendirme</h2>
  <div class="ai-rapor">${aiRapor.replace(/\n/g, '<br>')}</div>
</div>

<div class="section">
  <h2>📋 Hasta Bilgileri</h2>
  <div class="bilgi-satir">${(hastaOzeti || '').replace(/\n/g, '<br>')}</div>
</div>

<div class="footer">
  Bu e-posta Op. Dr. Tunç Koç Kliniği Hasta Bilgi Formu sistemi tarafından otomatik gönderilmiştir.
</div>
</body>
</html>`;

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Hasta Formu <onboarding@resend.dev>',
                to: ["dr.tunckoc@gmail.com"],
                subject: `Yeni Hasta Başvurusu — ${new Date().toLocaleDateString('tr-TR')}`,
                html: emailHtml
            })
        });

        return res.status(200).json({ result: aiRapor });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
