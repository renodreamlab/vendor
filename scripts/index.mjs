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

const supabase  = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
const HF_TOKEN  = env.HF_TOKEN;
const CLIP_URL  = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";

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

// ── CLIP 임베딩 (이미지 URL → 512차원 벡터) ────────────────
async function clipEmbed(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) return null;
    const imgBytes = await imgRes.arrayBuffer();

    // HuggingFace CLIP — 이미지 바이트 직접 전송
    const res = await fetch(CLIP_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HF_TOKEN}` },
      body: imgBytes,
    });
    const data = await res.json();

    // 응답: [[...512 floats]] 또는 [...512 floats]
    const vec = Array.isArray(data[0]) ? data[0] : data;
    if (Array.isArray(vec) && vec.length === 512) return vec;
    console.error("  CLIP 응답 형식 오류:", JSON.stringify(data).slice(0, 100));
    return null;
  } catch(e) {
    console.error("  CLIP 오류:", e.message);
    return null;
  }
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

  console.log(`\n🚀 CLIP 인덱싱 시작 — ${targets.length}개 거래처`);
  console.log(`모델: openai/clip-vit-base-patch32 (512차원)\n`);

  // CLIP 워밍업 (첫 요청은 모델 로딩 시간 필요)
  console.log("⏳ CLIP 모델 로딩 중...");
  await sleep(3000);

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

          const embedding = await clipEmbed(p.imageUrl);
          if (!embedding) continue;

          const { error } = await supabase.from("products").upsert({
            vendor:      vendor.name,
            product_url: p.productUrl,
            image_url:   p.imageUrl,
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
