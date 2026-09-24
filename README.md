# AI Product Showroom

상품 하나를 깊게 다루는 에디토리얼 쇼룸을 자동으로 만들고 발행하는 파이프라인.
현재 상태는 **M3-b (3D 쇼룸과 가격 비저장)** 이다.

배포는 Vercel 프로젝트 하나다. 상품이 늘어도 `/showroom/[slug]` 한 라우트가 DB 행을 읽어
그리고, 승인하면 재배포 없이 열린다. 3D 연출도 템플릿 하나에 상품별 데이터(`visual`)를 넣는 방식이다.

## 지금 되는 것

- 토스 쉐어링크 `product-detail` 응답 형태의 목업 상품 3개 (`fixtures/products/`)
- 쇼룸 JSON 스키마 (Zod) 와 그것을 렌더하는 고정 컴포넌트 8개
- AI 분석·생성 → 자동 QA → 검수 큐(`/admin/review`) → 승인 시 발행 (M2)
- 쇼룸·초안·상품을 Neon Postgres 에 저장. 초안 하나가 `showroom_versions` 한 행이다
- 빌드 뒤에 승인한 쇼룸도 재배포 없이 열린다 (`dynamicParams = true` + `revalidatePath`)
- 쇼룸 퍼널 이벤트 수집: `page_view`, `scroll_50`, `cta_click` → `events` 테이블.
  유입 채널(검색·AI·소셜·직접)과 공개 중인 버전을 함께 기록한다
- 첫 화면 3D 무대: 상품 사진을 WebGL 씬에 올린다 (프리셋 `float`·`stack`·`stage`, 팔레트 5개).
  AI 가 상품마다 `visual` 을 고르고, 서버 HTML 에는 대표 사진만 있어 3D 를 못 쓰는 환경에서도 본문은 같다
- 상품 가격을 저장하지 않는다. 가격은 생성·QA 때 메모리에서만 쓴다
- SSG/ISR 쇼룸 페이지, `sitemap.xml`, `robots.txt` (AI 크롤러 허용), Article·FAQPage·BreadcrumbList JSON-LD

## 아직 안 되는 것

토스 Open API 승인 전이라 실제 API 호출은 없다. 성과 대시보드, 품절 확인 작업,
토스 실적(`performance_daily`) 동기화, 이벤트 레이트 리밋은 다음 단계다.

## 실행

```bash
npm install
cp .env.example .env.local     # DATABASE_URL (Neon) 과 NEXT_PUBLIC_SITE_URL 을 채운다
npm run db:migrate             # db/migrations/*.sql 적용 (적용 기록은 schema_migrations)
npm run db:seed                # 픽스처 상품 + content/ 의 초안·쇼룸을 DB 로. 여러 번 돌려도 같다
npm run dev
```

- 쇼룸: http://localhost:3000/showroom/narrow-sink-dish-rack
- 초안 생성: `npm run pipeline -- <tacaItemId>` (`ANTHROPIC_API_KEY` 필요)
- 검수 큐: http://localhost:3000/admin/review (`ADMIN_SECRET` 필요)
- 테스트: `npm test` (QA 규칙, 유입 채널 분류, 스키마 버전)
- 쇼룸 JSON 검증: `npm run validate:content`
- 빌드: `npm run build` (DB 에서 발행된 쇼룸을 읽어 SSG 한다)

## DB

Neon Postgres 를 쓴다. 이 앱은 로그인·파일 저장소·브라우저 직접 쿼리가 필요 없고
서버에서만 테이블을 읽고 쓰므로, 안 쓸 때 잠드는 서버리스 Postgres 가 맞다.

접근 모델: 브라우저에서 DB 로 가는 경로가 없다. 모든 읽기·쓰기는 서버가 `DATABASE_URL` 로 한다.
공개 페이지는 코드에서 `status = 'published'` 만 읽고, 이벤트도 `/api/events` 를 경유한다.

마이그레이션을 추가하면 `lib/db/client.ts` 의 `SCHEMA_VERSION` 도 올린다. 쿼리가 fetch 라서
Next 데이터 캐시에 들어가는데, 버전이 캐시 키에 들어가야 스키마가 바뀐 뒤 옛 행 모양을 돌려받지 않는다
(`npm test` 가 어긋나면 실패한다).

