// Cloudflare Worker — Laafle #ai botu (gerçek yapay zekâ)
// İKİ SEÇENEK (biri yeter):
//  A) ÜCRETSİZ: Worker > Settings > Bindings > "Workers AI" ekle, adı: AI  (API anahtarı gerekmez)
//  B) Daha zeki: Settings > Variables > ANTHROPIC_API_KEY (Secret)  — anahtar varsa o kullanılır
// Ayrıca: ALLOW_ORIGIN = site adresin (örn. https://siten.com)  (boş bırakırsan herkese açık olur)
// Sonra sitede AI_ENDPOINT yerine Worker adresini yaz (index.html içinde "AI_ENDPOINT").
const SYS = () => 'Sen Laafle sohbet sitesindeki "AI" asistanısın. Bugün: ' + new Date().toLocaleDateString('tr-TR', { dateStyle: 'full' }) + '. ' +
  'Kullanıcının dilinde (çoğunlukla Türkçe) cevap ver. Doğal, samimi ve net konuş; sohbet gibi devam et, önceki mesajları hatırla. ' +
  'Soru basitse kısa, karmaşıksa adım adım ve düzenli anlat (en fazla ~12 cümle). Ödev, çeviri, matematik, fen, kodlama, günlük hayat ve genel kültürde gerçekten yardımcı ol. ' +
  'Emin olmadığın bilgiyi uydurma, "emin değilim" de. Zararlı, yetişkin içerikli veya kişisel veri isteyen taleplere nazikçe hayır de.';
const MODEL_CF = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const js = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    let b; try { b = await req.json(); } catch (e) { return js({ error: 'bad json' }, 400); }
    const q = String(b.question || '').slice(0, 1000).trim();
    if (!q) return js({ error: 'empty' }, 400);
    const hist = (Array.isArray(b.history) ? b.history : []).slice(-8)
      .map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: String((m && m.content) || '').slice(0, 800) }))
      .filter(m => m.content);
    const msgs = hist.concat([{ role: 'user', content: q }]);
    try {
      let reply = '';
      if (env.ANTHROPIC_API_KEY) {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: env.MODEL || 'claude-haiku-4-5-20251001', max_tokens: 700, system: SYS(), messages: msgs })
        });
        const j = await r.json();
        reply = (j.content || []).map(c => c.text || '').join('').trim();
      } else if (env.AI) {
        const j = await env.AI.run(MODEL_CF, { messages: [{ role: 'system', content: SYS() }].concat(msgs), max_tokens: 700 });
        reply = String((j && (j.response || j.result)) || '').trim();
      } else return js({ error: 'ANTHROPIC_API_KEY veya Workers AI (AI) bağlantısı yok' }, 500);
      return js({ reply: reply || 'Şu an cevap veremiyorum, biraz sonra tekrar dene.' });
    } catch (e) { return js({ error: 'ai hata' }, 502); }
  }
};
