export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { url } = req.query;
  if (!url) return res.status(400).json({ products: [] });

  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) return res.status(200).json({ products: [] });

    const html = await r.text();
    const base = new URL(decodeURIComponent(url));

    const resolve = (src) => {
      if (!src) return null;
      src = src.trim();
      if (src.startsWith("//")) return "https:" + src;
      if (src.startsWith("/")) return base.origin + src;
      if (src.startsWith("http")) return src;
      return null;
    };

    const products = [];

    // ── cafe24 패턴 ──────────────────────────────────────────
    // <li class="xans-record-"> 블록 반복
    const cafe24Items = html.matchAll(
      /<li[^>]+class="[^"]*xans-record-[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
    );
    for (const m of cafe24Items) {
      const block = m[1];
      const imgM = block.match(/src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"[^>]*(?:id="[^"]*zoom|class="[^"]*")/i)
        || block.match(/src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i);
      const hrefM = block.match(/href="([^"]+\/product\/[^"]+)"/i)
        || block.match(/href="([^"]+\/goods\/[^"]+)"/i);
      const nameM = block.match(/class="[^"]*name[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]{2,60})<\/a>/i)
        || block.match(/<a[^>]+title="([^"]{2,60})"/i);
      if (imgM && hrefM) {
        const img = resolve(imgM[1]);
        const href = hrefM[1].startsWith("http") ? hrefM[1] : base.origin + hrefM[1];
        if (img && !img.includes("logo") && !img.includes("banner")) {
          products.push({ imageUrl: img, productUrl: href, name: nameM?.[1]?.trim() ?? "" });
          if (products.length >= 20) break;
        }
      }
    }

    // ── Godomall / 일반 상품 목록 패턴 ───────────────────────
    if (products.length < 5) {
      const genericItems = html.matchAll(
        /<(?:li|div)[^>]+class="[^"]*(?:item|goods|product)[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div)>/gi
      );
      for (const m of genericItems) {
        const block = m[1];
        const imgM = block.match(/src="([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)"/i);
        const hrefM = block.match(/href="([^"']+)"/i);
        if (imgM && hrefM) {
          const img = resolve(imgM[1]);
          const href = hrefM[1].startsWith("http") ? hrefM[1] : base.origin + hrefM[1];
          if (img && !img.includes("logo") && !img.includes("banner") && !img.includes("icon")) {
            products.push({ imageUrl: img, productUrl: href, name: "" });
            if (products.length >= 20) break;
          }
        }
      }
    }

    return res.status(200).json({ products: products.slice(0, 20) });
  } catch {
    return res.status(200).json({ products: [] });
  }
}
