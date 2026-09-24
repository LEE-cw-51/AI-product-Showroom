-- 파이프라인 6개 테이블 (Neon Postgres).
-- 쇼룸은 버전 단위로 저장해 수정 전후 성과를 비교한다.
--
-- 접근 모델
--   * 브라우저에서 DB 로 가는 경로가 없다. 모든 읽기·쓰기는 Next.js 서버가
--     DATABASE_URL 로 한다. 공개 페이지는 코드에서 status = 'published' 를 건다.
--   * 이벤트도 서버 라우트(/api/events)를 경유해서만 들어온다.
--   * Neon Data API 는 켜지 않는다. 켜게 되면 그때 RLS 를 붙인다.

-- 1. 상품 ---------------------------------------------------------------------
create table products (
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
  -- 원본 상품 페이지. 추적 링크가 없을 때 CTA 가 여기로 간다.
  product_url text not null,
  -- 발급된 추적 링크. 발급 전에는 null 이다.
  tracking_url text,
  status text not null default 'collected'
    check (status in ('collected', 'excluded', 'unavailable')),
  -- API 원본 전체. 응답에 필드가 추가되어도 마이그레이션 없이 흡수한다.
  raw jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index products_status_idx on products (status);
-- 가격·품절 재확인이 "가장 오래 확인 안 된 상품"을 집는 쿼리.
create index products_last_synced_at_idx on products (last_synced_at nulls first);

-- 2. 쇼룸 (상품당 1개) --------------------------------------------------------
create table showrooms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products (id) on delete cascade,
  -- 첫 초안에서 정해지고 바뀌지 않는다. 발행된 URL 을 깨지 않기 위해서다.
  slug text not null unique,
  current_version_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'paused')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index showrooms_status_idx on showrooms (status);

-- 3. 쇼룸 버전 ---------------------------------------------------------------
-- 초안 하나 = 버전 하나. 검수 상태는 쇼룸이 아니라 버전에 둔다 —
-- 발행된 v1 을 유지한 채 v2 를 검수받을 수 있어야 하기 때문이다.
create table showroom_versions (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references showrooms (id) on delete cascade,
  version integer not null,
  -- 분석 결과와 쇼룸 JSON 을 함께 보관한다. 수기 쇼룸은 분석이 없어 null.
  analysis jsonb,
  content jsonb not null,
  qa_result jsonb,
  prompt_version text not null,
  review_status text not null default 'review'
    check (review_status in ('review', 'failed', 'published', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (showroom_id, version)
);

-- 검수 큐 조회 경로.
create index showroom_versions_review_idx
  on showroom_versions (review_status, created_at desc);

-- 현재 버전 참조는 테이블 두 개가 서로를 가리키므로 나중에 붙인다.
alter table showrooms
  add constraint showrooms_current_version_fk
  foreign key (current_version_id)
  references showroom_versions (id) on delete set null;

-- 4. 파이프라인 실행 기록 -----------------------------------------------------
create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products (id) on delete cascade,
  stage text not null
    check (stage in ('collect', 'analyze', 'generate', 'qa', 'publish', 'measure', 'maintain')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'needs_review')),
  attempt integer not null default 1,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index pipeline_runs_stage_status_idx on pipeline_runs (stage, status);
create index pipeline_runs_product_started_idx on pipeline_runs (product_id, started_at desc);

-- 5. 이벤트 -------------------------------------------------------------------
create table events (
  id bigint generated always as identity primary key,
  showroom_id uuid not null references showrooms (id) on delete cascade,
  version_id uuid references showroom_versions (id) on delete set null,
  type text not null check (type in ('page_view', 'scroll_50', 'cta_click')),
  session_id text not null,
  referrer text,
  referrer_type text not null default 'direct'
    check (referrer_type in ('search', 'ai', 'social', 'direct')),
  created_at timestamptz not null default now()
);

-- 퍼널 집계는 항상 쇼룸 + 기간으로 자른다.
create index events_showroom_created_idx on events (showroom_id, created_at desc);
create index events_type_created_idx on events (type, created_at desc);
create index events_version_id_idx on events (version_id);

-- 6. 토스 실적 (일별) ---------------------------------------------------------
create table performance_daily (
  date date not null,
  product_id uuid not null references products (id) on delete cascade,
  clicks integer not null default 0,
  orders integer not null default 0,
  sales_amount bigint not null default 0,
  -- 기본 수수료 5% 기준 추정치. 프로모션 시 실제와 달라질 수 있다.
  est_commission bigint not null default 0,
  synced_at timestamptz not null default now(),
  primary key (date, product_id)
);

create index performance_daily_product_idx on performance_daily (product_id);
