// POST /api/visual-search
// { image: base64, mediaType: "image/jpeg", matchType: "exact"|"similar", vendors?: ["거래처명"] }
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function describeQueryImage(base64, mediaType, multipleImages) {
  const multiNote = multipleImages > 1
    ? `이 ${multipleImages}장은 동일 제품의 다른 각도입니다. 종합해서 설명하세요.`
    : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [{ role:"user", content:[
        { type:"image_url", image_url:{ url:`data:${mediaType};base64,${base64}`, detail:"high" } },
        { type:"text", text:`${multiNote}
이 가구: 1)종류 2)실루엣/형태 3)다리구조 4)등받이 5)독특한특징. 색상재질제외. 80자이내.` }
      ]}],
    }),
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() ?? "";
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { images, matchType, vendors } = req.body;
  // images: [{base64, mediaType}]

  if (!images?.length) return res.status(400).json({ error:"이미지가 없습니다" });

  try {
    // 1. 쿼리 이미지 설명 생성 (여러 장이면 첫 번째 사용, 다각도 힌트 포함)
    const queryImg = images[0];
    const description = await describeQueryImage(queryImg.base64, queryImg.mediaType, images.length);
    if (!description) return res.status(200).json({ results: [], description: "" });

    // 2. 설명을 벡터로 변환
    const embedding = await embed(description);
    if (!embedding) return res.status(200).json({ results: [], description });

    // 3. 유사도 기준 (text embedding 특성상 0.35~0.55 수준이 실제 유사)
    const threshold = matchType === "exact" ? 0.45 : 0.35;

    // 4. Supabase 벡터 검색
    const { data, error } = await supabase.rpc("search_products", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 30,
    });

    if (error) return res.status(200).json({ results: [], description, error: error.message });

    // 5. 거래처 필터링 (선택된 거래처만)
    let results = data ?? [];
    if (vendors?.length) {
      results = results.filter(r => vendors.includes(r.vendor));
    }

    // 6. 유사도 점수를 % 변환 후 반환
    results = results.map(r => ({
      ...r,
      score: Math.round(r.similarity * 100),
    })).sort((a, b) => b.score - a.score);

    return res.status(200).json({ results, description });
  } catch(e) {
    return res.status(500).json({ error: e.message, results: [] });
  }
}
