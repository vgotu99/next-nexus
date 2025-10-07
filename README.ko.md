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
- **서버 비용 및 TTFB 감소**: 렌더링 위임을 통해 클라이언트에 이미 캐시된 데이터가 있는 경우 서버가 컴포넌트 렌더링을 건너뛸 수 있어, 초기 페이지 로딩 속도를 높이고 운영 비용을 절감합니다.
- **대역폭 절약**: ETag 기반 조건부 요청은 변경되지 않은 데이터의 재다운로드를 방지합니다.
- **캐시 관리 간소화**: 정밀한 태그 기반 재검증을 통해 단일 액션으로 서버와 클라이언트 캐시의 특정 데이터를 무효화할 수 있습니다.

## 핵심 개념

- **자동 하이드레이션**: 서버에서 가져온 데이터가 클라이언트로 원활하게 전달되어, 클라이언트 마운트 시 발생하는 데이터 재요청을 제거합니다.
- **렌더링 위임**: `<NexusRenderer>`를 사용하면, 클라이언트에 캐시된 데이터가 있을 경우 서버가 렌더링을 클라이언트에 위임하여 TTFB와 서버 부하를 줄일 수 있습니다.
- **ETag 기반 조건부 요청**: HTTP `ETag`와 `304 Not Modified` 응답을 사용하여 클라이언트에 이미 있는 데이터를 다시 다운로드하는 것을 방지합니다.
- **통합된 API `definition`**: `createNexusDefinition`은 API 호출을 위한 단일 소스를 제공하며, 서버와 클라이언트 모두에서 타입 안정성을 보장하고 일관된 데이터 패칭을 가능하게 합니다.

## 빠른 시작

### 1. 설치

```bash
npm install next-nexus
# 또는
pnpm install next-nexus
# 또는
yarn add next-nexus
```

**필수 요구사항:** Next.js >= 14.0.0, React >= 18.2.0

### 2. 클라이언트 사이드 런타임 초기화

루트 레이아웃의 `</body>` 태그 바로 앞에 `NexusRuntime`을 한 번만 포함하세요. 이 컴포넌트는 클라이언트 사이드 캐시를 초기화하고, RSC 요청 중에 서버에 클라이언트 캐시 메타데이터를 전송하여 데이터 페칭을 최적화합니다.

```tsx
// app/layout.tsx
import { NexusRuntime } from 'next-nexus/client';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko'>
      <body>
        {children}
        {/* NexusRuntime은 클라이언트 캐시와 기능을 초기화합니다. */}
        <NexusRuntime />
      </body>
    </html>
  );
}
```

### 3. 데이터 페칭 구간에 하이드레이션 활성화

서버에서 가져온 데이터를 클라이언트로 전송하려면, 데이터를 가져오는 세그먼트(페이지 또는 레이아웃)를 `NexusHydrationBoundary`로 감싸야 합니다.

#### 표준 방식: `layout.tsx` 사용하기

표준적인 방법은 `layout.tsx` 파일을 만들고 `children`을 `<NexusHydrationBoundary>` 컴포넌트로 감싸는 것입니다. 이 방식은 여러 페이지가 동일한 데이터 페칭 로직을 공유하는 세그먼트에 유용합니다. 단, 레이아웃이 필요없는 세그먼트의 경우 아래에서 설명하는 `withNexusHydrationBoundary` HOC를 사용하세요.

```tsx
// app/products/layout.tsx
import { NexusHydrationBoundary } from 'next-nexus/server';

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 레이아웃이나 자식 페이지에서 페치된 데이터가 수집됩니다.
  return <NexusHydrationBoundary>{children}</NexusHydrationBoundary>;
}
```

#### 간편한 방식: `withNexusHydrationBoundary` HOC 사용하기

별도의 `layout.tsx` 파일이 필요 없는 간단한 세그먼트의 경우, `page.tsx`에 직접 `withNexusHydrationBoundary` HOC(고차 컴포넌트) 패턴을 사용할 수 있습니다.

