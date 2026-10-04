// Cloudflare Worker — AI Bot v2 (Web Arama + Kaynak Linkleri)
// Settings > Variables:
//   ANTHROPIC_API_KEY (Secret) — Claude için
//   GOOGLE_API_KEY (Secret) — Google Custom Search için
//   GOOGLE_CX (Secret) — Google Custom Search Engine ID
//   ALLOW_ORIGIN — örn: https://cetcety.com

const SYS = `Sen CETCETY sohbet sitesindeki "AI" adlı yardımcı botsun. Adın AI.

KURALLAR:
- Her zaman Türkçe, samimi ve doğal konuş.
- Devrik cümleleri, yazım hatalarını, kısaltmaları ANLA. Örn: "yemek tarifi lazım bana kolay", "atatürk kaç yılında doğdu", "bana makarna nası yapılır anlatsana"
- Kullanıcı bir şey SORUYORSA → cevap ver
- Kullanıcı bir şey İSTİYORSA (tarif, ödev, bilgi) → hemen ver
- Cevaplar KISA olsun: en fazla 5-6 cümle. Ama tarif gibi uzun içeriklerde gerekirse 8-10 satır.
- Bilgi verirken kaynakları [1], [2] şeklinde numaralandır ve SONUNDA "🔗 Kaynaklar:" başlığı altında linkleri listele.
- Eğer arama sonucu boşsa, kendi bilginle cevap ver ve "(kendi bilgim)" notu ekle.
- Matematik işlemlerini adım adım çöz.
- Ödev yardımı: çözümü ver ama kopyala-yapıştır yapması yerine mantığını anlat.
- Zararlı, yetişkin, kişisel veri isteyen taleplere nazikçe hayır de.
- Kendini "yapay zeka modeli" olarak tanıtma, sadece "AI" olarak konuş.`;

async function webSearch(query, env) {
    if (!env.GOOGLE_API_KEY || !env.GOOGLE_CX) return [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_API_KEY}&cx=${env.GOOGLE_CX}&q=${encodeURIComponent(query)}&num=4&hl=tr&gl=tr`;
        const r = await fetch(url);
        if (!r.ok) return [];
        const j = await r.json();
        return (j.items || []).map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        }));
    } catch (e) {
        return [];
    }
}

async function askClaude(question, searchResults, env) {
    let context = '';
    if (searchResults.length > 0) {
        context = '\n\nGÜNCEL WEB ARAMA SONUÇLARI (kaynak olarak kullan):\n';
        searchResults.forEach((r, i) => {
            context += `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}\n\n`;
        });
        context += '\nCevaplarında bu kaynakları [1], [2] şeklinde referans göster ve sonunda kaynak linklerini listele.\n';
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 800,
            system: SYS,
            messages: [{
                role: 'user',
                content: question + context
            }]
        })
    });

    const j = await r.json();
    return (j.content || []).map(c => c.text || '').join('').trim();
}

export default {
    async fetch(req, env) {
        const cors = {
            'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        };
        if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
        if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });

        let b;
        try { b = await req.json(); }
        catch (e) { return new Response('bad json', { status: 400, headers: cors }); }

        const q = String(b.question || '').trim().slice(0, 500);
        if (!q) return new Response('empty', { status: 400, headers: cors });

        // 1) Web araması yap
        const searchResults = await webSearch(q, env);

        // 2) Claude'a sor (arama sonuçlarıyla birlikte)
        let reply = '';
        try {
            reply = await askClaude(q, searchResults, env);
        } catch (e) {
            reply = '';
        }

        // 3) Fallback: Arama sonucu varsa ama AI cevap veremediyse
        if (!reply && searchResults.length > 0) {
            reply = '🔍 Bulduğum kaynaklar:\n\n' +
                searchResults.map((r, i) => `${i + 1}. [${r.title}](${r.link})\n   ${r.snippet}`).join('\n\n');
        }

        if (!reply) reply = 'Şu an cevap veremiyorum, tekrar dener misin?';

        // 4) Kaynak linkleri varsa AI cevabının sonuna ekle
        if (searchResults.length > 0 && !reply.includes('🔗')) {
            reply += '\n\n🔗 **Kaynaklar:**\n';
            searchResults.forEach((r, i) => {
                reply += `${i + 1}. ${r.title} — ${r.link}\n`;
            });
        }

        return new Response(JSON.stringify({ reply }), {
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }
};
