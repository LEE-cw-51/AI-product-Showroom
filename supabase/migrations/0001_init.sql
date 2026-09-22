-- M1: 파이프라인 6개 테이블.
-- 쇼룸은 버전 단위로 저장해 수정 전후 성과를 비교한다.
--
-- 접근 모델
--   * 공개 읽기: 발행된(published) 쇼룸과 그 현재 버전만.
--   * 그 외 모든 읽기·쓰기: 서버(service_role)만. service_role 은 RLS 를 우회하므로
--     쓰기 정책을 따로 만들지 않는다 = anon 에게는 쓰기 경로가 없다.
--   * 관리자 화면(M2)은 Supabase Auth 로그인 뒤 서버 경유로 읽는다.

create extension if not exists pgcrypto;

-- 1. 상품 ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  -- API 가 number 로 주므로 bigint. taca_item_id 가 조회·발행의 실제 키다.
  taca_id bigint not null,
  taca_item_id bigint not null unique,
  name text not null,
  display_price integer not null,
  original_price integer not null,
  discount_rate integer not null default 0,
  review_score numeric(2, 1),
  review_count integer not null default 0,
  category_ids bigint[] not null default '{}',
  detail_html_url text,
  is_sold_out boolean not null default false,
  -- 발급된 추적 링크. 발급 전에는 null 이고, CTA 는 발행 시점에 이 값을 요구한다.
  tracking_url text,
  status text not null default 'collected'
    check (status in ('collected', 'excluded', 'unavailable')),
  -- API 원본 전체. 응답에 필드가 추가되어도 마이그레이션 없이 흡수한다.
  raw jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index products_status_idx on public.products (status);
-- 7단계(가격·품절 재확인)가 "가장 오래 확인 안 된 상품"을 집는 쿼리.
create index products_last_synced_at_idx on public.products (last_synced_at nulls first);

-- 2. 쇼룸 (상품당 1개) --------------------------------------------------------
create table public.showrooms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  slug text not null unique,
  current_version_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'paused')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index showrooms_status_idx on public.showrooms (status);

-- 3. 쇼룸 버전 ---------------------------------------------------------------
create table public.showroom_versions (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  version integer not null,
  -- 2단계 분석 결과와 3단계 쇼룸 JSON 을 함께 보관한다.
  analysis jsonb not null default '{}'::jsonb,
  content jsonb not null,
  qa_result jsonb,
  prompt_version text not null,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (showroom_id, version)
);

-- 현재 버전 참조는 테이블 두 개가 서로를 가리키므로 나중에 붙인다.
alter table public.showrooms
  add constraint showrooms_current_version_fk
  foreign key (current_version_id)
  references public.showroom_versions (id) on delete set null;

-- 4. 파이프라인 실행 기록 -----------------------------------------------------
create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  stage text not null
    check (stage in ('collect', 'analyze', 'generate', 'qa', 'publish', 'measure', 'maintain')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'needs_review')),
  attempt integer not null default 1,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 검수 큐 화면과 재시도 판단이 쓰는 조회 경로.
create index pipeline_runs_stage_status_idx on public.pipeline_runs (stage, status);
create index pipeline_runs_product_started_idx on public.pipeline_runs (product_id, started_at desc);

-- 5. 이벤트 -------------------------------------------------------------------
create table public.events (
  id bigserial primary key,
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  version_id uuid references public.showroom_versions (id) on delete set null,
  type text not null check (type in ('page_view', 'scroll_50', 'cta_click')),
  session_id text not null,
  referrer text,
  referrer_type text not null default 'direct'
    check (referrer_type in ('search', 'ai', 'social', 'direct')),
  created_at timestamptz not null default now()
);

-- 퍼널 집계는 항상 쇼룸 + 기간으로 자른다.
create index events_showroom_created_idx on public.events (showroom_id, created_at desc);
create index events_type_created_idx on public.events (type, created_at desc);

-- 6. 토스 실적 (일별) ---------------------------------------------------------
create table public.performance_daily (
  date date not null,
  product_id uuid not null references public.products (id) on delete cascade,
  clicks integer not null default 0,
  orders integer not null default 0,
  sales_amount bigint not null default 0,
  -- 기본 수수료 5% 기준 추정치. 프로모션 시 실제와 달라질 수 있다.
  est_commission bigint not null default 0,
  synced_at timestamptz not null default now(),
  primary key (date, product_id)
);

-- RLS ------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.showrooms enable row level security;
alter table public.showroom_versions enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.events enable row level security;
alter table public.performance_daily enable row level security;

-- 발행된 쇼룸만 공개 읽기.
create policy "published showrooms are public"
  on public.showrooms
  for select
  to anon, authenticated
  using (status = 'published');

-- 발행된 쇼룸의 현재 버전만 공개 읽기.
create policy "published showroom versions are public"
  on public.showroom_versions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.showrooms s
      where s.current_version_id = showroom_versions.id
        and s.status = 'published'
    )
  );

-- products, pipeline_runs, events, performance_daily 에는 정책을 만들지 않는다.
-- RLS 가 켜져 있고 정책이 없으면 anon/authenticated 는 아무 행도 보지 못하며,
-- 서버의 service_role 만 접근한다. 이벤트 수집도 서버 라우트를 경유한다.
