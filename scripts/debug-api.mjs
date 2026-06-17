import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env"), "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const OPENAI = env.OPENAI_API_KEY;
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

// 1. 이미지 fetch 테스트
console.log("1. 이미지 fetch 테스트...");
const imgUrl = "https://kenden.kr/web/product/medium/202601/86fc6fcb3f85636c505caed0dd1cde8d.jpg";
const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
console.log(`   상태: ${imgRes.status}, Content-Type: ${imgRes.headers.get("content-type")}`);

// 2. OpenAI vision 테스트
console.log("2. OpenAI vision 테스트...");
const buf = await imgRes.arrayBuffer();
const b64 = Buffer.from(buf).toString("base64");
const ct = imgRes.headers.get("content-type") || "image/jpeg";
const visRes = await fetch("https://api.openai.com/v1/chat/completions", {
  method:"POST",
  headers:{ "Content-Type":"application/json","Authorization":`Bearer ${OPENAI}` },
  body: JSON.stringify({
    model:"gpt-4o-mini", max_tokens:100,
    messages:[{ role:"user", content:[
      { type:"image_url", image_url:{ url:`data:${ct};base64,${b64}`, detail:"low" } },
      { type:"text", text:"이 가구를 10자 이내로 설명." }
    ]}],
  }),
});
const visData = await visRes.json();
console.log(`   응답:`, visData.choices?.[0]?.message?.content ?? visData.error);

// 3. Embedding 테스트
console.log("3. Embedding 테스트...");
const embRes = await fetch("https://api.openai.com/v1/embeddings", {
  method:"POST",
  headers:{ "Content-Type":"application/json","Authorization":`Bearer ${OPENAI}` },
  body: JSON.stringify({ model:"text-embedding-3-small", input:"의자 테스트" }),
});
const embData = await embRes.json();
console.log(`   벡터 길이: ${embData.data?.[0]?.embedding?.length ?? "실패"}`);

// 4. Supabase insert 테스트
console.log("4. Supabase insert 테스트...");
const { error } = await supabase.from("products").upsert({
  vendor: "테스트",
  product_url: "https://test.com/product/1",
  image_url: imgUrl,
  description: "테스트 의자",
  embedding: embData.data?.[0]?.embedding,
}, { onConflict:"image_url" });
console.log(`   결과: ${error ? "오류: "+error.message : "성공 ✓"}`);
