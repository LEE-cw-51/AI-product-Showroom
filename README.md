# AI Product Showroom

상품 하나를 깊게 다루는 에디토리얼 쇼룸을 자동으로 만들고 발행하는 파이프라인.
현재 상태는 **M1 (기반과 쇼룸 1개)** 이다.

## 지금 되는 것

- 토스 쉐어링크 `product-detail` 응답 형태의 목업 상품 3개 (`fixtures/products/`)
- 쇼룸 JSON 스키마 (Zod) 와 그것을 렌더하는 고정 컴포넌트 8개
- 수기로 작성한 쇼룸 1개 — 승인 신청 시안 (`content/showrooms/narrow-sink-dish-rack.json`)
- SSG/ISR 쇼룸 페이지, `sitemap.xml`, `robots.txt` (AI 크롤러 허용), Article·FAQPage·BreadcrumbList JSON-LD
- 적용 대기 상태의 DB 마이그레이션 6개 테이블

## 아직 안 되는 것

토스 Open API 승인 전이라 실제 API 호출은 없다. AI 분석·생성(M2), 자동 QA·검수 큐(M2),
이벤트 수집·성과 대시보드(M3), 가격·품절 재확인(M3)은 다음 단계다.

## 실행

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_SITE_URL 만 있으면 쇼룸은 돈다
npm run dev
```

- 쇼룸: http://localhost:3000/showroom/narrow-sink-dish-rack
- 쇼룸 JSON 검증: `npm run validate:content`
- 빌드: `npm run build` (쇼룸이 SSG 목록에 나와야 한다)

## DB

마이그레이션은 작성만 되어 있고 적용하지 않았다. Supabase 프로젝트를 만든 뒤:

```bash
supabase link --project-ref <ref>
supabase db push
```

접근 모델: 발행된 쇼룸과 그 현재 버전만 공개 읽기이고, 나머지는 정책 없이 RLS 만 켜 둬
서버(`service_role`)만 접근한다. 이벤트 수집도 서버 라우트를 경유한다.

## 구조

```
app/(public)/showroom/[slug]/  쇼룸 페이지 (ISR, revalidate 1일)
components/showroom/           Summary·Hero·Problem·Benefits·Fit·Checklist·Faq·CtaSection
lib/ai/schemas/showroom.ts     쇼룸 JSON 의 단일 진실 공급원 (컴포넌트 props + M2 AI 생성)
lib/db/showrooms.ts            쇼룸 데이터 접근 창구. M2 에서 이 파일만 DB 로 바꾼다
lib/partners/                  AffiliateAdapter 인터페이스 + 토스 타입 + 픽스처 구현체
lib/seo/                       metadata, jsonld
lib/site.ts                    브랜드명·도메인·대가성 문구. 확정되면 이 파일만 고친다
supabase/migrations/           6개 테이블
fixtures/products/             API 응답 형태 목업
content/showrooms/             수기 쇼룸 JSON (M2 에서 showroom_versions 로 이관)
scripts/validate-content.mts   쇼룸 JSON 스키마 검증
```

## 코드에 박아둔 정책 제약

토스 쉐어링크 운영 정책에서 나온 것들이라 임의로 풀면 안 된다.

| 제약 | 어디에 |
| --- | --- |
| 대가성 문구를 끌 수 없다 | `CtaSection` 이 `DISCLOSURE` 상수를 직접 렌더 |
| 플로팅·고정 CTA 금지 | `CtaLink` 는 인라인 전용. `fixed`/`sticky` 를 쓰지 않는다 |
| 커머스형(가격 나열) 판정 회피 | JSON-LD 에 Product/Offer 없음. 본문에 가격 숫자를 쓰지 않고 확인 경로와 기준일만 |
| 사실은 API 값만 | 리뷰 수·평점은 `products` 값을 렌더. 쇼룸 JSON 에 수치를 담지 않는다 |
| 제한 카테고리 발행 차단 | M2 자동 QA 규칙 (아직 없음) |

## 참고

- [토스 쉐어링크 Open API](https://sharelink-docs.toss.im/developers/open-api/auth.md)
- [운영 정책](https://sharelink-docs.toss.im/help/operations/policy.md)
- Next.js 16 은 학습 데이터와 다르다. `node_modules/next/dist/docs/` 를 먼저 읽는다 (`AGENTS.md`)
