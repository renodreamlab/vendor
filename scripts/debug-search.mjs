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

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
const OPENAI = env.OPENAI_API_KEY;

// 1. DB 저장 건수
console.log("1. DB 저장 건수 확인...");
const { count, error: cntErr } = await supabase
  .from("products").select("*", { count:"exact", head:true });
console.log(`   총 ${count}개 저장됨 ${cntErr ? "(오류: "+cntErr.message+")" : ""}`);

const { data: sample } = await supabase
  .from("products").select("vendor,description,image_url").limit(3);
console.log("   샘플:", sample?.map(r => `${r.vendor}: ${r.description?.slice(0,30)}`));

// 2. 검색 함수 테스트 (웨이브 의자 설명으로)
console.log("\n2. 벡터 검색 테스트...");
const testDesc = "나비 모양 등받이, 물결 무늬 텍스처, 4발 금속 다리, 적층 플라스틱 의자";
const embRes = await fetch("https://api.openai.com/v1/embeddings", {
  method:"POST",
  headers:{ "Content-Type":"application/json","Authorization":`Bearer ${OPENAI}` },
  body: JSON.stringify({ model:"text-embedding-3-small", input: testDesc }),
});
const embData = await embRes.json();
const embedding = embData.data?.[0]?.embedding;
console.log(`   임베딩 생성: ${embedding ? "성공" : "실패"}`);

if (embedding) {
  const { data: results, error: searchErr } = await supabase.rpc("search_products", {
    query_embedding: embedding,
    match_threshold: 0.3,  // 낮게 설정해서 뭐라도 나오는지 확인
    match_count: 5,
  });
  console.log(`   검색 결과: ${results?.length ?? 0}건 ${searchErr ? "(오류: "+searchErr.message+")" : ""}`);
  results?.forEach(r => console.log(`   - ${r.vendor}: ${r.description?.slice(0,40)} (유사도: ${(r.similarity*100).toFixed(1)}%)`));
}
