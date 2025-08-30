<h1 style="display: flex; justify-content: space-between;">
  next-nexus
  <div>
    <img alt="This page: English" src="https://img.shields.io/badge/This_page-English-303234" />
    <a href="./README.ko.md">
      <img alt="Switch to Korean" src="https://img.shields.io/badge/Switch_to-Korean-F8F0E3" />
    </a>
  </div>
</h1>

The intelligent data layer for Next.js. Simplify your app with automatic caching, seamless hydration, and built-in cost savings.

---

> **For comprehensive guides and a full API reference, visit [next-nexus official docs](https://next-nexus.vercel.app)**

`next-nexus` enhances native Next.js data fetching with a powerful, automated caching and hydration layer. It provides a minimal, predictable API for both Server and Client Components, enabling you to build fast, cost-effective applications with ease.

## Why next-nexus?

`next-nexus` solves common data management challenges in the Next.js App Router:

- **Eliminates UI Flicker & Refetching**: Data fetched on the server is automatically hydrated to the client, preventing duplicate requests and ensuring a smooth user experience.
- **Reduces Server Costs & TTFB**: With Rendering Delegation, the server can skip rendering components if the client already has fresh data, leading to faster initial page loads and lower operational costs.
- **Saves Bandwidth**: ETag-based conditional requests prevent re-downloading data that hasn't changed.
- **Simplifies Cache Management**: Precise, tag-based revalidation allows you to invalidate specific data across both server and client caches with a single action.

## Core Concepts

- **Automatic Hydration**: Server-fetched data is seamlessly transferred to the client, eliminating client-side refetching on mount.
- **Rendering Delegation**: By wrapping a component in `<NexusSuspense>`, the server can delegate rendering to the client if the data is fresh in the client's cache, reducing TTFB and server workload.
- **ETag-Powered Conditional Requests**: Uses HTTP `ETag` and `304 Not Modified` responses to avoid re-downloading data the client already has.
- **Unified API Definition**: `createNexusDefinition` provides a single source of truth for your API calls, used by both server and client for type-safe, consistent data fetching.

## Quick Start

### 1. Installation

```bash
npm install next-nexus
# or
pnpm install next-nexus
# or
yarn add next-nexus
```

**Requires:** Next.js >= 14.2 and React >= 18.2

### 2. Wrap Your App with `NexusProvider`

This enables the server-client cache hydration and data flow.

```tsx
// app/layout.tsx
import { NexusProvider } from 'next-nexus';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <NexusProvider>{children}</NexusProvider>
      </body>
    </html>
  );
}
```

### 3. Define Your API Request

Create a reusable, type-safe definition for your API endpoint.

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
    // Cache options for server and client
    server: {
      tags: ['products'],
      revalidate: 1800, // 30 minutes
    },
    client: {
      tags: ['products'],
      revalidate: 300, // 5 minutes
    },
  }),
};
```

### 4. Fetch in a Server Component

Use `nexus` to fetch data in your Server Components.

```tsx
// app/products/page.tsx
import { nexus } from 'next-nexus';
import { productDefinition } from '@/api/productDefinition';
import { ProductListClient } from './ProductListClient';

const ProductsPage = async () => {
  // Data fetched here will be automatically available on the client
  const res = await nexus(productDefinition.list);
  const products = res.data ?? [];

  return (
    <div>
      <h1>Products (Server)</h1>
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <hr />
      {/* This client component will receive the hydrated data */}
      <ProductListClient />
    </div>
  );
};

export default ProductsPage;
```

### 5. Use in a Client Component

Use `useNexusQuery` in a Client Component. It will instantly render with the hydrated data from the server, with no extra request.

```tsx
// app/products/ProductListClient.tsx
'use client';

import { useNexusQuery } from 'next-nexus/client';
import { productDefinition } from '@/api/productDefinition';

export const ProductListClient = () => {
  // No network request is made on initial render!
  const { data, isPending } = useNexusQuery(productDefinition.list);
  const products = data ?? [];

  if (isPending && !data) return <div>Loading...</div>;

  return (
    <div>
      <h2>Products (Client)</h2>
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

## Key Features

### Data Fetching

- **`nexus` (Server)**: The primary way to fetch data in Server Components. It integrates with Next.js's `fetch` and automatically collects data for hydration.
- **`useNexusQuery` (Client)**: A React hook for querying data in Client Components. It provides pending/error states and automatically uses hydrated data.

### Performance Optimization

- **Rendering Delegation with `NexusSuspense`**: A core feature of `next-nexus`. Wrap a Server Component subtree with `NexusSuspense` to allow the server to skip rendering and delegate it to the client if the data is already fresh in the client's cache. This significantly reduces TTFB and server load.

  ```tsx
  // Server Component
  import { NexusSuspense } from 'next-nexus';
  import { ServerComponent } from './ServerComponent';

  export default function Page() {
    return (
      // If the client has fresh data for ServerComponent, the server sends a fallback
      // and the client renders the component instantly.
      <NexusSuspense fallback={<div>Loading...</div>}>
        <ServerComponent />
      </NexusSuspense>
    );
  }
  ```

### Data Mutation

- **`useNexusMutation`**: A hook for performing CUD (Create, Update, Delete) operations in Client Components.
- **`useNexusAction` & `useNexusFormAction`**: Convenient wrappers for calling Server Actions from Client Components, complete with pending states and lifecycle callbacks.

  ```tsx
  'use client';
  import { useNexusFormAction } from 'next-nexus/client';

  const ProductForm = () => {
    const { formAction, isPending, isSuccess } = useNexusFormAction(
      async (formData: FormData) => {
        'use server';
        // ... your server logic
        return { ok: true };
      }
    );

    return (
      <form action={formAction}>
        <input name='name' />
        <button type='submit' disabled={isPending}>
          Save
        </button>
        {isSuccess && <div>Saved!</div>}
      </form>
    );
  };
  ```

### Fine-Grained Cache Control

- **Tag-Based Revalidation**: Invalidate server and client caches based on tags to ensure data consistency.
  - `revalidateServerTags`: Revalidates the Next.js data cache on the server.
  - `revalidateClientTags`: Revalidates the in-memory cache on the client.
- **Direct Cache Access (`nexusCache`)**: A utility to directly get, set, or invalidate specific cache entries on the client for advanced use cases like optimistic updates.

### Extensibility

- **Interceptors**: Attach custom logic to the request/response lifecycle. Useful for adding authentication headers, logging, or transforming data.

## API Reference (Subpaths)

Import from the correct subpath to ensure you're using the right code for the environment.

- **`next-nexus` (Universal)**: `nexus`, `interceptors`, `createNexusDefinition`, `NexusProvider`, `NexusSuspense`
- **`next-nexus/client` (Client only)**: `useNexusQuery`, `useNexusMutation`, `useNexusAction`, `useNexusFormAction`, `nexusCache`, `revalidateClientTags`
- **`next-nexus/server` (Server only)**: `revalidateServerTags`
- **`next-nexus/errors` (Errors)**: `isNexusError`

## Debugging (Dev Only)

- Request lifecycle logs (START/SUCCESS/ERROR/TIMEOUT) are printed in development by default.
- To enable detailed cache logs (`HIT`/`MISS`/`SKIP`/`MATCH`/`SET`/`UPDATE`/`DELETE`/`CLEAR`), add the following environment variable.

```bash
# .env.local
NEXT_PUBLIC_NEXUS_DEBUG=true
```

## License

MIT
