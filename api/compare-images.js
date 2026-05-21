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
          "아래 [검색 이미지]와 형태·실루엣·구조가 가장 유사한 제품을 [제품 목록]에서 찾아주세요.",
          "",
          "판단 기준 (중요도 순):",
          "1. 전체 실루엣 및 형태 (가장 중요)",
          "2. 다리 구조 (4발/U자/X자/캔틸레버 등)",
          "3. 등받이 구조 (유무·높이·형태)",
          "4. 좌판 형태",
          "5. 색상·재질은 무시 — 형태가 같으면 색상 달라도 포함",
          "",
          `[제품 목록] 총 ${valid.length}개. 각 이미지 순서: 1번~${valid.length}번`,
          "",
          "반드시 JSON만 반환:",
          `{"matches":[{"index":1,"vendor":"업체명","productUrl":"url","reason":"형태 유사 근거","score":95}]}`,
          `유사도 점수 ${minScore}점 이상만 포함. 최대 5개.`
        ].join("\n")
      },
      // 검색 이미지
      { type: "image_url", image_url: { url: `data:${queryMediaType};base64,${queryImage}`, detail: "low" } },
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
        model: "gpt-4o-mini",
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
