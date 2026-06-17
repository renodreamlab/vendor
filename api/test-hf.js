import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export default async function handler(req, res) {
  const HF_TOKEN = process.env.HF_TOKEN;
  const CLIP_URL = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32";

  try {
    // 작은 테스트 이미지 URL 사용
    const imgRes = await fetch("https://kenden.kr/web/product/medium/202601/86fc6fcb3f85636c505caed0dd1cde8d.jpg");
    const imgBytes = await imgRes.arrayBuffer();

    const clipRes = await fetch(CLIP_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HF_TOKEN}` },
      body: imgBytes,
    });

    const status = clipRes.status;
    const text = await clipRes.text();
    return res.status(200).json({ status, response: text.slice(0, 300), token_prefix: HF_TOKEN?.slice(0,10) });
  } catch(e) {
    return res.status(200).json({ error: e.message, code: e.cause?.code, token_prefix: HF_TOKEN?.slice(0,10) });
  }
}
