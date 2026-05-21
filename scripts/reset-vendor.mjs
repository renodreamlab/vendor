// 특정 거래처 데이터 삭제 후 재인덱싱
// 사용법: node scripts/reset-vendor.mjs 켄덴
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env"), "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
const vendor = process.argv[2];
if (!vendor) { console.log("사용법: node scripts/reset-vendor.mjs 거래처명"); process.exit(1); }

const { error, count } = await supabase.from("products").delete().eq("vendor", vendor);
console.log(error ? `오류: ${error.message}` : `✓ ${vendor} 데이터 삭제 완료`);