`content/` 의 JSON 은 앱이 읽지 않는다. 새 DB(브랜치)를 채우는 시드로만 남긴다.

## 구조

```
app/(public)/showroom/[slug]/  쇼룸 페이지 (ISR, revalidate 1일)
app/api/events/                퍼널 이벤트 수집 (응답 뒤 after() 로 기록)
app/admin/                     검수 큐
components/showroom/           Summary·Hero·Problem·Benefits·Fit·Checklist·Faq·CtaSection + ShowroomTracker
components/showroom/scene/     3D 무대 (ShowroomStage: 사진 → WebGL 전환, ShowroomScene: 프리셋 3개, palettes)
lib/ai/                        스키마·생성·자동 QA
lib/db/                        client(Neon) · showrooms(공개 읽기) · products
lib/pipeline/drafts.ts         초안(버전) 읽기·쓰기·승인·반려
lib/events/referrer.ts         유입 채널 분류
lib/partners/                  AffiliateAdapter 인터페이스 + 토스 타입 + 픽스처 구현체
lib/seo/                       metadata, jsonld
lib/showroom/images.ts         이미지 URL → 화면 src (픽스처 호스트는 public/fixtures 로)
lib/site.ts                    브랜드명·도메인·대가성 문구. 확정되면 이 파일만 고친다
db/migrations/                 6개 테이블 + 0002 가격 컬럼 제거
fixtures/products/             API 응답 형태 목업 (이미지는 public/fixtures 의 자리표시 그림)
content/                       시드용 초안·쇼룸 JSON
scripts/                       db-migrate · seed-db · pipeline · validate-content
```

## 코드에 박아둔 정책 제약

토스 쉐어링크 운영 정책에서 나온 것들이라 임의로 풀면 안 된다.

| 제약 | 어디에 |
| --- | --- |
| 대가성 문구를 끌 수 없다 | `CtaSection` 이 `DISCLOSURE` 상수를 직접 렌더 |
| 플로팅·고정 CTA 금지 | `CtaLink` 는 인라인 전용. `fixed`/`sticky` 를 쓰지 않는다 |
| 가격을 저장하지 않는다 | `products` 에 가격 컬럼·API 원본이 없다. 가격은 파이프라인 메모리에서 QA 에만 쓴다 (Open API 승인 반려 사유: 가격을 DB 에 저장하는 커머스형 사이트) |
| 쇼핑몰 목록처럼 만들지 않는다 | 홈은 대표 사진·제목·요약 피드. 가격·할인율·정렬·필터·장바구니를 두지 않는다 |
| 커머스형(가격 나열) 판정 회피 | JSON-LD 에 Product/Offer 없음. 본문에 가격 숫자를 쓰지 않고 확인 경로와 기준일만 |
| 사실은 API 값만 | 리뷰 수·평점은 `products` 값을 렌더. 쇼룸 JSON 에 수치를 담지 않는다 |
| 제한 카테고리 발행 차단 | 자동 QA `restricted_category` 규칙 |
| 발행된 URL 은 바뀌지 않는다 | 쇼룸 slug 는 첫 초안에서 정해지고, slug 가 바뀐 초안은 승인 거부 |

## 토스 Open API 신청 준비물

쉐어링크 크리에이터 관리자(`sharelink.toss.im`) → API 연동 메뉴에서 신청한다. 심사는 영업일 5일 이내.

- [ ] Vercel 에 배포하고 `DATABASE_URL`·`NEXT_PUBLIC_SITE_URL`·`ADMIN_SECRET` 설정
- [ ] 쇼룸 몇 개를 발행 상태로 두기
- [ ] 서비스 유형: 웹사이트. 서비스명 `SITE.name`, URL
- [ ] 노출 방식: 글 본문 안 인라인 CTA, 대가성 문구 고정. 플로팅·고정 배너 없음
- [ ] 화면 이미지: 쇼룸 첫 화면(3D), CTA 영역, 홈 피드, `/about`

## 참고

- [토스 쉐어링크 Open API](https://sharelink-docs.toss.im/developers/open-api/auth.md)
- [운영 정책](https://sharelink-docs.toss.im/help/operations/policy.md)
- Next.js 16 은 학습 데이터와 다르다. `node_modules/next/dist/docs/` 를 먼저 읽는다 (`AGENTS.md`)
