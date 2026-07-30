const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// ترويسات تحاكي متصفح Chrome حقيقي
const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

// مسار MangaTime مع طباعة HTML للتشخيص
app.get('/api/mangatime/list', async (req, res) => {
    const page = req.query.page || 1;
    const url = `https://mangatime.org/browse?page=${page}`;

    try {
        const { data } = await axios.get(url, {
            headers: browserHeaders,
            timeout: 30000,
        });

        // طباعة تشخيصية لمشاهدة HTML المستلم
        console.log('=== MangaTime HTML preview ===');
        console.log(data.substring(0, 500));
        console.log('=== End of preview ===');

        const $ = cheerio.load(data);
        const mangas = [];

        $('a[data-cds-variant="search-result/simple-cover"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const title = $(el).find('h3').text().trim();
            const img = $(el).find('img').attr('src') || '';
            const chapterText = $(el).find('p.text-persimmon-glow').text().trim();
            const chapters = parseInt(chapterText.match(/\d+/)?.[0] || '0');

            if (href && title) {
                mangas.push({
                    id: href,
                    title: title,
                    cover: img,
                    chapters: chapters
                });
            }
        });

        console.log(`MangaTime: found ${mangas.length} mangas on page ${page}`);
        res.json({ success: true, mangas });
    } catch (err) {
        console.error('MangaTime error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});