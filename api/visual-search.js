// POST /api/visual-search
// { images: [{base64, mediaType}], matchType, vendors? }
import { createClient } from "@supabase/supabase-js";

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const HF_TOKEN  = process.env.HF_TOKEN;
const CLIP_URL  = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";

async function clipEmbedFromBase64(base64, mediaType) {
  const imgBytes = Buffer.from(base64, "base64");
  const res = await fetch(CLIP_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${HF_TOKEN}` },
    body: imgBytes,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`CLIP API ${res.status}: ${txt.slice(0,100)}`);
  }
  const data = await res.json();
  const vec = Array.isArray(data[0]) ? data[0] : data;
  if (Array.isArray(vec) && vec.length === 512) return vec;
  throw new Error(`CLIP 응답 형식 오류: ${JSON.stringify(data).slice(0,100)}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { images, matchType, vendors } = req.body;
  if (!images?.length) return res.status(400).json({ error: "이미지가 없습니다", results: [] });

  try {
    // 여러 이미지인 경우 첫 번째만 사용 (CLIP은 단일 이미지)
    const queryImg = images[0];

    // 1. 쿼리 이미지 → CLIP 임베딩
    const embedding = await clipEmbedFromBase64(queryImg.base64, queryImg.mediaType);

    // 2. 유사도 임계값 (CLIP 코사인 유사도는 0.7~0.95가 실제 유사 범위)
    const threshold = matchType === "exact" ? 0.82 : 0.72;

    // 3. Supabase 벡터 검색
    const { data, error } = await supabase.rpc("search_products", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 15,
    });

    if (error) throw new Error(error.message);

    // 4. 거래처 필터링
    let results = data ?? [];
    if (vendors?.length) results = results.filter(r => vendors.includes(r.vendor));

    // 5. 유사도 % 변환
    results = results.map(r => ({
      ...r,
      score: Math.round(r.similarity * 100),
    })).sort((a, b) => b.score - a.score);

    return res.status(200).json({ results });
  } catch(e) {
    return res.status(200).json({ results: [], error: e.message });
  }
}
