# next-fetch

An intelligent data fetching library for the Next.js App Router, designed to slash server costs and simplify data management.

---

`next-fetch` is not just another fetch wrapper. It's a comprehensive solution built from the ground up for the Next.js App Router, leveraging its most powerful features like Server Actions, Route Handlers, and advanced caching to provide a seamless and cost-effective development experience.

## Key Features

💸 **Slash Server Costs**: Automatically minimizes RSC Payloads and reduces serverless function execution time by leveraging ETag-based cache revalidation and `304 Not Modified` responses.

🚀 **Optimized Network Traffic**: Drastically reduces client-side requests by leveraging an in-memory LRU cache. This cache is **automatically hydrated** with data from Server Components, providing instant data loading and preventing duplicate API calls during navigation.

🏛️ **Modern, Next.js-Native API**: Embraces the latest Next.js conventions by providing `useNextFetch` for data queries via Route Handlers and `useNextAction` for mutations via Server Actions.

🧑‍💻 **Superior Developer Experience**: Offers a fully type-safe API design with a reusable "Definition Factory" pattern and intuitive lifecycle callbacks (`onStart`, `onSuccess`, `onError`) to simplify complex asynchronous logic.

## How It Slashes Server Costs

- ETag-powered conditional requests (304): When the client presents a valid ETag, the server avoids re-serializing unchanged payloads and returns a cheap conditional response instead of full data.
  - Implementation reference:
    - Server detects conditional flow and short-circuits response
      ```
      // core/client.ts
      // getConditionalResponse(...) decides whether to skip sending a body when unchanged
      ```
- Server-side request skipping using client cache metadata: If the server sees that the client already has a fresh entry for the same cache key, it can skip the origin/API call entirely.
  - Implementation reference:
    - Request skip decision based on client cache metadata
      ```
      // core/client.ts
      // shouldSkipRequest(...) checks client cache metadata and avoids the request when valid
      ```
- Automatic hydration → instant client cache hits: Data fetched on the server is embedded once in HTML and restored into the in-memory client cache on the browser. Subsequent client components using the same definition get an immediate cache hit instead of re-fetching.
  - Implementation reference:
    - Server embeds hydration script; client restores it into the cache store
      ```
      // providers/ServerNextFetchProvider.tsx → hydration script injection
      // cache/CacheHydrator.tsx → reads and sets entries into client cache on mount
      ```
- Precise, tag-based revalidation (server/client): Only the affected entries are invalidated via tags, preventing broad cache busts and unnecessary recompute/re-fetch.
  - Server: `revalidateServerTags([...])`
  - Client: `revalidateClientTags([...])`
- In-memory LRU client cache: Avoids duplicate requests across navigations within a session and reduces Route Handler/Server Action invocations.
- Smaller RSC/over-the-wire payloads: By leveraging hydration and cache hits, child components avoid redundant data fetching, which lowers server work and shrinks network usage on subsequent renders.

## Installation

This package is not yet published on npm. The commands below will work after the initial release.

```bash
npm install next-fetch
# or
yarn add next-fetch
```

_Requires Next.js >= 14.2 and React >= 18.3._

## Core Concept: The Definition Factory

Instead of scattering `fetch` calls and API logic across your application, `next-fetch` centralizes your API specifications into reusable, type-safe "definitions". This pattern is key to enabling advanced features like precise cache manipulation.

```typescript
// src/api/productDefinition.ts
import { createNextFetchDefinition } from 'next-fetch';

const createProductDefinition = createNextFetchDefinition({
  baseURL: 'https://api.example.com/products',
});

export const productDefinition = {
  list: createProductDefinition({
    method: 'GET',
    endpoint: '/',
    cache: 'force-cache',
    server: {
      tags: ['products'],
      revalidate: 1800,
    },
    client: {
      tags: ['products'],
      revalidate: 300,
    },
  }),
  detail: (id: string) =>
    createProductDefinition({
      method: 'GET',
      endpoint: `/${id}`,
      cache: 'force-cache',
      server: {
        tags: ['products', `product-detail-${id}`],
        revalidate: 1800,
      },
      client: {
        tags: ['products', `product-detail-${id}`],
        revalidate: 300,
      },
    }),
  like: (id: string) =>
    createProductDefinition({
      method: 'POST',
      endpoint: `/like/${id}`,
    }),
  // ... other definitions
};
```

