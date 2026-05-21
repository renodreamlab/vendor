// 카테고리 페이지 테스트
const urls = [
  "https://kenden.kr/product/list.html?cate_no=31",
  "https://kenden.kr/product/list.html?cate_no=1",
  "https://kenden.kr/product/list.html",
];

for (const url of urls) {
  const r = await fetch(url, {
    headers: { "User-Agent":"Mozilla/5.0 Chrome/124.0" },
    signal: AbortSignal.timeout(8000),
  });
  const html = await r.text();
  const imgs = [...html.matchAll(/src="([^"']+\/web\/product\/(?:medium|large|big)\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)"/gi)];
  const hrefs = [...html.matchAll(/href="([^"']*\/product\/[^"']*\/\d+[^"']*)"/gi)];
  console.log(`${url}: 이미지 ${imgs.length}개, href ${hrefs.length}개`);
  if (imgs.length > 0) console.log("  첫 이미지:", imgs[0][1]);
}
