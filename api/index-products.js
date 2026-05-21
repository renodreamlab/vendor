// POST /api/index-products
// { secret, vendors?: ["거래처명"] }  ← vendors 없으면 전체 실행
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SECRET     = process.env.INDEX_SECRET ?? "vendor2025";

// ── helpers ──────────────────────────────────────────────────

async function scrapeProducts(searchUrl) {
  try {
    const r = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const html  = await r.text();
    const base  = new URL(searchUrl);
    const items = [];

    // cafe24 xans-record 패턴
    for (const m of html.matchAll(/<li[^>]+class="[^"]*xans-record-[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)) {
      const block = m[1];
      const imgM  = block.match(/src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i);
      const hrefM = block.match(/href="([^"']+\/(?:product|goods)\/[^"']+)"/i);
      if (!imgM || !hrefM) continue;
      let img  = imgM[1].startsWith("//") ? "https:"+imgM[1] : imgM[1].startsWith("/") ? base.origin+imgM[1] : imgM[1];
      let href = hrefM[1].startsWith("http") ? hrefM[1] : base.origin+hrefM[1];
      if (!img.includes("logo") && !img.includes("banner")) {
        items.push({ imageUrl: img, productUrl: href });
        if (items.length >= 30) break;
      }
    }

    // 일반 패턴 fallback
    if (items.length < 5) {
      for (const m of html.matchAll(/<(?:li|div)[^>]+class="[^"]*(?:item|goods|product)[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div)>/gi)) {
        const block = m[1];
        const imgM  = block.match(/src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i);
        const hrefM = block.match(/href="([^"']+)"/i);
        if (!imgM || !hrefM) continue;
        let img  = imgM[1].startsWith("//") ? "https:"+imgM[1] : imgM[1].startsWith("/") ? base.origin+imgM[1] : imgM[1];
        let href = hrefM[1].startsWith("http") ? hrefM[1] : base.origin+hrefM[1];
        if (!img.includes("logo") && !img.includes("banner") && !img.includes("icon")) {
          items.push({ imageUrl: img, productUrl: href });
          if (items.length >= 30) break;
        }
      }
    }
    return items;
  } catch { return []; }
}

async function describeImage(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const ct  = imgRes.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(buf).toString("base64");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [{ role:"user", content:[
          { type:"image_url", image_url:{ url:`data:${ct};base64,${b64}`, detail:"low" } },
          { type:"text", text:"이 가구 이미지를 한국어로 설명하세요. 반드시 포함: 1)가구 종류 2)전체 실루엣·형태 3)다리 구조 4)등받이 구조 5)특징적인 디자인 요소. 색상은 제외. 50자 이내." }
        ]}],
      }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model:"text-embedding-3-small", input: text }),
  });
  const d = await res.json();
  return d.data?.[0]?.embedding ?? null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.body?.secret !== SECRET) return res.status(401).json({ error:"unauthorized" });

  const VENDORS = [
    { name:"가구로드",    search:"https://m.gaguroad.com/search?keyword={q}" },
    { name:"가든프렌즈",  search:"https://www.b2bgarden.co.kr/product/search.html?keyword={q}" },
    { name:"금하무역",    search:"https://goldriver78.cafe24.com/product/search.html?keyword={q}" },
    { name:"금풍무역",    search:"https://gppo5789.co.kr/product/search.html?keyword={q}" },
    { name:"다나무",      search:"https://www.danamoo.co.kr/product/search.html?keyword={q}" },
    { name:"다원체어스",  search:"https://dawonchair.com/product/search.html?keyword={q}" },
    { name:"대승컴퍼니",  search:"https://www.idaeseung.kr/product/search.html?keyword={q}" },
    { name:"루센가구",    search:"https://lusen.co.kr/product/search.html?keyword={q}" },
    { name:"모빌리가구",  search:"https://mobily.co.kr/product/search.html?keyword={q}" },
    { name:"벨로스가구",  search:"https://bellos.kr/product/search.html?keyword={q}" },
    { name:"빅퍼스",      search:"https://vicfus.com/product/search.html?keyword={q}" },
    { name:"상원상사",    search:"https://swgagu.co.kr/product/search.html?keyword={q}" },
    { name:"세광가구",    search:"https://gagucafe114.com/product/search.html?keyword={q}" },
    { name:"솔로몬가구",  search:"https://solomongagu.com/product/search.html?keyword={q}" },
    { name:"아이엠가구",  search:"https://im9888.com/product/search.html?keyword={q}" },
    { name:"아트랜드",    search:"https://k490515.cafe24.com/product/search.html?keyword={q}" },
    { name:"양지에이치앤",search:"https://yangjihn.com/product/search.html?keyword={q}" },
    { name:"에프엠가구",  search:"https://fmgagu.com/product/search.html?keyword={q}" },
    { name:"은창플러스",  search:"https://www.ecgagu.co.kr/product/search.html?keyword={q}" },
    { name:"이나무로",    search:"https://www.enamuro.kr/product/search.html?keyword={q}" },
    { name:"켄덴",        search:"https://kenden.kr/product/search.html?keyword={q}" },
    { name:"케이브홈",    search:"https://kavehome.kr/ko/search?q={q}" },
    { name:"파레트인",    search:"https://palletin.com/product/search.html?keyword={q}" },
    { name:"포인플랜",    search:"https://foinplan.com/product/search.html?keyword={q}" },
    { name:"한국티에이",  search:"https://ikta.co.kr/product/search.html?keyword={q}" },
  ];

  const CATEGORIES = ["의자","소파","테이블","침대","선반","책상","조명","스툴"];
  const targetNames = req.body?.vendors;
  const targets = targetNames
    ? VENDORS.filter(v => targetNames.includes(v.name))
    : VENDORS;

  let total = 0, indexed = 0;
  const log = [];

  for (const vendor of targets) {
    for (const cat of CATEGORIES) {
      const url = vendor.search.replace("{q}", encodeURIComponent(cat));
      const products = await scrapeProducts(url);
      log.push(`${vendor.name}/${cat}: ${products.length}개 수집`);

      for (const p of products) {
        total++;
        try {
          // 이미 인덱싱된 제품 스킵
          const { data: existing } = await supabase
            .from("products").select("id").eq("image_url", p.imageUrl).single();
          if (existing) continue;

          const description = await describeImage(p.imageUrl);
          if (!description) continue;

          const embedding = await embed(description);
          if (!embedding) continue;

          await supabase.from("products").upsert({
            vendor:      vendor.name,
            product_url: p.productUrl,
            image_url:   p.imageUrl,
            description,
            embedding,
          }, { onConflict: "image_url" });

          indexed++;
          await sleep(300); // rate limit 방지
        } catch { /* 개별 실패 무시 */ }
      }
    }
    log.push(`✓ ${vendor.name} 완료`);
  }

  return res.status(200).json({ total, indexed, log });
}
