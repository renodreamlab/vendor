// POST /api/visual-search
// { images: [{base64, mediaType}], matchType, vendors? }
import { createClient } from "@supabase/supabase-js";
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const supabase   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const DESCRIBE_PROMPT = `이 가구 이미지를 분석해서 아래 형식으로 정확히 출력하세요.
다른 제품과 구별되는 특징을 최대한 구체적으로 적으세요. 색상은 절대 포함하지 마세요.

형식(한 줄): 가구종류|등받이:[상세모양/패턴/구조]|다리:[개수+형태]|좌판:[형태]|특징:[가장독특한시각특징]

예시:
의자|등받이:나비날개형이중분리홀+물결릿지패턴전면|다리:4발얇은금속|좌판:넓은유기쉘|특징:물결패턴쉘의자버터플라이
의자|등받이:없음(스툴)|다리:원형받침대|좌판:둥근쿠션|특징:원형회전스툴`;

async function describeImage(base64, mediaType, multiCount) {
  const multiNote = multiCount > 1 ? `[${multiCount}장 동일제품 다각도] ` : "";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o", max_tokens: 120,
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" } },
        { type: "text", text: multiNote + DESCRIBE_PROMPT }
      ]}],
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  const d = await res.json();
  return d.data?.[0]?.embedding ?? null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { images, matchType, vendors } = req.body;
  if (!images?.length) return res.status(400).json({ error: "이미지가 없습니다", results: [] });

  try {
    // 1. 쿼리 이미지 → 초정밀 설명 생성
    const queryImg = images[0];
    const description = await describeImage(queryImg.base64, queryImg.mediaType, images.length);

    // 2. 설명 → 1536차원 임베딩
    const embedding = await embed(description);
    if (!embedding) throw new Error("임베딩 생성 실패");

    // 3. 유사도 임계값
    const threshold = matchType === "exact" ? 0.60 : 0.50;

    // 4. Supabase 벡터 검색
    const { data, error } = await supabase.rpc("search_products", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 12,
    });

    if (error) throw new Error(error.message);

    // 5. 거래처 필터 + 유사도 % 변환
    let results = (data ?? [])
      .filter(r => !vendors?.length || vendors.includes(r.vendor))
      .map(r => ({ ...r, score: Math.round(r.similarity * 100) }))
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({ results, description });
  } catch(e) {
    return res.status(200).json({ results: [], error: e.message });
  }
}
