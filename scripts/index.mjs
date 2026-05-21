// 거래처 제품 인덱서 — 로컬에서 실행
// 사용법: node scripts/index.mjs
// 특정 거래처만: node scripts/index.mjs 켄덴 벨로스가구

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// .env 파싱
const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env"), "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const supabase  = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
const OPENAI    = env.OPENAI_API_KEY;

const VENDORS = [
  { name:"가구로드",    url:"https://m.gaguroad.com/" },
  { name:"가든프렌즈",  url:"https://www.b2bgarden.co.kr/" },
  { name:"금하무역",    url:"https://goldriver78.cafe24.com/" },
  { name:"금풍무역",    url:"https://gppo5789.co.kr/" },
  { name:"다나무",      url:"https://www.danamoo.co.kr/" },
  { name:"다원체어스",  url:"https://dawonchair.com/" },
  { name:"대승컴퍼니",  url:"https://www.idaeseung.kr/" },
  { name:"루센가구",    url:"https://lusen.co.kr/" },
  { name:"모빌리가구",  url:"https://mobily.co.kr/" },
  { name:"벨로스가구",  url:"https://bellos.kr/" },
  { name:"빅퍼스",      url:"https://vicfus.com/" },
  { name:"상원상사",    url:"https://swgagu.co.kr/" },
  { name:"세광가구",    url:"https://gagucafe114.com/" },
  { name:"솔로몬가구",  url:"https://solomongagu.com/" },
  { name:"아이엠가구",  url:"https://im9888.com/" },
  { name:"아트랜드",    url:"https://k490515.cafe24.com/" },
  { name:"양지에이치앤",url:"https://yangjihn.com/" },
  { name:"에프엠가구",  url:"https://fmgagu.com/" },
  { name:"은창플러스",  url:"https://www.ecgagu.co.kr/" },
  { name:"이나무로",    url:"https://www.enamuro.kr/" },
  { name:"켄덴",        url:"https://kenden.kr/" },
  { name:"케이브홈",    url:"https://kavehome.kr/ko" },
  { name:"파레트인",    url:"https://palletin.com/" },
  { name:"포인플랜",    url:"https://foinplan.com/" },
  { name:"한국티에이",  url:"https://ikta.co.kr/" },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = { "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36" };

const resolve = (src, base) => {
  if (!src) return null;
  src = src.trim();
  if (src.startsWith("//"))   return "https:" + src;
  if (src.startsWith("/"))    return base.origin + src;
  if (src.startsWith("http")) return src;
  return null;
};

// 홈페이지에서 카테고리 URL 추출
async function getCategories(vendorUrl) {
  try {
    const r = await fetch(vendorUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const html = await r.text();
    const base = new URL(vendorUrl);
    const cats = new Set();

    // cafe24 카테고리: /product/list.html?cate_no=XX
    for (const m of html.matchAll(/href="([^"']*\/product\/list\.html\?cate_no=\d+[^"']*)"/gi)) {
      const url = resolve(m[1], base);
      if (url) cats.add(url);
    }
    // 일반 카테고리
    for (const m of html.matchAll(/href="([^"']*\/(?:category|cate|goods\/list)[^"']{0,80})"/gi)) {
      const url = resolve(m[1], base);
      if (url && !url.includes("javascript") && !url.includes("#")) cats.add(url);
    }

    return [...cats].slice(0, 20); // 최대 20개 카테고리
  } catch { return []; }
}

