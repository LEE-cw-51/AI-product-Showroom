-- 상품 가격을 저장하지 않는다.
--
-- 토스 쉐어링크 Open API 승인 기준에서 "상품 가격을 DB 에 저장하고 쇼핑몰처럼
-- 노출하거나 가격을 비교하는 커머스형 웹사이트"는 반려 사유다.
-- 가격은 파이프라인 메모리에서 QA(본문 가격 누출 검사)에만 쓰고 버린다.
-- API 원본(raw)도 가격을 담고 있어 함께 지운다. 필요한 이미지 URL 만 컬럼으로 남긴다.

alter table products add column image_urls text[] not null default '{}';

-- 썸네일 → 메인 → 상세 순서, 중복 제거.
update products p
   set image_urls = coalesce((
     select array_agg(u order by first_ord)
       from (
         select u, min(ord) as first_ord
           from jsonb_array_elements_text(
                  jsonb_build_array(p.raw -> 'thumbnailUrl')
                  || coalesce(p.raw -> 'mainImageUrls', '[]'::jsonb)
                  || coalesce(p.raw -> 'description' -> 'detailImageUrls', '[]'::jsonb)
                ) with ordinality as t(u, ord)
          where u is not null
          group by u
       ) urls
   ), '{}');

-- 가격 재확인 Cron 을 두지 않으므로 그 쿼리용 인덱스도 뺀다.
-- last_synced_at 은 품절 확인에 계속 쓴다.
drop index if exists products_last_synced_at_idx;

alter table products
  drop column display_price,
  drop column original_price,
  drop column discount_rate,
  drop column raw;