## Getting Started

### 1. Fetching Data with `useNextFetch`

Use `nextFetch` in Server Components and `useNextFetch` in Client Components. The `definition` provides the cache key, and the optional `route` option proxies through a Route Handler.

Server Component example:

```tsx
// app/products/page.tsx
import { nextFetch } from 'next-fetch';
import { productDefinition } from '@/api/productDefinition';

export default async function ProductsPage() {
  const response = await nextFetch(productDefinition.list);
  const products = response.data ?? [];

  return (
    <ul>
      {products.map((p: { id: string; name: string }) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

Client Component example:

```tsx
// app/components/ProductDetail.tsx
'use client';

import { useNextFetch } from 'next-fetch/client';
import { productDefinition } from '@/api/productDefinition';

export function ProductDetail({ productId }: { productId: string }) {
  const { data, isPending, error } = useNextFetch(
    productDefinition.detail(productId),
    { route: `/api/products/${productId}` } // Optional: target route handler endpoint
  );

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <h1>{data?.name}</h1>;
}
```

### 1.1 Using the Same Definition in Server and Client (English)

You can use the exact same definition in both a Server Component and a Client Component. This ensures one source of truth for endpoints, tags, and caching.

Server Component using the same definition:

```tsx
// app/products/[id]/page.tsx
import { nextFetch } from 'next-fetch';
import { productDefinition } from '@/api/productDefinition';

interface PageProps {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = params;
  const response = await nextFetch(productDefinition.detail(id));
  const product = response.data;

  return (
    <div>
      <h1>{product?.name}</h1>
    </div>
  );
}
```

Client Component using the same definition:

```tsx
// app/products/[id]/ProductDetailClient.tsx
'use client';

import { useNextFetch } from 'next-fetch/client';
import { productDefinition } from '@/api/productDefinition';

export function ProductDetailClient({ id }: { id: string }) {
  const { data, isPending, error } = useNextFetch(productDefinition.detail(id));

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <h1>{data?.name}</h1>;
}
```

### 1.2 Server Fetch → Automatic Hydration → Client Cache Hit (English)

To enable automatic client cache hydration from server-fetched data, wrap your app with the provider. Data fetched on the server using the same definition will be embedded into the HTML and hydrated on the client. Subsequent client fetches with the same definition will hit the client cache immediately.

Root layout with provider:

```tsx
// app/layout.tsx
import { NextFetchProvider } from 'next-fetch';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <NextFetchProvider>{children}</NextFetchProvider>
      </body>
    </html>
  );
}
```

Server fetch (hydrates cache):

```tsx
// app/products/page.tsx
import { nextFetch } from 'next-fetch';
import { productDefinition } from '@/api/productDefinition';
import { ProductListClient } from './ProductListClient';

export default async function ProductsPage() {
  // 1) Server fetch using the same definition
  const res = await nextFetch(productDefinition.list);
  const products = res.data ?? [];

  return (
    <div>
      <h1>Products</h1>
      {/* 2) Render client component that fetches using the same definition */}
      <ProductListClient />
    </div>
  );
}
```

Client fetch (instant client cache hit from hydration):

```tsx
// app/products/ProductListClient.tsx
'use client';

import { useNextFetch } from 'next-fetch/client';
import { productDefinition } from '@/api/productDefinition';

