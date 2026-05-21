export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { queryImage, queryMediaType, products, minScore = 70 } = req.body;
  // products: [{imageUrl, productUrl, name, vendor}]

  if (!queryImage || !products?.length) return res.status(400).json({ error: "missing data" });

  try {
    // 각 제품 이미지를 fetch해서 base64로 변환
    const fetched = await Promise.all(
      products.slice(0, 20).map(async (p) => {
        try {
          const r = await fetch(p.imageUrl, { signal: AbortSignal.timeout(4000) });
          if (!r.ok) return null;
          const buf = await r.arrayBuffer();
          const ct = r.headers.get("content-type") || "image/jpeg";
          const b64 = Buffer.from(buf).toString("base64");
          return { ...p, b64, ct };
        } catch { return null; }
      })
    );
    const valid = fetched.filter(Boolean);
    if (!valid.length) return res.status(200).json({ matches: [] });

    // 프롬프트 구성 — 쿼리 이미지 + 제품 이미지들
    const content = [
      {
        type: "text",
        text: [
          "당신은 가구 이미지 비교 전문가입니다.",
          "첫 번째 이미지([검색 이미지])와 나머지 제품 이미지들을 비교하여 유사도를 판단하세요.",
          "",
          "【유사도 점수 기준 — 반드시 엄격하게 적용】",
          "100점: 완전 동일 제품. 같은 모델, 같은 디자인. 색상만 다를 수 있음. 형태·실루엣·다리구조·등받이 모두 100% 일치.",
          "90~99점: 거의 동일. 미세한 차이(각도, 배색)만 있고 같은 라인 제품으로 보임.",
          "70~89점: 매우 유사. 전체 실루엣과 다리구조, 등받이 형태가 같지만 세부 디자인 차이 있음.",
          "50~69점: 유사. 같은 카테고리에서 비슷한 스타일이지만 구조적 차이 존재.",
          "0~49점: 유사하지 않음. 이 경우 결과에 포함하지 말 것.",
          "",
          "【중요】 확신이 없으면 점수를 낮게 주세요. 억지로 높은 점수를 주지 마세요.",
          "전혀 다른 형태의 제품에 높은 점수를 주는 것은 엄격히 금지.",
          "",
          `[제품 목록] 총 ${valid.length}개 (1번~${valid.length}번 순서)`,
          "",
          "반드시 JSON만 반환:",
          `{"matches":[{"index":1,"vendor":"업체명","productUrl":"url","reason":"구체적 유사 근거","score":100}]}`,
          `유사도 점수 ${minScore}점 이상만 포함. 최대 5개. 해당 점수 이상 없으면 matches를 빈 배열로 반환.`
        ].join("\n")
      },
      // 검색 이미지
      { type: "image_url", image_url: { url: `data:${queryMediaType};base64,${queryImage}`, detail: "high" } },
    ];

    // 제품 이미지들
    valid.forEach((p, i) => {
      content.push({ type: "text", text: `[${i + 1}번] 업체: ${p.vendor} / ${p.name || ""}` });
      content.push({ type: "image_url", image_url: { url: `data:${p.ct};base64,${p.b64}`, detail: "low" } });
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(200).json({ matches: [], error: data.error.message });

    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    // index로 제품 정보 매핑
    const matches = (parsed.matches || []).map(m => {
      const p = valid[m.index - 1];
      return p ? { ...m, imageUrl: p.imageUrl, productUrl: p.productUrl, vendor: p.vendor, name: p.name } : null;
    }).filter(Boolean);

    return res.status(200).json({ matches });
  } catch (e) {
    return res.status(500).json({ matches: [], error: e.message });
  }
}
