export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, image } = req.body;

    try {
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

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 4000,
                messages: [{ role: 'user', content }]
            })
        });

        const data = await response.json();

        if (data.content && data.content[0]?.text) {
            return res.status(200).json({ result: data.content[0].text });
        } else {
            return res.status(500).json({ error: data.error?.message || 'Bilinmeyen hata' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
