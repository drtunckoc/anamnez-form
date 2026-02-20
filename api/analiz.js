export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 800
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            return res.status(200).json({ result: data.choices[0].message.content });
        } else {
            return res.status(500).json({ error: data.error?.message || 'Bilinmeyen hata' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