export function ProductListClient() {
  // Use the same definition. Set refetchOnMount to false to rely purely on hydrated cache.
  const { data, isPending, error } = useNextFetch(productDefinition.list, {
    refetchOnMount: false,
  });

  if (error) return <div>Error: {error.message}</div>;
  if (!data && isPending) return <div>Loading...</div>;

  return (
    <ul>
      {(data ?? []).map((p: { id: string; name: string }) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

Notes:

- With `refetchOnMount: false`, the client shows hydrated data immediately without firing a network request. Keep the default (`true`) if you want a background refresh on mount.
- Hydration works automatically through the provider by embedding server-fetched cache entries into the page and restoring them on the client.

### 1.3 Server Fetch → Automatic Hydration → Client Cache Hit (Summary)

When you fetch on the server using the same definition, the provider embeds hydration data into HTML and the client restores it. Then, a client `useNextFetch` with the same definition instantly hits the cache (no network) if you set `refetchOnMount: false`.

Key points:

- Wrap the root with `NextFetchProvider` to enable automatic hydration.
- Server `nextFetch(productDefinition.list)` preloads data into the client cache.
- Client `useNextFetch` with `refetchOnMount: false` renders immediately from hydrated cache.

### 1.2 Server Fetch → Automatic Hydration → Client Cache Hit (English)

To enable automatic client cache hydration from server-fetched data, wrap your app with the provider. Data fetched on the server using the same definition will be embedded into the HTML and hydrated on the client. Subsequent client fetches with the same definition will hit the client cache immediately.

Root layout with provider:

```tsx
// app/layout.tsx
import { NextFetchProvider } from 'next-fetch';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <NextFetchProvider>{children}</NextFetchProvider>
      </body>
    </html>
  );
}
```

Server fetch (hydrates cache):

```tsx
// app/products/page.tsx
import { nextFetch } from 'next-fetch';
import { productDefinition } from '@/api/productDefinition';
import { ProductListClient } from './ProductListClient';

export default async function ProductsPage() {
  // 1) Server fetch using the same definition
  const res = await nextFetch(productDefinition.list);
  const products = res.data ?? [];

  return (
    <div>
      <h1>Products</h1>
      {/* 2) Render client component that fetches using the same definition */}
      <ProductListClient />
    </div>
  );
}
```

Client fetch (instant client cache hit from hydration):

```tsx
// app/products/ProductListClient.tsx
'use client';

import { useNextFetch } from 'next-fetch/client';
import { productDefinition } from '@/api/productDefinition';

export function ProductListClient() {
  // Use the same definition. Set refetchOnMount to false to rely purely on hydrated cache.
  const { data, isPending, error } = useNextFetch(productDefinition.list, {
    refetchOnMount: false,
  });

  if (error) return <div>Error: {error.message}</div>;
  if (!data && isPending) return <div>Loading...</div>;

  return (
    <ul>
      {(data ?? []).map((p: { id: string; name: string }) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

Notes:

- With `refetchOnMount: false`, the client shows hydrated data immediately without firing a network request. Keep the default (`true`) if you want a background refresh on mount.
- Hydration works automatically through the provider by embedding server-fetched cache entries into the page and restoring them on the client.

### 2. Mutating Data with `useNextAction`

Use `useNextAction` to wrap Server Actions. After a successful mutation, you can invalidate the specific client cache entry for immediate UI updates on the next fetch.

```typescript
// app/actions/userActions.ts
'use server';

import { revalidateTag } from 'next/cache';

export async function updateUser({
  userId,
  newName,
}: {
  userId: string;
  newName: string;
}) {
  // ... database update logic or API call
  // This revalidates the Next.js Server-side Data Cache
  revalidateTag(`users:${userId}`);
  return { success: true, updatedName: newName };
}
```

```tsx
// app/components/EditUserForm.tsx
'use client';

import { useNextAction } from 'next-fetch/client';
import { clientCache } from 'next-fetch/client';
import { userAPI } from '@/api/userAPI';
import { updateUser } from '@/app/actions/userActions';

export function EditUserForm({ userId }: { userId: string }) {
  const { action, isPending } = useNextAction(updateUser, {
    onSuccess: result => {
      console.log(`User updated to: ${result.updatedName}`);
      // Invalidate the specific client cache entry to ensure fresh data on next query.
      clientCache(userAPI.getById(userId)).invalidate();
    },
  });

  return (
    <form action={() => action({ userId, newName: 'New Name' })}>
      <button type='submit' disabled={isPending}>
        {isPending ? 'Updating...' : 'Update Name'}
      </button>
    </form>
  );
}
```

### 2.1 Mutation with Tag Revalidation (English)

This example demonstrates using an existing mutation definition and tag revalidation on both the server and client. The server action performs the mutation via the definition and revalidates server-side tags. The client then triggers client-side tag revalidation for instant UI freshness.

Server Action using an existing definition and revalidating server tags:

```ts
// app/actions/productActions.ts
'use server';

import { nextFetch, revalidateServerTags } from 'next-fetch';
import { productDefinition } from '@/api/productDefinition';

export async function likeProduct({ id }: { id: string }) {
  await nextFetch(productDefinition.like(id));
  await revalidateServerTags(['products', `product-detail-${id}`]);
  return { success: true };
}
```

### 2.2 clientCache(definition) vs revalidateClientTags (English)

Use cases and differences:

- **clientCache(definition)**: Imperative, single-entry control. Immediate UI changes without a network request. Useful for optimistic updates or invalidating just one entry.
- **revalidateClientTags(tags)**: Declarative, multi-entry invalidation by tags. Marks all matching entries as stale so subsequent `useNextFetch` mounts/refetches will fetch fresh data. Great after mutations affecting multiple pages (e.g., list and detail).

Single-entry update (optimistic) and/or invalidate using `clientCache`:

```tsx
// app/products/[id]/ClientCacheSingleEntry.tsx
'use client';

import { clientCache, useNextAction } from 'next-fetch/client';
import { productDefinition } from '@/api/productDefinition';
import { likeProduct } from '@/app/actions/productActions';

export function ClientCacheSingleEntry({ id }: { id: string }) {
  const cache = clientCache(productDefinition.detail(id));

  const { action, isPending } = useNextAction(likeProduct, {
    onStart: () => {
      // Optimistic UI example (optional)
      cache.set(prev =>
        prev ? { ...prev, name: `${prev.name} (updating...)` } : prev
      );
      // Or invalidate only this entry
      // cache.invalidate();
    },
  });

  return (
    <button type='button' onClick={() => action({ id })} disabled={isPending}>
      {isPending ? 'Liking...' : 'Like (single-entry)'}
    </button>
  );
}
```

Tag-based revalidation across multiple entries using `revalidateClientTags`:

```tsx
// app/products/[id]/ClientTagRevalidate.tsx
'use client';

import { useNextAction, revalidateClientTags } from 'next-fetch/client';
import { likeProduct } from '@/app/actions/productActions';

export function ClientTagRevalidate({ id }: { id: string }) {
  const { action, isPending } = useNextAction(likeProduct, {
    onSuccess: () => {
      // Invalidate both products list and this product detail by tags
      revalidateClientTags(['products', `product-detail-${id}`]);
    },
  });

  return (
    <button type='button' onClick={() => action({ id })} disabled={isPending}>
      {isPending ? 'Liking...' : 'Like (revalidate tags)'}
    </button>
  );
}
```

Client Component calling the server action and revalidating client tags:

```tsx
// app/products/[id]/LikeButton.tsx
'use client';

import { useNextAction, revalidateClientTags } from 'next-fetch/client';
import { likeProduct } from '@/app/actions/productActions';

export function LikeButton({ id }: { id: string }) {
  const { action, isPending } = useNextAction(likeProduct, {
    onSuccess: () => {
      revalidateClientTags(['products', `product-detail-${id}`]);
    },
  });

  return (
    <button type='button' onClick={() => action({ id })} disabled={isPending}>
      {isPending ? 'Liking...' : 'Like'}
    </button>
  );
}
```

## Client Cache Manipulation

`next-fetch` provides a `clientCache` function that returns a handler to give you direct, imperative control over a specific cache entry.

```typescript
import { clientCache } from 'next-fetch/client';
import { userAPI } from '@/api/userAPI';

// Get a handler for a specific client cache entry
const userCacheHandler = clientCache(userAPI.getById('123'));
```

### Handler Methods

- **`.invalidate()`**: Marks the cache entry as stale. The next time `useNextFetch` for this data is mounted, it will be refetched. This is the primary way to handle cache invalidation after a mutation.

  ```typescript
  userCacheHandler.invalidate();
  ```

- **`.set(updater: (oldData) => newData)`**: Manually updates the data in a specific cache entry.

  ```typescript
  userCacheHandler.set(currentUser => ({ ...currentUser, name: 'New Name' }));
  ```

- **`.remove()`**: Completely removes the entry from the cache.

- **`.get()`**: Retrieves the current data from the cache entry.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Debugging

Enable debug logs by setting a single environment variable in development:

```bash
NEXT_PUBLIC_NEXT_FETCH_DEBUG=true
```

When enabled, you can observe the following logs in the console:

- Cache events: HIT, MISS, SKIP, MATCH, SET, UPDATE, DELETE, CLEAR
  - Includes details such as tags, revalidate/ttl, size/maxSize, and source (server/client-hydration/client-fetch/client-manual)
- Request lifecycle: START, SUCCESS, ERROR, TIMEOUT
  - Includes details such as duration, status, request/response sizes, and error message

Notes:

- Debug output is intended for development only.
- In development, the client cache store is exposed as `window.__nextFetchClientCache` after hydration for inspection.

### Debugging Examples

When `NEXT_PUBLIC_NEXT_FETCH_DEBUG=true` is set (development), you will see logs like the following.

Request logs (when they appear):

- START: right before a request is sent
- SUCCESS: after a response is received successfully
- ERROR: when a request fails
- TIMEOUT: when a timeout occurs

Examples:

```text
[Request] Request START: GET https://api.example.com/products/123

[Request] Request SUCCESS: GET https://api.example.com/products/123
  duration: 86ms
  status: 200
  responseSize: 2345

[Request] Request ERROR: GET https://api.example.com/products/123
  duration: 120ms
  error: "NetworkError: fetch failed"

[Request] Request TIMEOUT: GET https://api.example.com/products/123
  duration: 10000ms
```

Cache logs (when they appear):

- HIT: cache was used (e.g., client hydration hit)
- MISS: no cache entry, a network request is performed
- SKIP: server skipped making a request due to valid client cache metadata
- MATCH: server conditional request matched (e.g., ETag), body skipped
- SET: a new cache entry was stored
- UPDATE: an existing entry was updated (manual set/invalidate)
- DELETE: an entry was removed
- CLEAR: the entire cache was cleared

Examples:

```text
[Cache] [CLIENT-HYDRATION] [HIT] GET: /products/123 | tags: ['products','product-detail-123'] | ttl: 300s

[Cache] [SERVER] [SKIP] GET: https://api.example.com/products/123 | tags: ['products','product-detail-123'] | revalidate: 300s

[Cache] [SERVER] [MATCH] GET: https://api.example.com/products/123 | tags: ['products','product-detail-123'] | revalidate: 300s

[Cache] [CLIENT-FETCH] [SET] GET: /products | tags: ['products'] | ttl: 300s | size: 15/100

[Cache] [CLIENT-MANUAL] [UPDATE] GET: /products/123 | tags: ['products','product-detail-123'] | ttl: 300s

[Cache] [CLIENT-MANUAL] [DELETE] GET: /products/123

[Cache] [CLIENT-MANUAL] [CLEAR] * | size: 0/100
```