```tsx
// app/products/page.tsx
import { withNexusHydrationBoundary } from 'next-nexus/server';
import { nexus } from 'next-nexus/server';
import { productDefinition } from '@/api/productDefinition';

async function ProductsPage() {
  // 여기서 가져온 데이터는 하이드레이션을 위해 자동으로 수집됩니다.
  const { data: products } = await nexus(productDefinition.list);

  return (
    // ... products를 사용하는 JSX
  );
}

// HOC로 페이지를 감싸 하이드레이션을 활성화합니다.
export default withNexusHydrationBoundary(ProductsPage);
```

### 4. API `definition` 만들기 / Interceptors 사용하기

- `createNexusDefinition`을 사용하여 API 엔드포인트를 위한 재사용 가능하고 타입 안전한 정의를 만듭니다.
- `interceptors`를 사용하여 요청/응답 인터셉터를 설정할 수 있습니다.

```ts
// src/api/nexusDefinition.ts
import { createNexusDefinition, interceptors } from 'next-nexus';

// 공통 설정을 위한 기본 definition
export const createDefinition = createNexusDefinition({
  baseURL: 'https://api.example.com',
  timeout: 5, // next-nexus의 definition의 모든 설정은 seconds 단위로 설정됩니다.
  retry: { count: 1, delay: 1 },
  headers: { 'x-app': 'docs' },
});

interceptors.request.use('auth', async config => {
  const headers = new Headers(config.headers);
  const token = getToken(); // 사용자 인증을 위한 token을 가져오는 로직

  headers.set('authorization', `Bearer ${token}`);

  return { ...config, headers };
});

// src/api/productDefinition.ts
import { createDefinition } from '@/api/nexusDefinition';
import type { Product, InfiniteProduct } from '@/types';

export const productDefinition = {
  list: createDefinition<Product[]>({
    method: 'GET',
    endpoint: '/products',
    // 서버와 클라이언트를 위한 캐시 옵션
    server: {
      cache: 'force-cache', // cache 옵션으로 매핑
      tags: ['products'], // next.tags 옵션으로 매핑
      revalidate: 1800, // next.revalidate 옵션으로 매핑
    },
    client: {
      tags: ['products'],
      revalidate: 300,
      cachedHeaders: ['x-total-count'], // 헤더를 캐시에 저장합니다. **안전한 헤더만 저장하세요.**
    },
  }),
  infiniteList: (cursor: string | null) =>
    createDefinition<InfiniteProduct>({
      method: 'GET',
      endpoint: cursor ? `/products?cursor=${cursor}` : '/products',
      client: {
        tags: ['products', `product:${cursor}`],
        revalidate: 300,
      },
    }),
  create: (newProduct: { name: string }) =>
    createDefinition({
      method: 'POST',
      endpoint: '/products',
      data: newProduct,
      interceptors: ['auth'], // src/api/nexusDefinition.ts에서 정의한 "auth" 이름을 가진 인터셉터를 사용합니다.
    }),
};
```

### 5. 서버 컴포넌트에서 데이터 가져오기

`nexus`를 사용하여 서버 컴포넌트에서 데이터를 가져옵니다. 데이터는 자동으로 하이드레이션됩니다.

```tsx
// app/products/page.tsx (전체 예시)
import { withNexusHydrationBoundary } from 'next-nexus/server';
import { nexus } from 'next-nexus/server';
import { productDefinition } from '@/api/productDefinition';
import { ProductListClient } from './ProductListClient';

async function ProductsPage() {
  const { data: products, headers } = await nexus(productDefinition.list);
  const totalCount = headers.get('x-total-count');

  return (
    <div>
      <h1>상품 목록 (서버) {totalCount}개</h1>
      <ul>
        {products?.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <hr />
      {/* 이 클라이언트 컴포넌트는 하이드레이션된 데이터를 받게 됩니다. */}
      <ProductListClient />
    </div>
  );
}

export default withNexusHydrationBoundary(ProductsPage);
```

### 6. 클라이언트 컴포넌트에서 사용하기

클라이언트 컴포넌트에서 `useNexusQuery`를 사용하세요. 서버로부터 하이드레이션된 데이터로 즉시 렌더링되며, 추가 요청이 발생하지 않습니다.

