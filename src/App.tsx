// @ts-nocheck
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";

const DEFAULT_VENDORS = [
  { id:1,  name:"가구로드",    url:"https://m.gaguroad.com/",           search:"https://m.gaguroad.com/search?keyword={q}" },
  { id:2,  name:"가든프렌즈",  url:"https://www.b2bgarden.co.kr/",      search:"https://www.b2bgarden.co.kr/product/search.html?keyword={q}" },
  { id:3,  name:"금하무역",    url:"https://goldriver78.cafe24.com/",   search:"https://goldriver78.cafe24.com/product/search.html?keyword={q}" },
  { id:4,  name:"금풍무역",    url:"https://gppo5789.co.kr/",           search:"https://gppo5789.co.kr/product/search.html?keyword={q}" },
  { id:5,  name:"다나무",      url:"https://www.danamoo.co.kr/",        search:"https://www.danamoo.co.kr/product/search.html?keyword={q}" },
  { id:6,  name:"다원체어스",  url:"https://dawonchair.com/",           search:"https://dawonchair.com/product/search.html?keyword={q}" },
  { id:7,  name:"대승컴퍼니",  url:"https://www.idaeseung.kr/",         search:"https://www.idaeseung.kr/product/search.html?keyword={q}" },
  { id:8,  name:"루센가구",    url:"https://lusen.co.kr/",              search:"https://lusen.co.kr/product/search.html?keyword={q}" },
  { id:9,  name:"모빌리가구",  url:"https://mobily.co.kr/",             search:"https://mobily.co.kr/product/search.html?keyword={q}" },
  { id:10, name:"바오밥가구",  url:"https://www.designgagu.co.kr/",     search:"https://www.designgagu.co.kr/product/search.html?keyword={q}", warn:true },
  { id:11, name:"벨로스가구",  url:"https://bellos.kr/",                search:"https://bellos.kr/product/search.html?keyword={q}" },
  { id:12, name:"빅퍼스",      url:"https://vicfus.com/",               search:"https://vicfus.com/product/search.html?keyword={q}" },
  { id:13, name:"상원상사",    url:"https://swgagu.co.kr/",             search:"https://swgagu.co.kr/product/search.html?keyword={q}" },
  { id:14, name:"세광가구",    url:"https://gagucafe114.com/",          search:"https://gagucafe114.com/product/search.html?keyword={q}" },
  { id:15, name:"솔로몬가구",  url:"https://solomongagu.com/",          search:"https://solomongagu.com/product/search.html?keyword={q}" },
  { id:16, name:"아이엠가구",  url:"https://im9888.com/",               search:"https://im9888.com/product/search.html?keyword={q}" },
  { id:17, name:"아트랜드",    url:"https://k490515.cafe24.com/",       search:"https://k490515.cafe24.com/product/search.html?keyword={q}" },
  { id:18, name:"양지에이치앤",url:"https://yangjihn.com/",             search:"https://yangjihn.com/product/search.html?keyword={q}" },
  { id:19, name:"에프엠가구",  url:"https://fmgagu.com/",               search:"https://fmgagu.com/product/search.html?keyword={q}" },
  { id:20, name:"우주퍼니처",  url:"https://www.woojoof.co.kr/",        search:"https://www.woojoof.co.kr/product/search.html?keyword={q}", warn:true },
  { id:21, name:"은창플러스",  url:"https://www.ecgagu.co.kr/",         search:"https://www.ecgagu.co.kr/product/search.html?keyword={q}" },
  { id:22, name:"이나무로",    url:"https://www.enamuro.kr/",           search:"https://www.enamuro.kr/product/search.html?keyword={q}" },
  { id:23, name:"이앤피가구",  url:"https://enpgagu.com/",              search:"https://enpgagu.com/product/search.html?keyword={q}", warn:true },
  { id:24, name:"인컨셉가구",  url:"https://www.inconcept.co.kr/",      search:"https://www.inconcept.co.kr/product/search.html?keyword={q}", warn:true },
  { id:25, name:"캠버리가구",  url:"https://www.cambirry.co.kr/",       search:"https://www.cambirry.co.kr/product/search.html?keyword={q}", warn:true },
  { id:26, name:"켄덴",        url:"https://kenden.kr/",                search:"https://kenden.kr/product/search.html?keyword={q}" },
  { id:27, name:"케이브홈",    url:"https://kavehome.kr/ko",            search:"https://kavehome.kr/ko/search?q={q}" },
  { id:28, name:"파레트인",    url:"https://palletin.com/",             search:"https://palletin.com/product/search.html?keyword={q}" },
  { id:29, name:"포인플랜",    url:"https://foinplan.com/",             search:"https://foinplan.com/product/search.html?keyword={q}" },
  { id:30, name:"하디가구",    url:"https://www.hadi.co.kr/",           search:"https://www.hadi.co.kr/product/search.html?keyword={q}", warn:true },
  { id:31, name:"한국티에이",  url:"https://ikta.co.kr/",               search:"https://ikta.co.kr/product/search.html?keyword={q}" },
];

