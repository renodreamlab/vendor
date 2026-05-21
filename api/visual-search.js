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
이 가구를 아래 항목별로 한국어로 상세히 설명하세요:
1. 가구 종류 (의자/소파/테이블 등)
2. 전체 실루엣과 형태
3. 다리 구조 (4발/U자/X자/캔틸레버/받침대 등)
4. 등받이 구조 (유무, 높이, 형태)
5. 좌판/상판 형태
6. 독특한 디자인 특징 (웨이브, 천공, 적층 등)
색상과 재질은 제외. 100자 이내.` }
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

    // 3. 유사도 기준
    const threshold = matchType === "exact" ? 0.75 : 0.55;

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