// 페이지에서 제품 이미지 + URL 추출
async function scrapeProductsFromPage(pageUrl) {
  try {
    const r = await fetch(pageUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const html = await r.text();
    const base = new URL(pageUrl);
    const items = [];
    const seen  = new Set();

    const add = (img, href) => {
      const i = resolve(img, base);
      const h = resolve(href, base);
      if (!i || !h || seen.has(i)) return;
      if (i.includes("logo") || i.includes("banner") || i.includes("icon")) return;
      if (!i.match(/\.(jpg|jpeg|png|webp)/i)) return;
      seen.add(i);
      items.push({ imageUrl:i, productUrl:h });
    };

    // ① /web/product/medium 또는 large 패턴 (cafe24)
    const medImgs = [...html.matchAll(/src="([^"']+\/web\/product\/(?:medium|large|big)\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)"/gi)].map(m=>m[1]);
    const prdHrefs = [...html.matchAll(/href="([^"']*\/product\/[^"']*\/\d+[^"']{0,50})"/gi)].map(m=>m[1]);
    const maxI = Math.min(medImgs.length, prdHrefs.length, 40);
    for (let i = 0; i < maxI; i++) add(medImgs[i], prdHrefs[i*2] || prdHrefs[i]);

    // ② xans-record 패턴
    if (items.length < 5) {
      for (const m of html.matchAll(/<li[^>]+class="[^"]*xans-record-[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)) {
        const block = m[1];
        const im = block.match(/src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i)?.[1];
        const hr = block.match(/href="([^"']+\/(?:product|goods)\/[^"']+)"/i)?.[1];
        add(im, hr);
        if (items.length >= 40) break;
      }
    }

    return items;
  } catch { return []; }
}

// 이미지 설명 생성
async function describeImage(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const ct  = imgRes.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(buf).toString("base64");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI}` },
      body: JSON.stringify({
        model:"gpt-4o-mini", max_tokens:150,
        messages:[{ role:"user", content:[
          { type:"image_url", image_url:{ url:`data:${ct};base64,${b64}`, detail:"low" } },
          { type:"text", text:"이 가구의 형태를 설명. 반드시 포함: 가구종류, 등받이형태(모양/패턴/구멍유무), 다리구조(개수/형태), 좌판형태, 가장독특한시각적특징. 다른 의자와 구별되는 점 강조. 색상재질 절대제외. 키워드 나열식으로 60자이내." }
        ]}],
      }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

// 임베딩 생성
async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method:"POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI}` },
    body: JSON.stringify({ model:"text-embedding-3-small", input:text }),
  });
  const d = await res.json();
  return d.data?.[0]?.embedding ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0
    ? VENDORS.filter(v => args.includes(v.name))
    : VENDORS;

  console.log(`\n🚀 인덱싱 시작 — ${targets.length}개 거래처`);

  let totalIndexed = 0;

  for (const vendor of targets) {
    console.log(`\n━━ ${vendor.name} (${vendor.url}) ━━`);

    // 1. 카테고리 URL 수집
    const cats = await getCategories(vendor.url);
    console.log(`  카테고리 ${cats.length}개 발견`);

    if (cats.length === 0) {
      // 카테고리가 없으면 홈페이지 직접 스크래핑
      cats.push(vendor.url);
    }

    let vendorIndexed = 0;
    const processed = new Set();

    for (const catUrl of cats) {
      const products = await scrapeProductsFromPage(catUrl);
      if (!products.length) continue;
      process.stdout.write(`  [${catUrl.split("?")[1] || "home"}] ${products.length}개 → `);

      for (const p of products) {
        if (processed.has(p.imageUrl)) continue;
        processed.add(p.imageUrl);

        try {
          const { data:existing } = await supabase
            .from("products").select("id").eq("image_url", p.imageUrl).maybeSingle();
          if (existing) continue;

          const desc = await describeImage(p.imageUrl);
          if (!desc) continue;

          const emb = await embed(desc);
          if (!emb) continue;

          const { error } = await supabase.from("products").upsert({
            vendor: vendor.name,
            product_url: p.productUrl,
            image_url: p.imageUrl,
            description: desc,
            embedding: emb,
          }, { onConflict:"image_url" });

          if (!error) { vendorIndexed++; totalIndexed++; }
          await sleep(300);
        } catch {}
      }
      process.stdout.write(`저장 ${vendorIndexed}개\n`);
    }
    console.log(`  ✓ ${vendor.name}: ${vendorIndexed}개 저장`);
  }

  console.log(`\n✅ 완료! 총 ${totalIndexed}개 저장됨`);
}

main().catch(console.error);
