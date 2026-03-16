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

        // Claude'a HTML formatında rapor ürettir
        const htmlPrompt = prompt + `

ÖNEMLİ FORMAT TALİMATI:
Raporu düz metin veya markdown olarak DEĞİL, saf HTML olarak yaz.
Sadece <div id="rapor-icerik">...</div> etiketleri arasındaki içeriği üret.
Yanıtını düz HTML olarak ver. Markdown code block (triple backtick) kullanma.
Markdown kullanma (**, ##, | tablo vb. kullanma). Sadece HTML etiketleri kullan.
HTML çıktısında <br> kullanma. Paragraflar için <p> kullan.
Section başlıklarına emoji koyma, sadece metin yaz.
Her section arasında tek satır boşluk bırak.

KULLANILACAK HTML ELEMENTLERİ:
- Bölüm başlığı: <div class="bolum-baslik">ACİLİYET</div>
- Normal metin: <p class="metin">...</p>
- Önemli vurgu: <span class="vurgu">...</span>
- Kırmızı uyarı: <span class="kirmizi">...</span>
- Bilgi satırı: <div class="satir"><span class="etiket">Motor Defisit:</span><span class="deger">VAR</span></div>
- Madde listesi: <ul class="liste"><li>...</li></ul>
- Uyarı kutusu: <div class="uyari-kutusu">...</div>
- Bilgi kutusu: <div class="bilgi-kutusu">...</div>
- Bölüm ayracı: <hr class="ayrac">

Çıktın şu şekilde başlamalı:
<div id="rapor-icerik">
... (rapor içeriği) ...
</div>`;

        content.push({ type: 'text', text: htmlPrompt });

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content }] })
        });

        const claudeData = await claudeRes.json();
        const aiRapor = claudeData.content?.[0]?.text || 'AI raporu oluşturulamadı.';

    const hastaHtml = (hastaOzeti || '')
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => `<p style="margin:1px 0;font-size:13px;line-height:1.5;">${line}</p>`)
            .join('');

        const tarih = new Date().toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; background:#eef2f7; font-family:Arial, Helvetica, sans-serif; }
  .wrapper { max-width:700px; margin:24px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }

  /* HEADER */
  .header { background:linear-gradient(135deg, #0a2560 0%, #1a4a9e 100%); padding:28px 36px; }
  .header-isim { color:white; font-size:22px; font-weight:700; font-family:Georgia,serif; letter-spacing:0.3px; }
  .header-alt { color:rgba(255,255,255,0.7); font-size:11px; letter-spacing:2px; margin-top:4px; text-transform:uppercase; }
  .header-tarih { display:inline-block; background:rgba(255,255,255,0.15); border-radius:6px; padding:6px 14px; margin-top:14px; color:white; font-size:12px; font-weight:600; }

  /* BÖLÜM GENEL */
  .bolum { padding:22px 36px; border-bottom:1px solid #eef2f7; }
  .bolum:last-child { border-bottom:none; }
  .bolum-hasta { background:#f8fafc; }

  /* RAPOR İÇERİK STİLLERİ */
  #rapor-icerik .bolum-baslik {
    font-size:13px; font-weight:700; color:#0a2560;
    text-transform:uppercase; letter-spacing:1.5px;
    border-left:4px solid #0a2560; padding-left:10px;
    margin:14px 0 8px;
  }
  #rapor-icerik .bolum-baslik:first-child { margin-top:0; }
  #rapor-icerik .metin { font-size:14px; line-height:1.6; color:#2d3748; margin:4px 0; }
  #rapor-icerik .vurgu { font-weight:700; color:#0a2560; }
  #rapor-icerik .kirmizi { font-weight:700; color:#c0152a; }
  #rapor-icerik .satir {
    display:flex; align-items:flex-start; gap:8px;
    font-size:13px; line-height:1.6; padding:5px 0;
    border-bottom:1px solid #f0f4f8;
  }
  #rapor-icerik .satir:last-child { border-bottom:none; }
  #rapor-icerik .etiket { color:#64748b; min-width:200px; font-weight:600; flex-shrink:0; }
  #rapor-icerik .deger { color:#1e293b; }
  #rapor-icerik .liste { margin:8px 0 8px 4px; padding-left:18px; }
  #rapor-icerik .liste li { font-size:13px; line-height:1.8; color:#2d3748; }
  #rapor-icerik .uyari-kutusu {
    background:#fff0f0; border:1px solid #feb2b2; border-left:4px solid #c0152a;
    border-radius:0 8px 8px 0; padding:12px 16px; margin:10px 0;
    font-size:13px; line-height:1.7; color:#7b1a1a; font-weight:600;
  }
  #rapor-icerik .bilgi-kutusu {
    background:#f0f7ff; border:1px solid #bee3f8; border-left:4px solid #2b6cb0;
    border-radius:0 8px 8px 0; padding:12px 16px; margin:10px 0;
    font-size:13px; line-height:1.7; color:#1a365d;
  }
  #rapor-icerik .ayrac { border:none; border-top:1px solid #e2e8f0; margin:16px 0; }
  #rapor-icerik p { margin:6px 0; }

  /* HASTA ÖZETİ ALANI */
  .hasta-baslik { font-size:13px; font-weight:700; color:#0a2560; text-transform:uppercase; letter-spacing:1.5px; border-left:4px solid #64748b; padding-left:10px; margin-bottom:12px; }
  .alt-baslik { font-size:12px; font-weight:700; color:#0a2560; text-transform:uppercase; letter-spacing:1px; margin:14px 0 6px; padding:4px 0; border-bottom:2px solid #e2e8f0; }
  .satir { display:flex; align-items:flex-start; gap:8px; font-size:13px; line-height:1.6; padding:4px 0; border-bottom:1px solid #f8fafc; } .satir:empty { display:none; }
  .satir:last-child { border-bottom:none; }
  .etiket { color:#64748b; min-width:180px; font-weight:600; flex-shrink:0; font-size:12px; }
  .deger { color:#1e293b; font-size:13px; }
  .uyari-satir { background:#fff8f8; border-left:3px solid #c0152a; padding-left:6px; border-radius:0 4px 4px 0; }
  .hasta-metin { font-size:13px; line-height:2; color:#374151; }

  /* FOOTER */
  .footer { background:#f1f5f9; padding:14px 36px; text-align:center; }
  .footer p { margin:0; font-size:11px; color:#94a3b8; }
</style>
</head>
<body>
<div class="wrapper">

  <div class="header">
    <div class="header-isim">Op. Dr. Tunç Koç</div>
    <div class="header-alt">İstanbul Omurga Sağlığı Merkezi · Yeni Hasta Başvurusu</div>
    <div class="header-tarih">📅 ${tarih}</div>
  </div>

  <div class="bolum">
    ${aiRapor}
  </div>

  <div class="bolum bolum-hasta">
    <div class="hasta-baslik">📋 Hasta Özeti</div>
    <div class="hasta-metin">${hastaHtml}</div>
  </div>

  <div class="footer">
    <p>Bu e-posta Op. Dr. Tunç Koç Kliniği Hasta Bilgi Formu sistemi tarafından otomatik oluşturulmuştur.</p>
  </div>

</div>
</body>
</html>`;

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
            body: JSON.stringify({
                from: 'Hasta Formu <onboarding@resend.dev>',
                to: ['istanbulomurga@gmail.com'],
                subject: `🏥 Yeni Hasta Başvurusu — ${tarih}`,
                html: emailHtml
            })
        });

        try {
            const hastaData = req.body.rawData || {};
            await fetch('https://tunckocpanel.com/api/admin/patients/anamnez-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_phone: hastaData.tel || '',
                    patient_name: hastaData.adSoyad || '',
                    ai_rapor: aiRapor,
                    hasta_detay: (hastaOzeti || '')
                        .split('\n')
                        .filter(line => line.trim() !== '')
                        .map(line => `<p style="margin:1px 0;font-size:13px;line-height:1.5;">${line}</p>`)
                        .join(''),
                    raw_data: hastaData
                })
            });
        } catch (panelError) {
            console.error('Panel kayıt hatası:', panelError);
        }
        return res.status(200).json({ result: aiRapor });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
