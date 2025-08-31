![next-nexus 로고](https://raw.githubusercontent.com/vgotu99/next-nexus-docs/7b34074056d4b60e8afc4ceaa859bf48bf717ed0/public/logo.svg)

<h1 style="display: flex; justify-content: space-between;">
  next-nexus
  <div>
    <img alt="This page: Korean" src="https://img.shields.io/badge/This_page-Korean-F8F0E3" />
    <a href="./README.md">
      <img alt="Switch to English" src="https://img.shields.io/badge/Switch_to-English-303234" />
    </a>
  </div>
</h1>

Next.js를 위한 지능형 데이터 레이어. 자동화된 캐싱과 매끄러운 하이드레이션, 내장된 비용 절감 로직으로 당신의 앱을 간소화하세요.

---

> 📚 **전체 API 레퍼런스와 상세 가이드는 [next-nexus 공식 문서](https://next-nexus.vercel.app) 를 방문하세요.**

`next-nexus`는 강력하고 자동화된 캐싱 및 하이드레이션 레이어를 통해 네이티브 Next.js 데이터 패칭을 강화합니다. 서버 및 클라이언트 컴포넌트 모두를 위한 최소한의 예측 가능한 API를 제공하여, 빠르고 비용 효율적인 애플리케이션을 쉽게 구축할 수 있도록 돕습니다.

## 왜 next-nexus를 사용해야 할까요?

`next-nexus`는 Next.js App Router의 일반적인 데이터 관리 문제를 해결합니다.

- **UI 깜빡임 및 중복 요청 제거**: 서버에서 가져온 데이터가 클라이언트에 자동으로 하이드레이션되어, 중복 요청을 방지하고 부드러운 사용자 경험을 보장합니다.
- **서버 비용 및 TTFB 감소**: 렌더링 위임을 통해 클라이언트에 이미 최신 데이터가 있는 경우 서버가 컴포넌트 렌더링을 건너뛸 수 있어, 초기 페이지 로딩 속도를 높이고 운영 비용을 절감합니다.
- **대역폭 절약**: ETag 기반 조건부 요청은 변경되지 않은 데이터의 재다운로드를 방지합니다.
- **캐시 관리 간소화**: 정밀한 태그 기반 재검증을 통해 단일 액션으로 서버와 클라이언트 캐시의 특정 데이터를 무효화할 수 있습니다.

## 핵심 개념

- **자동 하이드레이션**: 서버에서 가져온 데이터가 클라이언트로 원활하게 전달되어, 클라이언트 마운트 시 발생하는 데이터 재요청을 제거합니다.
- **렌더링 위임**: 컴포넌트를 `<NexusSuspense>`로 감싸면, 클라이언트 캐시에 최신 데이터가 있을 경우 서버가 렌더링을 클라이언트에 위임하여 TTFB와 서버 부하를 줄일 수 있습니다.
- **ETag 기반 조건부 요청**: HTTP `ETag`와 `304 Not Modified` 응답을 사용하여 클라이언트에 이미 있는 데이터를 다시 다운로드하는 것을 방지합니다.
- **통합된 API 정의**: `createNexusDefinition`은 API 호출을 위한 단일 소스를 제공하며, 서버와 클라이언트 모두에서 타입 안정성을 보장하고 일관된 데이터 패칭을 가능하게 합니다.

## 빠른 시작

### 1. 설치

```bash
npm install next-nexus
# 또는
pnpm install next-nexus
# 또는
yarn add next-nexus
```

**필수 요구사항:** Next.js >= 14.2, React >= 18.2

### 2. `NexusProvider`로 앱 감싸기

서버-클라이언트 간 캐시 하이드레이션과 데이터 흐름을 활성화합니다.

```tsx
// app/layout.tsx
import { NexusProvider } from 'next-nexus';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko'>
      <body>
        <NexusProvider>{children}</NexusProvider>
      </body>
    </html>
  );
}
```

### 3. API 요청 정의하기

API 엔드포인트를 위한 재사용 가능하고 타입-안전한 정의를 만듭니다.

```ts
// src/api/productDefinition.ts
import { createNexusDefinition } from 'next-nexus';

export interface Product {
  id: string;
  name: string;
}

export const productDefinition = {
  list: createNexusDefinition<Product[]>({
    method: 'GET',
    endpoint: '/products',
    // 서버와 클라이언트를 위한 캐시 옵션
    server: {
      tags: ['products'],
      revalidate: 1800, // 30분
    },
    client: {
      tags: ['products'],
      revalidate: 300, // 5분
    },
  }),
};
```

### 4. 서버 컴포넌트에서 데이터 가져오기

`nexus`를 사용하여 서버 컴포넌트에서 데이터를 가져옵니다.

```tsx
// app/products/page.tsx
import { nexus } from 'next-nexus';
import { productDefinition } from '@/api/productDefinition';
import { ProductListClient } from './ProductListClient';

const ProductsPage = async () => {
  // 여기서 가져온 데이터는 클라이언트에서 자동으로 사용 가능해집니다.
  const res = await nexus(productDefinition.list);
  const products = res.data ?? [];

  return (
    <div>
      <h1>상품 목록 (서버)</h1>
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <hr />
      {/* 이 클라이언트 컴포넌트는 하이드레이션된 데이터를 받게 됩니다. */}
      <ProductListClient />
    </div>
  );
};

export default ProductsPage;
```

### 5. 클라이언트 컴포넌트에서 사용하기

클라이언트 컴포넌트에서 `useNexusQuery`를 사용하세요. 서버로부터 하이드레이션된 데이터로 즉시 렌더링되며, 추가 요청이 발생하지 않습니다.

```tsx
// app/products/ProductListClient.tsx
'use client';

import { useNexusQuery } from 'next-nexus/client';
import { productDefinition } from '@/api/productDefinition';

export const ProductListClient = () => {
  // 초기 렌더링 시 네트워크 요청이 발생하지 않습니다!
  const { data, isPending } = useNexusQuery(productDefinition.list);
  const products = data ?? [];

  if (isPending && !data) return <div>로딩 중...</div>;

  return (
    <div>
      <h2>상품 목록 (클라이언트)</h2>
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

## 주요 기능

### 데이터 패칭

- **`nexus` (서버)**: 서버 컴포넌트에서 데이터를 가져오는 주요 방법입니다. Next.js의 `fetch`와 통합되며 하이드레이션을 위해 데이터를 자동으로 수집합니다.
- **`useNexusQuery` (클라이언트)**: 클라이언트 컴포넌트에서 데이터를 쿼리하기 위한 React 훅입니다. `pending`/`error` 상태를 제공하고 하이드레이션된 데이터를 자동으로 사용합니다.

### 성능 최적화

- **`NexusSuspense`를 이용한 렌더링 위임**: `next-nexus`의 핵심 기능입니다. 서버 컴포넌트 서브트리를 `NexusSuspense`로 감싸면, 클라이언트 캐시에 최신 데이터가 있을 경우 서버가 렌더링을 건너뛰고 클라이언트에 위임할 수 있습니다. 이는 TTFB와 서버 부하를 크게 줄여줍니다.

  ```tsx
  // 서버 컴포넌트
  import { NexusSuspense } from 'next-nexus';
  import { ServerComponent } from './ServerComponent';

  export default function Page() {
    return (
      // 클라이언트에 ServerComponent를 위한 최신 데이터가 있다면,
      // 서버는 폴백을 보내고 클라이언트가 즉시 컴포넌트를 렌더링합니다.
      <NexusSuspense fallback={<div>로딩 중...</div>}>
        <ServerComponent />
      </NexusSuspense>
    );
  }
  ```

### 데이터 변경 (Mutation)

- **`useNexusMutation`**: 클라이언트 컴포넌트에서 CUD(생성, 수정, 삭제) 작업을 수행하기 위한 훅입니다.
- **`useNexusAction` & `useNexusFormAction`**: 클라이언트 컴포넌트에서 서버 액션을 호출하기 위한 편리한 래퍼로, `pending` 상태와 생명주기 콜백을 함께 제공합니다.

  ```tsx
  'use client';
  import { useNexusFormAction } from 'next-nexus/client';

  const ProductForm = () => {
    const { formAction, isPending, isSuccess } = useNexusFormAction(
      async (formData: FormData) => {
        'use server';
        // ...서버 로직
        return { ok: true };
      }
    );

    return (
      <form action={formAction}>
        <input name='name' />
        <button type='submit' disabled={isPending}>
          저장
        </button>
        {isSuccess && <div>저장되었습니다!</div>}
      </form>
    );
  };
  ```

### 세밀한 캐시 제어

- **태그 기반 재검증**: 태그를 기반으로 서버 및 클라이언트 캐시를 무효화하여 데이터 일관성을 보장합니다.
  - `revalidateServerTags`: 서버의 Next.js 데이터 캐시를 재검증합니다.
  - `revalidateClientTags`: 클라이언트의 인메모리 캐시를 재검증합니다.
- **직접적인 캐시 접근 (`nexusCache`)**: 낙관적 업데이트와 같은 고급 사용 사례를 위해 클라이언트에서 특정 캐시 항목을 직접 가져오거나, 설정하거나, 무효화하는 유틸리티입니다.

### 확장성

- **인터셉터**: 요청/응답 생명주기에 사용자 정의 로직을 추가합니다. 인증 헤더 추가, 로깅, 데이터 변환 등에 유용합니다.

## API 레퍼런스 (서브패스)

환경에 맞는 코드를 사용하려면 올바른 서브패스에서 임포트하세요.

- **`next-nexus` (범용)**: `nexus`, `interceptors`, `createNexusDefinition`, `NexusProvider`, `NexusSuspense`
- **`next-nexus/client` (클라이언트 전용)**: `useNexusQuery`, `useNexusMutation`, `useNexusAction`, `useNexusFormAction`, `nexusCache`, `revalidateClientTags`
- **`next-nexus/server` (서버 전용)**: `revalidateServerTags`
- **`next-nexus/errors` (오류)**: `isNexusError`

## 디버깅 (개발 환경 전용)

- 요청 생명주기 로그(START/SUCCESS/ERROR/TIMEOUT)는 개발 환경에서 기본적으로 출력됩니다.
- 상세한 캐시 로그(`HIT`/`MISS`/`SKIP`/`MATCH`/`SET`/`UPDATE`/`DELETE`/`CLEAR`)를 활성화하려면 아래 환경 변수를 추가하세요.

```bash
# .env.local
NEXT_PUBLIC_NEXUS_DEBUG=true
```

## 라이선스

MIT
