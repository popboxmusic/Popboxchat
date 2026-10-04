/ Cloudflare Worker — #ai botu için gerçek yapay zekâ ucu (isteğe bağlı)
// Kurulum: Worker oluştur → bu kodu yapıştır → Settings > Variables: ANTHROPIC_API_KEY (Secret), ALLOW_ORIGIN (site adresin)
// Sonra HTML'de: window.AI_BOT_CONFIG = { ENDPOINT: 'https://SENIN-WORKER.workers.dev' };
const SYS = 'Sen CETCETY sohbet sitesindeki "AI" yardımcısın. Türkçe, kısa (en fazla 4-5 cümle), doğru ve öğrenci dostu cevap ver. ' +
  'Çeviri, fen, sosyal bilgiler, matematik ve genel kültür sorularında yardım et; ödevlerde çözümü adım adım açıkla. ' +
  'Zararlı, yetişkin veya kişisel veri isteyen taleplere nazikçe hayır de.';
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    let b; try { b = await req.json(); } catch (e) { return new Response('bad json', { status: 400, headers: cors }); }
    const q = String(b.question || '').slice(0, 500);
    if (!q) return new Response('empty', { status: 400, headers: cors });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: SYS, messages: [{ role: 'user', content: q }] })
    });
    const j = await r.json();
    const reply = (j.content || []).map(c => c.text || '').join('').trim();
    return new Response(JSON.stringify({ reply: reply || 'Şu an cevap veremiyorum.' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
