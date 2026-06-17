// 거래처 제품 CLIP 인덱서 — 로컬에서 실행
// 사용법: node scripts/index.mjs
// 특정 거래처만: node scripts/index.mjs 켄덴 벨로스가구

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env"), "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
const OPENAI   = env.OPENAI_API_KEY;

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

// ── GPT-4o 초정밀 시각 설명 생성 ──────────────────────────
const DESCRIBE_PROMPT = `이 가구 이미지를 분석해서 아래 형식으로 정확히 출력하세요.
다른 제품과 구별되는 특징을 최대한 구체적으로 적으세요. 색상은 절대 포함하지 마세요.

형식(한 줄): 가구종류|등받이:[상세모양/패턴/구조]|다리:[개수+형태]|좌판:[형태]|특징:[가장독특한시각특징]

예시:
의자|등받이:나비날개형이중분리홀+물결릿지패턴전면|다리:4발얇은금속|좌판:넓은유기쉘|특징:물결패턴쉘의자버터플라이
의자|등받이:없음(스툴)|다리:원형받침대|좌판:둥근쿠션|특징:원형회전스툴
소파|등받이:낮은쿠션형3단분리|다리:없음(바닥형)|좌판:3인용긴직선|특징:모듈형로우소파`;

async function describeImage(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const ct  = imgRes.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(buf).toString("base64");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json","Authorization":`Bearer ${OPENAI}` },
      body: JSON.stringify({
        model:"gpt-4o", max_tokens:120,
        messages:[{ role:"user", content:[
          { type:"image_url", image_url:{ url:`data:${ct};base64,${b64}`, detail:"low" } },
          { type:"text", text: DESCRIBE_PROMPT }
        ]}],
      }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

// ── 텍스트 임베딩 (1536차원) ────────────────────────────────
async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method:"POST",
    headers:{ "Content-Type":"application/json","Authorization":`Bearer ${OPENAI}` },
    body: JSON.stringify({ model:"text-embedding-3-small", input: text }),
  });
  const d = await res.json();
  return d.data?.[0]?.embedding ?? null;
}

// ── 페이지에서 제품 수집 ────────────────────────────────────
async function getCategories(vendorUrl) {
  try {
    const r = await fetch(vendorUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const html = await r.text();
    const base = new URL(vendorUrl);
    const cats = new Set();
    for (const m of html.matchAll(/href="([^"']*\/product\/list\.html\?cate_no=\d+[^"']*)"/gi)) {
      const url = resolve(m[1], base);
      if (url) cats.add(url);
    }
    for (const m of html.matchAll(/href="([^"']*\/(?:category|cate|goods\/list)[^"']{0,80})"/gi)) {
      const url = resolve(m[1], base);
      if (url && !url.includes("javascript") && !url.includes("#")) cats.add(url);
    }
    return [...cats].slice(0, 20);
  } catch { return []; }
}

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

    // /web/product/medium 패턴 (cafe24)
    const medImgs  = [...html.matchAll(/src="([^"']+\/web\/product\/(?:medium|large|big)\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)"/gi)].map(m=>m[1]);
    const prdHrefs = [...html.matchAll(/href="([^"']*\/product\/[^"']*\/\d+[^"']{0,50})"/gi)].map(m=>m[1]);
    for (let i = 0; i < Math.min(medImgs.length, prdHrefs.length, 40); i++) add(medImgs[i], prdHrefs[i*2] || prdHrefs[i]);

    // xans-record 패턴
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

// ── 메인 ───────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0
    ? VENDORS.filter(v => args.includes(v.name))
    : VENDORS;

  console.log(`\n🚀 인덱싱 시작 — ${targets.length}개 거래처`);
  console.log(`방식: GPT-4o 초정밀 설명 + text-embedding-3-small (1536차원)\n`);

  let totalIndexed = 0;

  for (const vendor of targets) {
    console.log(`\n━━ ${vendor.name} ━━`);
    const cats = await getCategories(vendor.url);
    if (cats.length === 0) cats.push(vendor.url);
    console.log(`  카테고리 ${cats.length}개`);

    let vendorIndexed = 0;
    const processed = new Set();

    for (const catUrl of cats) {
      const products = await scrapeProductsFromPage(catUrl);
      if (!products.length) continue;
      process.stdout.write(`  [${catUrl.split("?")[1]?.slice(0,20) || "home"}] ${products.length}개 → `);

      for (const p of products) {
        if (processed.has(p.imageUrl)) continue;
        processed.add(p.imageUrl);

        try {
          const { data: existing } = await supabase
            .from("products").select("id").eq("image_url", p.imageUrl).maybeSingle();
          if (existing) continue;

          const description = await describeImage(p.imageUrl);
          if (!description) continue;

          const embedding = await embed(description);
          if (!embedding) continue;

          const { error } = await supabase.from("products").upsert({
            vendor:      vendor.name,
            product_url: p.productUrl,
            image_url:   p.imageUrl,
            description,
            embedding,
          }, { onConflict: "image_url" });

          if (!error) { vendorIndexed++; totalIndexed++; }
          await sleep(200);
        } catch {}
      }
      process.stdout.write(`저장 ${vendorIndexed}개\n`);
    }
    console.log(`  ✓ ${vendor.name}: ${vendorIndexed}개`);
  }

  console.log(`\n✅ 완료! CLIP 임베딩 ${totalIndexed}개 저장됨`);
}

main().catch(console.error);
