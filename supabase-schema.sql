-- 벡터 확장 활성화
create extension if not exists vector;

-- 제품 인덱스 테이블
create table if not exists products (
  id          bigserial primary key,
  vendor      text not null,
  product_url text not null,
  image_url   text not null,
  description text,
  embedding   vector(1536),
  indexed_at  timestamptz default now(),
  unique(image_url)
);

-- 벡터 유사도 인덱스
create index if not exists products_embedding_idx
  on products using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- RLS 비활성화 (내부 전용 도구)
alter table products disable row level security;

-- 유사도 검색 함수
create or replace function search_products(
  query_embedding  vector(1536),
  match_threshold  float   default 0.5,
  match_count      int     default 10
)
returns table (
  vendor       text,
  product_url  text,
  image_url    text,
  description  text,
  similarity   float
)
language sql stable as $$
  select
    p.vendor,
    p.product_url,
    p.image_url,
    p.description,
    1 - (p.embedding <=> query_embedding) as similarity
  from products p
  where 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