```tsx
// app/products/ProductListClient.tsx
'use client';

import { useNexusQuery } from 'next-nexus/client';
import { productDefinition } from '@/api/productDefinition';

export const ProductListClient = () => {
  // 초기 렌더링 시 네트워크 요청이 발생하지 않습니다!
  const { data, isPending, headers } = useNexusQuery(productDefinition.list);
  const products = data ?? [];
  const totalCount = headers.get('x-total-count'); // definition에서 client.cachedHeaders에 'x-total-count'를 설정했기 때문에 캐시에서 'x-total-count' 헤더를 가져올 수 있습니다.

  if (isPending && !data) return <div>로딩 중...</div>;

  return (
    <div>
      <h2>상품 목록 (클라이언트) {totalCount}개</h2>
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
- **`useNexusInfiniteQuery` (클라이언트)**: "무한 스크롤" 및 페이지네이션 구현을 위한 강력한 훅입니다. `initialPageParam`으로 시작점을 정하고, `getNextPageParam` 함수를 통해 다음 페이지를 동적으로 가져옵니다.

  ```tsx
  // app/products/InfiniteProductList.tsx
  'use client';

  import { useNexusInfiniteQuery } from 'next-nexus/client';
  import { productDefinition } from '@/api/productDefinition';

  export const InfiniteProductList = () => {
    const { data, isPending, hasNextPage, revalidateNext } =
      useNexusInfiniteQuery(productDefinition.infiniteList, {
        initialPageParam: null, // 첫 페이지는 cursor 없이 시작
        getNextPageParam: lastPage => {
          // API 응답에 다음 페이지를 위한 cursor가 포함되어 있다고 가정합니다.
          // 예: { products: [...], nextCursor: 'some-cursor' }
          return lastPage.nextCursor ?? null;
        },
      });

    const allProducts = data?.pages.flatMap(page => page.products) ?? [];

    return (
      <div>
        {/* ... allProducts 렌더링 */}
        <button
          onClick={() => revalidateNext()}
          disabled={!hasNextPage || isPending}
        >
          {isPending ? '로딩 중...' : '더 불러오기'}
        </button>
      </div>
    );
  };
  ```

### `NexusRenderer`를 이용한 성능 최적화

`NexusRenderer`는 서버 렌더링을 최적화하는 핵심 컴포넌트입니다. 만약 유효한 데이터가 클라이언트 캐시에 이미 존재한다면, 서버는 렌더링을 건너뛰고 이 작업을 클라이언트에 위임합니다. 이는 TTFB(Time to First Byte)와 서버 비용을 크게 절감합니다.

`serverComponent`에는 서버 프리젠테이셔널 컴포넌트를, `clientComponent`에는 해당 컴포넌트를 `'use client'` 지시어가 있는 파일에서 다시 export한 클라이언트 버전을 전달해야 합니다. 이 컴포넌트는 `NexusRenderer`로부터 `data` prop을 통해 페치된 데이터를 전달받으며, `componentProps`로 전달된 다른 모든 prop도 함께 받습니다.

```tsx
// components/ProductListUI.tsx
// 서버 프레젠테이셔널 컴포넌트
import type { Product } from '@/api/productDefinition';

