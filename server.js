const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

// رابط موقع MangaTuk الأساسي
const BASE_URL_MANGATUK = 'https://mangatuk.com';
// رابط موقع MangaTime الأساسي
const BASE_URL_MANGATIME = 'https://mangatime.org';

// إعدادات الطلبات (محاكاة متصفح)
const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

// =====================
// 1. قائمة المانجا لـ MangaTuk (الأحدث / صفحة التصفح)
// =====================
app.get('/api/list', async (req, res) => {
    const page = req.query.page || 1;
    const url = `${BASE_URL_MANGATUK}/browse?page=${page}`;

    try {
        const { data } = await axios.get(url, { headers: requestHeaders });
        const $ = cheerio.load(data);
        const mangas = [];

        $('div.app-series-card-shell').each((i, shell) => {
            const link = $(shell).find('a.app-series-card-link');
            const href = link.attr('href') || '';
            const title = link.find('h3.app-series-card-title').text().trim();
            const img = link.find('img').attr('src') || '';
            const dividerText = $(shell).find('div.app-series-card-divider').text().trim();
            const chapters = parseInt(dividerText.match(/\d+/)?.[0] || '0');

            if (href && title) {
                mangas.push({
                    id: href,
                    title: title,
                    cover: img,
                    chapters: chapters
                });
            }
        });

        res.json({ success: true, mangas });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================
// 2. تفاصيل مانجا لـ MangaTuk (يُستخدم لاحقًا)
// =====================
app.get('/api/details', async (req, res) => {
    const mangaUrl = req.query.url;
    if (!mangaUrl) return res.status(400).json({ success: false, message: 'missing url' });

    const url = mangaUrl.startsWith('http') ? mangaUrl : `${BASE_URL_MANGATUK}${mangaUrl}`;
    try {
        const { data } = await axios.get(url, { headers: requestHeaders });
        const $ = cheerio.load(data);
        const title = $('h1').first().text().trim();
        const cover = $('img[alt]').first().attr('src') || '';
        const desc = $('p').first().text().trim();
        const genres = [];
        $('span[data-slot="badge"]').each((i, el) => genres.push($(el).text().trim()));
        const chaptersCount = 0; // سيتم تحديده لاحقًا

        res.json({
            success: true,
            manga: { id: mangaUrl, title, cover, description: desc, genres, chaptersCount }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================
// 3. قائمة الفصول لـ MangaTuk (يُستخدم لاحقًا)
// =====================
app.get('/api/chapters', async (req, res) => {
    const mangaUrl = req.query.url;
    if (!mangaUrl) return res.status(400).json({ success: false });

    const url = mangaUrl.startsWith('http') ? mangaUrl : `${BASE_URL_MANGATUK}${mangaUrl}`;
    try {
        const { data } = await axios.get(url, { headers: requestHeaders });
        const $ = cheerio.load(data);
        const chapters = [];
        $('a[href]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && /\/chapter\/\d+/.test(href)) {
                chapters.push({
                    id: href,
                    number: parseFloat(href.split('/').pop()),
                    title: $(el).text().trim(),
                    url: href.startsWith('http') ? href : `${BASE_URL_MANGATUK}${href}`
                });
            }
        });

        res.json({ success: true, chapters });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// =====================
// 4. صور الفصل لـ MangaTuk
// =====================
app.get('/api/chapter/images', async (req, res) => {
    const chapterUrl = req.query.url;
    if (!chapterUrl) return res.status(400).json({ success: false, message: 'missing url' });

    try {
        const { data } = await axios.get(chapterUrl, { headers: requestHeaders });
        const $ = cheerio.load(data);
        const imageUrls = [];

        $('img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
            if (src && /\.(jpg|png|webp|jpeg)(\?|$)/i.test(src)) {
                imageUrls.push(src);
            }
        });

        res.json({ success: true, images: imageUrls });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================
// 5. MangaTime - قائمة المانجا (جديد)
// =====================
app.get('/api/mangatime/list', async (req, res) => {
    const page = req.query.page || 1;
    const url = `${BASE_URL_MANGATIME}/browse?page=${page}`;

    try {
        const { data } = await axios.get(url, { headers: requestHeaders });
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

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});