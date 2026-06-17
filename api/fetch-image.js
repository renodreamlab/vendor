export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { url } = req.query;
  if (!url) return res.status(400).json({ imageUrl: null });

  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!r.ok) return res.status(200).json({ imageUrl: null });

    const html = await r.text();
    const base = new URL(decodeURIComponent(url));

    // 순서대로 시도 — 더 구체적인 패턴 먼저
    const patterns = [
      // cafe24 상품 목록 prdImg
      /class="[^"]*prdImg[^"]*"[\s\S]{0,300}?<img[^>]+src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"[^>]*>/i,
      // cafe24 상품 목록 일반
      /<li[^>]*class="[^"]*xans-record[^"]*"[\s\S]{0,500}?<img[^>]+src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"[^>]*>/i,
      // goods / product / item thumb
      /class="[^"]*(?:goods|product|item)[_-]?(?:thumb|img|photo|list)[^"]*"[\s\S]{0,400}?<img[^>]+src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i,
      // 프로토콜 없는 이미지 (//cdn...)
      /<img[^>]+src="(\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"[^>]*class="[^"]*(?:thumb|prd|goods|product)[^"]*"/i,
      // 일반 img 중 상품처럼 보이는 것 (img_b_, _m_, detail 제외)
      /<img[^>]+src="((?:https?:)?\/\/[^"']+(?:\/goods|\/product|\/item|\/prd)[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i,
      // og:image (대표 이미지 폴백)
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
      /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i,
    ];

    const resolve = (img) => {
      if (!img) return null;
      img = img.trim();
      if (img.startsWith("//")) return "https:" + img;
      if (img.startsWith("/")) return base.origin + img;
      if (img.startsWith("http")) return img;
      return base.origin + "/" + img;
    };

    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m && m[1] && !m[1].includes("logo") && !m[1].includes("banner") && !m[1].includes("btn")) {
        const imgUrl = resolve(m[1]);
        if (imgUrl) return res.status(200).json({ imageUrl: imgUrl });
      }
    }

    return res.status(200).json({ imageUrl: null });
  } catch {
    return res.status(200).json({ imageUrl: null });
  }
}