const CATS = ["의자","테이블","소파","침대","수납장","책상","선반","조명","철재가구","목재가구","야외가구"];

// ── Placeholder thumbnail color per vendor ───────────────
const SWATCH = ["#f1f5f9","#fce7f3","#dbeafe","#dcfce7","#fef9c3","#ede9fe","#ffedd5","#fdf2f8","#ecfeff","#fff7ed"];
const SWATCH_T = ["#475569","#9d174d","#1e40af","#166534","#92400e","#6d28d9","#c2410c","#86198f","#155e75","#c2410c"];
function thumbColors(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % SWATCH.length;
  return { bg: SWATCH[h], fg: SWATCH_T[h] };
}

// ── SVG icons ────────────────────────────────────────────
const IS = { display:"block", flexShrink:0 };
function IcSearch({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IcUpload({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}
function IcX({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IcSettings({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill={c} stroke="none" />
      <circle cx="16" cy="12" r="2" fill={c} stroke="none" />
      <circle cx="12" cy="18" r="2" fill={c} stroke="none" />
    </svg>
  );
}
function IcGlobe({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IcLink({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function IcTrash({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IcPlus({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IcGrid({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IcList({ size=16, c="currentColor", w=2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={IS}>
      <line x1="9" y1="6"  x2="20" y2="6"  /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6"  r="1.5" fill={c} stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill={c} stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill={c} stroke="none" />
    </svg>
  );
}

// ── Design tokens ─────────────────────────────────────────
const DARK = "#0f172a";
const MID  = "#64748b";
const BDR  = "#e2e8f0";
const cardSt  = { background:"#fff", borderRadius:"12px", padding:"20px", marginBottom:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", border:"1px solid #e8eaed" };
const labelSt = { fontSize:"11px", fontWeight:700, color:MID, letterSpacing:"1.5px", textTransform:"uppercase" };

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding:"6px 14px", borderRadius:"20px", fontSize:"12.5px", cursor:"pointer", transition:"all 0.15s", background:active ? DARK : "#fff", color:active ? "#fff" : "#374151", border:active ? "1px solid "+DARK : "1px solid "+BDR, fontWeight:active ? 700 : 400, display:"inline-flex", alignItems:"center", gap:"5px" }}>
      {children}
    </button>
  );
}

// ── Thumbnail placeholder ─────────────────────────────────
function Thumb({ vendor, size=140, radius=8 }) {
  const { bg, fg } = thumbColors(vendor);
  return (
    <div style={{ width:"100%", height:size, background:bg, borderRadius:radius+"px "+radius+"px 0 0", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"6px", flexShrink:0 }}>
      <div style={{ width:40, height:40, borderRadius:"50%", background:fg+"22", border:"2px solid "+fg+"33", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:"18px", fontWeight:800, color:fg }}>{vendor.charAt(0)}</span>
      </div>
      <span style={{ fontSize:"11px", color:fg, fontWeight:600, letterSpacing:"0.5px" }}>{vendor}</span>
    </div>
  );
}

function ThumbSquare({ vendor, size=72 }) {
  const { bg, fg } = thumbColors(vendor);
  return (
    <div style={{ width:size, height:size, background:bg, borderRadius:"8px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", flexShrink:0 }}>
      <span style={{ fontSize:"20px", fontWeight:800, color:fg }}>{vendor.charAt(0)}</span>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [vendors, setVendors]         = useState(DEFAULT_VENDORS);
  const [selVendors, setSelVendors]   = useState([]);
  const [selCats, setSelCats]         = useState([]);
  const [images, setImages]           = useState([]);
  const [searchText, setSearchText]   = useState("");
  const [searchRange, setSearchRange] = useState("vendors");
  const [matchType, setMatchType]     = useState("exact");
  const [results, setResults]         = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [aiMatches, setAiMatches]     = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [viewMode, setViewMode]       = useState("gallery"); // "gallery" | "list"
  const [showManager, setShowManager] = useState(false);
  const [newName, setNewName]         = useState("");
  const [newUrl, setNewUrl]           = useState("");
  const [error, setError]             = useState("");
  const [dropActive, setDropActive]   = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      const items = Array.from(e.clipboardData ? e.clipboardData.items : []);
      const files = items.filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()).filter(Boolean);
      if (files.length) addImages(files);
    };
    window.addEventListener("paste", fn);
    return () => window.removeEventListener("paste", fn);
  }, []);

  const addImages = (files) => {
    files.forEach(file => {
      const r = new FileReader();
      r.onload = (e) => {
        const b64 = e.target.result.split(",")[1];
        setImages(prev => [...prev, { id:Date.now()+Math.random(), preview:e.target.result, base64:b64, mediaType:file.type }]);
      };
      r.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDropActive(false);
    addImages(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")));
  }, []);

  const toggleVendor = (name) => setSelVendors(p => p.includes(name) ? p.filter(v => v !== name) : [...p, name]);
  const toggleCat    = (cat)  => setSelCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);

  const buildSearchUrl = (vendor, keyword) =>
    vendor.search ? vendor.search.replace("{q}", encodeURIComponent(keyword)) : vendor.url;

  const buildPrompt = (isImg, targetVendors, matchDesc, rangeDesc) => {
    const vendorList  = targetVendors.map(v => v.name + ": " + v.url).join("\n");
    const searchList  = targetVendors.map(v => v.name + ": " + (v.search ?? v.url)).join("\n");
    const onlineExtra = searchRange === "online"
      ? "\n국내외 온라인 모두 포함. 국내: 쿠팡·네이버쇼핑·G마켓·옥션·11번가. 해외: Amazon·IKEA·Wayfair·Alibaba·1688·AliExpress 등. 거래처 목록 외 결과도 포함 가능하며 이 경우 url은 실제 상품 또는 검색 페이지 URL 사용."
      : "";
    const catLine     = selCats.length > 0 ? "\n- 카테고리 필터: " + selCats.join(", ") : "";
    const kwLine      = searchText.trim() ? "\n- 참고 키워드: " + searchText.trim() : "";
    const jsonNote    = "반드시 JSON만 반환. 마크다운 코드블록 없이 순수 JSON만 출력.";
    const urlRule     = "url 필드: 아래 [검색URL]의 {q}를 search_keyword로 치환. 임의 제품 상세 URL 생성 금지.";
    const rSch = '{"vendor":"업체명","product_name":"예상제품명","url":"검색URL","confidence":85,"note":"형태 유사 근거"}';
    const aSch = '{"type":"가구유형","silhouette":"전체실루엣","leg_type":"다리구조","back_type":"등받이구조","seat_type":"좌판구조","distinctive_features":["특징1","특징2"]}';
    if (isImg) {
      const multiNote = images.length > 1
        ? `\n[중요] 첨부된 ${images.length}장의 이미지는 동일 제품의 다른 각도 사진입니다. 모든 이미지를 종합하여 제품의 형태를 정확히 파악하세요.`
        : "";
      return [
        "당신은 가구 형태 분석 전문가입니다. 첨부 이미지의 가구와 외형·실루엣이 동일하거나 매우 유사한 제품을 아래 거래처에서 찾아주세요.",
        multiNote,
        "",
        "[분석 우선순위 - 중요도 순]",
        "1. 전체 실루엣과 형태 (가장 중요)",
        "2. 다리 구조 (4발/U자/X자/캔틸레버/받침대 등)",
        "3. 등받이 구조 (유무/높이/형태)",
        "4. 좌판 형태 (사각/원형/곡선 등)",
        "5. 재질·색상은 부차적 요소 (동일 형태라면 색상 달라도 포함)",
        "",
        "[검색 조건]",
        "- 유형: " + matchDesc,
        "- 범위: " + rangeDesc + onlineExtra,
        catLine, kwLine,
        "",
        "[search_keyword 규칙]",
        "- 형태/구조 중심의 짧은 한국어 단어 (2~4글자)",
        "- 색상·재질 절대 포함 금지 (레드X, 플라스틱X, 나무X)",
        "- 예시: '의자', '스툴', '바체어', '소파', '1인소파', '등받이의자', '암체어'",
        "",
        "[거래처 목록]", vendorList, "",
        "[검색URL - {q}를 search_keyword로 치환]", searchList, "",
        urlRule, "", jsonNote, "",
        '응답 형식: {"furniture_analysis":' + aSch + ',"search_keyword":"의자","results":[' + rSch + ']}',
        "",
        "신뢰도 높은 순 최대 10건. note 필드에 형태 유사 근거 간략 기재."
      ].join("\n");
    } else {
      const q = [selCats.join(" "), searchText.trim()].filter(Boolean).join(" ");
      return [
        '당신은 가구 검색 전문가입니다. "' + q + '" 검색어에 맞는 가구를 아래 거래처에서 찾아주세요.',
        "",
        "[조건] 유형: " + matchDesc + " | 범위: " + rangeDesc + onlineExtra,
        "",
        "[search_keyword 규칙]",
        "- 한국 가구 도매몰에서 실제 검색되는 짧은 단어 (2~4글자)",
        "- 색상·재질 포함 금지. 예: '의자', '소파', '선반', '책상'",
        "",
        "[거래처 목록]", vendorList, "",
        "[검색URL - {q}를 search_keyword로 치환]", searchList, "",
        urlRule, "", jsonNote, "",
        '응답 형식: {"search_keyword":"' + q + '","results":[' + rSch + ']}',
        "",
        "최대 12건."
      ].join("\n");
    }
  };

  const handleSearch = async () => {
    if (!images.length && !searchText.trim() && selCats.length === 0) {
      setError("이미지를 첨부하거나 검색어 / 카테고리를 선택해주세요."); return;
    }
    setError(""); setIsSearching(true); setResults(null); setAiMatches([]); setSearchStatus("");

    const targetVendors = selVendors.length === 0 ? vendors : vendors.filter(v => selVendors.includes(v.name));

    try {
      // ══ 이미지 검색: 시각적 유사도 기반 ══════════════════════
      if (images.length > 0) {

        // Step 1: 가구 유형 파악 (탐색용 카테고리)
        setSearchStatus("이미지 분석 중...");
        const typeRes = await fetch("/api/claude", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            model:"gpt-4o-mini", max_tokens:20,
            messages:[{ role:"user", content:[
              ...images.map(img => ({ type:"image_url", image_url:{ url:`data:${img.mediaType};base64,${img.base64}`, detail:"low" } })),
              { type:"text", text:"이 가구의 종류를 한국어 단어 하나로만 답하세요. 예: 의자, 소파, 침대, 테이블, 선반, 책상, 조명. 다른 말 없이 단어만." }
            ]}],
          }),
        });
        const typeData = await typeRes.json();
        const furnitureType = typeData.choices?.[0]?.message?.content?.trim().replace(/[^가-힣a-zA-Z]/g,"") || "의자";

        // Step 2: 각 거래처 제품 스크래핑 (병렬)
        setSearchStatus(`거래처 ${targetVendors.length}곳에서 제품 수집 중...`);
        const scraped = await Promise.all(
          targetVendors.map(async (v) => {
            const url = v.search ? v.search.replace("{q}", encodeURIComponent(furnitureType)) : v.url;
            try {
              const r = await fetch(`/api/scrape-products?url=${encodeURIComponent(url)}`);
              const d = await r.json();
              return { vendor:v.name, vendorUrl:v.url, searchUrl:url, products: d.products || [] };
            } catch { return { vendor:v.name, vendorUrl:v.url, searchUrl:url, products:[] }; }
          })
        );

        // Step 3: 거래처별 시각 비교 (병렬)
        setSearchStatus("이미지 유사도 비교 중...");
        const qImg = images[0];
        const compared = await Promise.all(
          scraped.map(async (vr) => {
            if (!vr.products.length) return { ...vr, matches:[] };
            try {
              const r = await fetch("/api/compare-images", {
                method:"POST", headers:{ "Content-Type":"application/json" },
                body: JSON.stringify({
                  queryImage: qImg.base64, queryMediaType: qImg.mediaType,
                  products: vr.products.map(p => ({ ...p, vendor:vr.vendor })),
                }),
              });
              const d = await r.json();
              return { ...vr, matches: d.matches || [] };
            } catch { return { ...vr, matches:[] }; }
          })
        );

        // Step 4: 전체 매치 집계 → 유사도 순 정렬
        const allMatches = compared
          .flatMap(vr => vr.matches.map(m => ({ ...m, vendorUrl: vr.searchUrl })))
          .sort((a,b) => b.score - a.score);

        setResults({ mode:"visual", furnitureType, vendorResults: compared, allMatches });
        setAiMatches(allMatches);
        if (!allMatches.length) setError("유사한 제품을 찾지 못했습니다. 거래처를 더 선택하거나 다시 시도해보세요.");

      } else {
        // ══ 텍스트 검색: 키워드 기반 ═════════════════════════
        setSearchStatus("검색 중...");
        const matchDesc = matchType === "exact" ? "100% 동일 제품 (동일 모델)" : "유사한 디자인의 제품";
        const rangeDesc = searchRange === "vendors" ? "등록된 거래처 목록 내에서만" : "거래처 목록 + 일반 온라인 포함";
        const prompt = buildPrompt(false, targetVendors, matchDesc, rangeDesc);
        const res = await fetch("/api/claude", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ model:"gpt-4o", max_tokens:4000, messages:[{ role:"user", content:prompt }], response_format:{ type:"json_object" } }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message ?? "API error");
        const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
        const kw = (parsed.search_keyword ?? "").split(" ")[0] || "가구";
        if (parsed.results) {
          parsed.results = parsed.results.map(r => {
            const v = vendors.find(v => v.name === r.vendor);
            if (v) {
              const domain = new URL(v.url).hostname;
              r.url = v.search ? v.search.replace("{q}", encodeURIComponent(kw))
                               : `https://www.google.com/search?q=${encodeURIComponent(kw)}+site:${domain}`;
            }
            return r;
          });
        }
        setResults({ mode:"text", ...parsed });
        // 텍스트 검색도 제품 스크래핑
        if (parsed.results) {
          parsed.results.forEach((r, i) => {
            fetch(`/api/scrape-products?url=${encodeURIComponent(r.url)}`)
              .then(res => res.json())
              .then(d => {
                if (d.products?.length) {
                  setResults(prev => {
                    if (!prev?.results) return prev;
                    const next = { ...prev, results:[...prev.results] };
                    next.results[i] = { ...next.results[i], products: d.products };
                    return next;
                  });
                }
              }).catch(() => {});
          });
        }
      }
    } catch(e) {
      setError("검색 중 오류: " + (e?.message ?? "다시 시도해주세요."));
    } finally {
      setIsSearching(false); setSearchStatus("");
    }
  };

  const handleAiCompare = async () => {}; // 이미지 검색 시 자동 실행으로 통합됨

  const addVendor = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const url = newUrl.trim().startsWith("http") ? newUrl.trim() : "https://" + newUrl.trim();
    setVendors(p => [...p, { id:Date.now(), name:newName.trim(), url }].sort((a,b) => a.name.localeCompare(b.name,"ko")));
    setNewName(""); setNewUrl("");
  };

  const inSt = { width:"100%", padding:"10px 14px", border:"1px solid "+BDR, borderRadius:"8px", fontSize:"14px", outline:"none", boxSizing:"border-box" };

  // ── Result renderers ──────────────────────────────────────
  const Badge = ({ confidence }) => {
    const hi = confidence >= 80;
    return <div style={{ background: hi ? "#ecfdf5" : "#fefce8", color: hi ? "#065f46" : "#92400e", padding:"3px 8px", borderRadius:"10px", fontSize:"11px", fontWeight:700, whiteSpace:"nowrap" }}>{confidence}%</div>;
  };

  const OpenBtn = ({ url }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:DARK, color:"#fff", padding:"7px 14px", borderRadius:"6px", textDecoration:"none", fontSize:"12px", fontWeight:600 }}>
      <IcLink size={12} c="#fff" /> 상품 페이지
    </a>
  );

  // 거래처 카드 — 제품 여러 개 그리드
  const VendorCard = ({ r }) => {
    const warn = vendors.find(v => v.name === r.vendor)?.warn;
    const prods = r.products ?? (r.thumbnail ? [{ imageUrl: r.thumbnail, productUrl: r.url, name: r.product_name }] : []);
    return (
      <div style={{ background:"#fff", borderRadius:"12px", border:"1px solid #e8eaed", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        {/* 헤더 */}
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", fontWeight:800, color:DARK }}>
            {r.vendor}{warn && <span title="접속 오류 가능" style={{ marginLeft:"4px" }}>⚠️</span>}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <Badge confidence={r.confidence} />
            <OpenBtn url={r.url} />
          </div>
        </div>
        {/* 제품 이미지 그리드 */}
        {prods.length > 0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:"2px", padding:"2px", background:"#f8fafc" }}>
            {prods.map((p, i) => (
              <a key={i} href={p.productUrl || r.url} target="_blank" rel="noopener noreferrer"
                style={{ display:"block", aspectRatio:"1", overflow:"hidden", background:"#f1f5f9" }}>
                <img src={p.imageUrl} alt={p.name || r.vendor}
                  style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.transform="scale(1.05)"}
                  onMouseOut={e => e.currentTarget.style.transform="scale(1)"}
                  onError={e => { e.currentTarget.style.display="none"; }} />
              </a>
            ))}
          </div>
        ) : (
          <div style={{ height:"120px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Thumb vendor={r.vendor} size={120} radius={0} />
          </div>
        )}
        {r.note && <p style={{ fontSize:"11px", color:"#94a3b8", margin:0, padding:"8px 14px", lineHeight:1.4 }}>{r.note}</p>}
        {warn && <p style={{ fontSize:"11px", color:"#f59e0b", margin:0, padding:"0 14px 8px" }}>⚠️ 사이트 접속 오류가 발생할 수 있습니다</p>}
      </div>
    );
  };

  // Gallery card (하위 호환)
  const GalleryCard = ({ r }) => <VendorCard r={r} />;

  // List card
  const ListCard = ({ r }) => (
    <VendorCard r={r} />
  );

  return (
    <div style={{ fontFamily:"'Apple SD Gothic Neo','Malgun Gothic',sans-serif", minHeight:"100vh", background:"#f5f6f8" }}>

      {/* HEADER */}
      <header style={{ background:DARK, color:"#fff", padding:"0 28px", height:"60px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:50 }}>
        <div>
          <div style={{ fontSize:"18px", fontWeight:800, letterSpacing:"5px" }}>THE DETAIL</div>
          <div style={{ fontSize:"10px", color:"#475569", letterSpacing:"3px", marginTop:"2px" }}>VENDOR MAGIC SEARCH</div>
        </div>
        <button onClick={() => setShowManager(true)} style={{ background:"transparent", border:"1px solid #334155", color:"#94a3b8", padding:"7px 14px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:600, display:"flex", alignItems:"center", gap:"6px" }}>
          <IcSettings size={13} c="#94a3b8" /> 거래처 관리
        </button>
      </header>

      <main style={{ maxWidth:"1080px", margin:"0 auto", padding:"24px 16px" }}>

        {/* UPLOAD */}
        <div style={cardSt}>
          <div style={{ ...labelSt, marginBottom:"12px" }}>이미지 첨부</div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
            onDragLeave={() => setDropActive(false)}
            onClick={() => fileRef.current && fileRef.current.click()}
            style={{ border: dropActive ? "2px solid "+DARK : "2px dashed #d1d5db", borderRadius:"10px", padding:"28px 20px", textAlign:"center", cursor:"pointer", background: dropActive ? "#f0f4ff" : "#fafafa", transition:"all 0.15s" }}
          >
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"8px" }}>
              <IcUpload size={28} c="#94a3b8" w={1.5} />
            </div>
            <div style={{ fontSize:"14px", fontWeight:700, color:"#1e293b", marginBottom:"4px" }}>드래그앤드롭 · 클릭하여 파일 선택</div>
            <div style={{ fontSize:"12px", color:"#94a3b8" }}>Ctrl+V로 캡처 이미지 붙여넣기 · 여러 이미지 동시 검색 지원</div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => { addImages(Array.from(e.target.files)); e.target.value=""; }} style={{ display:"none" }} />
          </div>
          {images.length > 0 && (
            <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginTop:"14px" }}>
              {images.map(img => (
                <div key={img.id} style={{ position:"relative" }}>
                  <img src={img.preview} alt="" style={{ width:"90px", height:"90px", objectFit:"cover", borderRadius:"8px", border:"2px solid "+BDR }} />
                  <button onClick={() => setImages(p => p.filter(i => i.id !== img.id))} style={{ position:"absolute", top:"-6px", right:"-6px", width:"20px", height:"20px", borderRadius:"50%", background:"#ef4444", border:"2px solid #fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <IcX size={10} c="#fff" w={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VENDOR SELECTION */}
        <div style={cardSt}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
            <span style={labelSt}>거래처 선택</span>
            <button onClick={() => setSelVendors([])} style={{ fontSize:"12px", color:MID, background:"transparent", border:"1px solid "+BDR, padding:"4px 10px", borderRadius:"5px", cursor:"pointer" }}>선택해제</button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
            <Pill active={selVendors.length === 0} onClick={() => setSelVendors([])}>ALL</Pill>
            {vendors.map(v => (
              <Pill key={v.id} active={selVendors.includes(v.name)} onClick={() => toggleVendor(v.name)}>
                {v.name}{v.warn && <span title="사이트 접속 오류 가능" style={{ marginLeft:"3px", fontSize:"11px" }}>⚠️</span>}
              </Pill>
            ))}
          </div>
        </div>

        {/* SEARCH SETTINGS */}
        <div style={cardSt}>
          <div style={{ ...labelSt, marginBottom:"12px" }}>검색 설정</div>
          <input style={{ ...inSt, marginBottom:"14px" }} value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="검색어 입력 (예: 철재다리 의자, 원목 식탁...)" />
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"11px", fontWeight:600, color:MID, marginBottom:"8px" }}>카테고리</div>
            <div style={{ display:"flex", gap:"7px", flexWrap:"wrap" }}>
              <Pill active={selCats.length === 0} onClick={() => setSelCats([])}>전체</Pill>
              {CATS.map(cat => <Pill key={cat} active={selCats.includes(cat)} onClick={() => toggleCat(cat)}>{cat}</Pill>)}
            </div>
          </div>
          <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:"14px", display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"11px", color:MID, whiteSpace:"nowrap" }}>범위</span>
              <Pill active={searchRange === "vendors"} onClick={() => setSearchRange("vendors")}>거래처 내</Pill>
              <Pill active={searchRange === "online"} onClick={() => setSearchRange("online")}>
                <IcGlobe size={12} c={searchRange === "online" ? "#fff" : MID} /> 국내외 온라인
              </Pill>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"11px", color:MID, whiteSpace:"nowrap" }}>유형</span>
              <Pill active={matchType === "exact"}   onClick={() => setMatchType("exact")}>일치</Pill>
              <Pill active={matchType === "similar"} onClick={() => setMatchType("similar")}>비슷</Pill>
            </div>
            <button onClick={handleSearch} disabled={isSearching} style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px", padding:"10px 28px", background: isSearching ? MID : DARK, color:"#fff", border:"none", borderRadius:"8px", fontSize:"14px", fontWeight:700, cursor: isSearching ? "not-allowed" : "pointer" }}>
              <IcSearch size={15} c="#fff" /> {isSearching ? "검색 중..." : "검색"}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"12px 16px", color:"#dc2626", fontSize:"13px", marginBottom:"16px" }}>{error}</div>}

        {/* LOADING */}
        {isSearching && (
          <div style={{ textAlign:"center", padding:"56px 24px" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"16px" }}>
              <IcSearch size={36} c="#cbd5e1" />
            </div>
            <div style={{ fontSize:"15px", fontWeight:700, color:"#1e293b", marginBottom:"4px" }}>
              {images.length > 0 ? "이미지 유사도 기반으로 검색 중입니다" : "AI가 거래처를 검색하고 있습니다"}
            </div>
            <div style={{ fontSize:"13px", color:MID }}>{searchStatus || "잠시만 기다려주세요"}</div>
          </div>
        )}

        {/* RESULTS */}
        {results && !isSearching && (
          <div>
            {/* ── 이미지 검색 결과 ── */}
            {results.mode === "visual" && (
              <div>
                {/* 유사도 TOP 결과 */}
                {aiMatches.length > 0 && (
                  <div style={{ marginBottom:"20px" }}>
                    <div style={{ ...labelSt, marginBottom:"12px" }}>유사도 높은 제품 — {results.furnitureType} 기준</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"12px" }}>
                      {aiMatches.map((m, i) => (
                        <a key={i} href={m.productUrl} target="_blank" rel="noopener noreferrer"
                          style={{ textDecoration:"none", background:"#fff", borderRadius:"10px", overflow:"hidden", border: i===0 ? "2px solid "+DARK : "1px solid #e8eaed", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column" }}>
                          {i === 0 && <div style={{ background:DARK, color:"#fff", fontSize:"10px", fontWeight:700, textAlign:"center", padding:"3px" }}>최고 유사</div>}
                          <img src={m.imageUrl} alt={m.name} style={{ width:"100%", height:"140px", objectFit:"cover" }} onError={e => { e.currentTarget.style.display="none"; }} />
                          <div style={{ padding:"8px 10px" }}>
                            <div style={{ fontSize:"11px", fontWeight:700, color:MID }}>{m.vendor}</div>
                            <div style={{ fontSize:"12px", fontWeight:600, color:"#1e293b", marginTop:"2px", lineHeight:1.3 }}>{m.name || "제품 보기"}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:"4px", marginTop:"5px" }}>
                              <div style={{ background: m.score>=80?"#dcfce7":"#fef9c3", color: m.score>=80?"#166534":"#92400e", padding:"2px 7px", borderRadius:"10px", fontSize:"11px", fontWeight:700 }}>{m.score}점</div>
                              <span style={{ fontSize:"10px", color:"#94a3b8" }}>{m.reason}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 거래처별 전체 제품 그리드 */}
                <div style={{ ...labelSt, marginBottom:"12px" }}>거래처별 수집 제품</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {results.vendorResults && results.vendorResults.map((vr, i) => (
                    <div key={i} style={{ background:"#fff", borderRadius:"12px", border:"1px solid #e8eaed", overflow:"hidden" }}>
                      <div style={{ padding:"10px 14px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:"13px", fontWeight:800, color:DARK }}>
                          {vr.vendor}{vendors.find(v=>v.name===vr.vendor)?.warn && <span style={{ marginLeft:"4px" }}>⚠️</span>}
                        </span>
                        <a href={vr.searchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:"11px", color:MID, textDecoration:"none" }}>전체 보기 →</a>
                      </div>
                      {vr.products.length > 0 ? (
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))", gap:"2px", padding:"2px", background:"#f8fafc" }}>
                          {vr.products.map((p, j) => {
                            const isMatch = vr.matches?.some(m => m.imageUrl === p.imageUrl);
                            return (
                              <a key={j} href={p.productUrl || vr.searchUrl} target="_blank" rel="noopener noreferrer"
                                style={{ display:"block", aspectRatio:"1", overflow:"hidden", position:"relative", outline: isMatch ? "3px solid "+DARK : "none" }}>
                                <img src={p.imageUrl} alt={p.name}
                                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                                  onError={e => { e.currentTarget.parentElement.style.display="none"; }} />
                                {isMatch && <div style={{ position:"absolute", top:"2px", right:"2px", background:DARK, color:"#fff", borderRadius:"50%", width:"16px", height:"16px", fontSize:"9px", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>✓</div>}
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ padding:"16px", fontSize:"12px", color:MID, textAlign:"center" }}>제품을 가져오지 못했습니다</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 텍스트 검색 결과 ── */}
            {results.mode === "text" && (
              <div>
                <div style={{ fontSize:"13px", fontWeight:700, color:"#374151", marginBottom:"14px" }}>
                  검색 결과 <span style={{ color:DARK }}>{results.results ? results.results.length : 0}건</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"14px" }}>
                  {results.results && results.results.map((r, i) => <GalleryCard key={i} r={r} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* VENDOR MANAGER MODAL */}
      {showManager && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"16px" }}>
          <div style={{ background:"#fff", borderRadius:"16px", width:"100%", maxWidth:"580px", maxHeight:"82vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid "+BDR, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:"15px", fontWeight:800, color:DARK }}>거래처 관리</div>
              <button onClick={() => setShowManager(false)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", padding:"4px" }}>
                <IcX size={20} c={MID} />
              </button>
            </div>
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ ...labelSt, marginBottom:"8px" }}>거래처 추가</div>
              <div style={{ display:"flex", gap:"8px" }}>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="업체명" style={{ flex:"0 0 110px", padding:"8px 12px", border:"1px solid "+BDR, borderRadius:"6px", fontSize:"13px", outline:"none" }} />
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addVendor()} placeholder="https://example.com" style={{ flex:1, padding:"8px 12px", border:"1px solid "+BDR, borderRadius:"6px", fontSize:"13px", outline:"none" }} />
                <button onClick={addVendor} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"8px 14px", background:DARK, color:"#fff", border:"none", borderRadius:"6px", fontSize:"13px", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                  <IcPlus size={13} c="#fff" /> 추가
                </button>
              </div>
            </div>
            <div style={{ overflowY:"auto", flex:1, padding:"8px 24px" }}>
              <div style={{ ...labelSt, padding:"10px 0 6px", borderBottom:"1px solid #f1f5f9" }}>전체 {vendors.length}개 거래처</div>
              {vendors.map(v => (
                <div key={v.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 0", borderBottom:"1px solid #f8fafc" }}>
                  <div style={{ flex:"0 0 90px", fontSize:"13px", fontWeight:700, color:"#1e293b" }}>{v.name}</div>
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ flex:1, fontSize:"12px", color:MID, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration:"none" }}>{v.url}</a>
                  <button onClick={() => { setVendors(p => p.filter(x => x.id !== v.id)); setSelVendors(p => p.filter(n => n !== v.name)); }} style={{ display:"flex", alignItems:"center", gap:"4px", padding:"4px 10px", background:"transparent", border:"1px solid #fecaca", color:"#ef4444", borderRadius:"5px", fontSize:"12px", cursor:"pointer", whiteSpace:"nowrap" }}>
                    <IcTrash size={11} c="#ef4444" /> 삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