const ProductListUI = ({ data, title }: { data: Product[]; title: string }) => {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {data.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
};
export default ProductListUI;

// components/client-ui/index.ts
// 서버 프레젠테이셔널 컴포넌트를 클라이언트 프레젠테이셔널 컴포넌트로 다시 export하기 위한 클라이언트 진입점
'use client';

export { default as ProductListUIClient } from '@/components/ProductListUI';
// ... 더 많은 서버 프레젠테이셔널 컴포넌트를 클라이언트 프레젠테이셔널 컴포넌트로 다시 export할 수 있는 패턴입니다.

// app/page.tsx
// 서버 컴포넌트에서 NexusRenderer 사용하기
import { NexusRenderer } from 'next-nexus/server';
import { productDefinition } from '@/api/productDefinition';
import ProductListUI from '@/components/ProductListUI'; // 서버 프레젠테이셔널 컴포넌트 임포트
import { ProductListUIClient } from '@/client-ui'; // 클라이언트 프레젠테이셔널 컴포넌트 임포트

export default function Page() {
  return (
    <NexusRenderer
      definition={productDefinition.list}
      serverComponent={ProductListUI}
      clientComponent={ProductListUIClient}
      componentProps={{ title: '우리의 제품들!' }}
    />
  );
}
```

### 데이터 변경 (Mutation)

- **`useNexusMutation`**: 클라이언트 컴포넌트에서 CUD(생성, 수정, 삭제) 작업을 수행하기 위한 훅입니다. 데이터에 영향을 주고 UI 업데이트가 필요할 때 이상적입니다.

  ```tsx
  // components/AddProduct.tsx
  'use client';

  import { revalidateServerTags } from 'next-nexus';
  import { useNexusMutation, revalidateClientTags } from 'next-nexus/client';
  import { productDefinition } from '@/api/productDefinition';
  import { useState } from 'react';

  export const AddProduct = () => {
    const [name, setName] = useState('');
    const { mutate, isPending } = useNexusMutation(productDefinition.create, {
      onSuccess: async () => {
        // 성공 시, 'products' 태그를 재검증하여 목록을 업데이트합니다.
        await revalidateServerTags(['products']); // revalidateServerTags는 서버 액션이기에 클라이언트 컴포넌트에서 사용할 수 있습니다.
        revalidateClientTags(['products']);
        setName('');
      },
    });

    const handleSubmit = () => {
      if (!name) return;
      mutate({ name });
    };

    return (
      <div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isPending}
        />
        <button onClick={handleSubmit} disabled={isPending}>
          {isPending ? '추가 중...' : '제품 추가'}
        </button>
      </div>
    );
  };
  ```

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

- **`next-nexus` (범용)**:
  - `createNexusDefinition`: API `definition`을 생성합니다.
  - `interceptors`: 전역 요청/응답 생명주기에 로직을 추가합니다.
  - `revalidateServerTags`: Next.js 데이터 캐시를 태그 기반으로 무효화합니다.
- **`next-nexus/server` (서버 전용)**:
  - `nexus`: 서버 컴포넌트에서 데이터를 요청하고 하이드레이션을 위해 등록합니다.
  - `NexusRenderer`: 렌더링 위임을 활성화하는 컴포넌트입니다.
  - `NexusHydrationBoundary`: 서버 컴포넌트 트리를 감싸 하이드레이션 데이터를 수집합니다.
  - `withNexusHydrationBoundary`: 페이지를 위한 HOC(고차 컴포넌트) 버전입니다.
- **`next-nexus/client` (클라이언트 전용)**:
  - `useNexusQuery`: 클라이언트 컴포넌트에서 데이터를 조회하기 위한 훅입니다.
  - `useNexusInfiniteQuery`: 무한 스크롤 및 페이지네이션을 위한 훅입니다.
  - `useNexusMutation`: 데이터 생성, 수정, 삭제(CUD) 작업을 위한 훅입니다.
  - `useNexusAction` & `useNexusFormAction`: 서버 액션을 위한 래퍼 훅입니다.
  - `NexusRuntime`: 클라이언트 런타임 및 캐시를 초기화합니다.
  - `nexusCache`: 클라이언트 캐시에 직접 접근하는 유틸리티입니다.
  - `revalidateClientTags`: 클라이언트 캐시를 태그 기반으로 무효화합니다.
- **`next-nexus/errors` (오류)**:
  - `isNexusError`: 오류가 `NexusError` 타입인지 확인하는 타입 가드입니다.

## 디버깅 (개발 환경 전용)

- 요청 생명주기 로그(START/SUCCESS/ERROR/TIMEOUT)는 개발 환경에서 기본적으로 출력됩니다.
- 상세한 캐시 로그(`HIT`/`HIT-STALE`/`MISS`/`SKIP`/`MATCH`/`SET`/`UPDATE`/`DELETE`)를 활성화하려면 아래 환경 변수를 추가하세요.

```bash
# .env.local
NEXT_PUBLIC_NEXUS_DEBUG=true
```

## 라이선스

MIT
