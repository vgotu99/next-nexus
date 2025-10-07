![next-nexus logo](https://raw.githubusercontent.com/vgotu99/next-nexus-docs/7b34074056d4b60e8afc4ceaa859bf48bf717ed0/public/logo.svg)

<h1 style="display: flex; justify-content: space-between;">
  next-nexus
  <div>
    <img alt="This page: English" src="https://img.shields.io/badge/This_page-English-303234" />
    <a href="./README.ko.md">
      <img alt="Switch to Korean" src="https://img.shields.io/badge/Switch_to-Korean-F8F0E3" />
    </a>
  </div>
</h1>

The intelligent data layer for Next.js. Simplify your app with automatic caching, seamless hydration, and built-in cost-saving logic.

---

> 📚 **For comprehensive guides and a full API reference, visit the [next-nexus official docs](https://next-nexus.vercel.app).**

`next-nexus` enhances native Next.js data fetching with a powerful, automated caching and hydration layer. It provides a minimal, predictable API for both Server and Client Components, enabling you to build fast, cost-effective applications with ease.

## Why next-nexus?

`next-nexus` solves common data management challenges in the Next.js App Router:

- **Eliminates UI Flicker & Duplicate Requests**: Data fetched on the server is automatically hydrated to the client, preventing duplicate requests and ensuring a smooth user experience.
- **Reduces Server Costs & TTFB**: Rendering delegation allows the server to skip component rendering if the client already has cached data, improving initial page load speed and reducing operational costs.
- **Saves Bandwidth**: ETag-based conditional requests prevent re-downloading unchanged data.
- **Simplifies Cache Management**: Precise, tag-based revalidation allows you to invalidate specific data in both server and client caches with a single action.

## Core Concepts

- **Automatic Hydration**: Server-fetched data is seamlessly transferred to the client, eliminating client-side refetching on mount.
- **Rendering Delegation**: Using `<NexusRenderer>`, the server can delegate rendering to the client if cached data is available, reducing TTFB and server load.
- **ETag-Powered Conditional Requests**: Uses HTTP `ETag` and `304 Not Modified` responses to avoid re-downloading data the client already has.
- **Unified API `definition`**: `createNexusDefinition` provides a single source of truth for API calls, ensuring type safety and consistent data fetching on both server and client.

## Quick Start

### 1. Installation

```bash
npm install next-nexus
# or
pnpm install next-nexus
# or
yarn add next-nexus
```

**Requires:** Next.js >= 14.0.0, React >= 18.2.0

### 2. Initialize Client-Side Runtime

Include `NexusRuntime` once in your root layout, just before the closing `</body>` tag. This component initializes the client-side cache and sends client cache metadata to the server during RSC requests to optimize data fetching.

```tsx
// app/layout.tsx
import { NexusRuntime } from 'next-nexus/client';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        {children}
        {/* NexusRuntime initializes the client cache and its functionalities. */}
        <NexusRuntime />
      </body>
    </html>
  );
}
```

### 3. Enable Hydration for Data Fetching Segments

To transfer server-fetched data to the client, you must wrap the data-fetching segment (page or layout) with `NexusHydrationBoundary`.

#### Standard Approach: Using `layout.tsx`

The standard method is to create a `layout.tsx` file and wrap `children` with the `<NexusHydrationBoundary>` component. This is useful for segments where multiple pages share the same data-fetching logic. For segments that don't need a layout, use the `withNexusHydrationBoundary` HOC described below.

```tsx
// app/products/layout.tsx
import { NexusHydrationBoundary } from 'next-nexus/server';

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Data fetched in this layout or its child pages will be collected.
  return <NexusHydrationBoundary>{children}</NexusHydrationBoundary>;
}
```

#### Convenient Approach: Using `withNexusHydrationBoundary` HOC

For simple segments that don't require a separate `layout.tsx` file, you can use the `withNexusHydrationBoundary` HOC (Higher-Order Component) pattern directly in your `page.tsx`.

```tsx
// app/products/page.tsx
import { withNexusHydrationBoundary } from 'next-nexus/server';
import { nexus } from 'next-nexus/server';
import { productDefinition } from '@/api/productDefinition';

async function ProductsPage() {
  // Data fetched here is automatically collected for hydration.
  const { data: products } = await nexus(productDefinition.list);

  return (
    // ... JSX using products
  );
}

// Wrap the page with the HOC to enable hydration.
export default withNexusHydrationBoundary(ProductsPage);
```

### 4. Create an API `definition` / Use Interceptors

- Use `createNexusDefinition` to create reusable, type-safe definitions for your API endpoints.
- Use `interceptors` to set up request/response interceptors.

```ts
// src/api/nexusDefinition.ts
import { createNexusDefinition, interceptors } from 'next-nexus';

// Base definition for common settings
export const createDefinition = createNexusDefinition({
  baseURL: 'https://api.example.com',
  timeout: 5, // All settings in next-nexus definitions are in seconds.
  retry: { count: 1, delay: 1 },
  headers: { 'x-app': 'docs' },
});

interceptors.request.use('auth', async config => {
  const headers = new Headers(config.headers);
  const token = getToken(); // Logic to get user authentication token

  headers.set('authorization', `Bearer ${token}`);

  return { ...config, headers };
});

// src/api/productDefinition.ts
import { createDefinition } from '@/api/nexusDefinition';

export interface Product {
  id: string;
  name: string;
}

export const productDefinition = {
  list: createDefinition<Product[]>({
    method: 'GET',
    endpoint: '/products',
    // Cache options for server and client
    server: {
      cache: 'force-cache', // Maps to cache option
      tags: ['products'], // Maps to next.tags option
      revalidate: 1800, // Maps to next.revalidate option
    },
    client: {
      tags: ['products'],
      revalidate: 300,
      cachedHeaders: ['x-total-count'], // Caches the header. **Only cache safe headers.**
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
      interceptors: ['auth'], // Uses the interceptor named "auth" defined in src/api/nexusDefinition.ts
    }),
};
```

### 5. Fetch Data in a Server Component

Use `nexus` to fetch data in Server Components. The data will be automatically hydrated.

```tsx
// app/products/page.tsx (Full Example)
import { withNexusHydrationBoundary } from 'next-nexus/server';
import { nexus } from 'next-nexus/server';
import { productDefinition } from '@/api/productDefinition';
import { ProductListClient } from './ProductListClient';

async function ProductsPage() {
  const { data: products, headers } = await nexus(productDefinition.list);
  const totalCount = headers.get('x-total-count');

  return (
    <div>
      <h1>Product List (Server) {totalCount} items</h1>
      <ul>
        {products?.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <hr />
      {/* This client component will receive the hydrated data. */}
      <ProductListClient />
    </div>
  );
}

export default withNexusHydrationBoundary(ProductsPage);
```

### 6. Use in a Client Component

Use `useNexusQuery` in a Client Component. It will instantly render with the hydrated data from the server, with no extra request.

```tsx
// app/products/ProductListClient.tsx
'use client';

import { useNexusQuery } from 'next-nexus/client';
import { productDefinition } from '@/api/productDefinition';

export const ProductListClient = () => {
  // No network request is made on initial render!
  const { data, isPending, headers } = useNexusQuery(productDefinition.list);
  const products = data ?? [];
  const totalCount = headers.get('x-total-count'); // We can get the 'x-total-count' header from the cache because we set it in client.cachedHeaders in the definition.

  if (isPending && !data) return <div>Loading...</div>;

  return (
    <div>
      <h2>Product List (Client) {totalCount} items</h2>
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
- **`useNexusQuery` (Client)**: A React hook for querying data in Client Components. It provides `pending`/`error` states and automatically uses hydrated data.
- **`useNexusInfiniteQuery` (Client)**: A powerful hook for implementing "infinite scroll" and pagination. It starts from an `initialPageParam` and dynamically fetches the next page via the `getNextPageParam` function.

  ```tsx
  // app/products/InfiniteProductList.tsx
  'use client';

  import { useNexusInfiniteQuery } from 'next-nexus/client';
  import { productDefinition } from '@/api/productDefinition';

  export const InfiniteProductList = () => {
    const { data, isPending, hasNextPage, revalidateNext } =
      useNexusInfiniteQuery(productDefinition.infiniteList, {
        initialPageParam: null, // Start with no cursor for the first page
        getNextPageParam: lastPage => {
          // Assuming the API response includes a cursor for the next page.
          // e.g., { products: [...], nextCursor: 'some-cursor' }
          return lastPage.nextCursor ?? null;
        },
      });

    const allProducts = data?.pages.flatMap(page => page.products) ?? [];

    return (
      <div>
        {/* ... render allProducts */}
        <button
          onClick={() => revalidateNext()}
          disabled={!hasNextPage || isPending}
        >
          {isPending ? 'Loading...' : 'Load More'}
        </button>
      </div>
    );
  };
  ```

### Performance Optimization with `NexusRenderer`

`NexusRenderer` is a key component for optimizing server rendering. If valid data already exists in the client cache, the server skips rendering and delegates this task to the client. This significantly reduces TTFB (Time to First Byte) and server costs.

You must pass the server presentational component to `serverComponent`, and for `clientComponent`, pass the client version of that component which has been re-exported from a file with a `'use client'` directive. This component receives the fetched data via the `data` prop from `NexusRenderer`, along with any other props passed through `componentProps`.

```tsx
// components/ProductListUI.tsx
// Server presentational component
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
// Client entry point to re-export the server presentational component as a client one
'use client';

export { default as ProductListUIClient } from '@/components/ProductListUI';
// ... This pattern allows re-exporting more server presentational components as client ones.

// app/page.tsx
// Using NexusRenderer in a Server Component
import { NexusRenderer } from 'next-nexus/server';
import { productDefinition } from '@/api/productDefinition';
import ProductListUI from '@/components/ProductListUI'; // Import server presentational component
import { ProductListUIClient } from '@/client-ui'; // Import client presentational component

export default function Page() {
  return (
    <NexusRenderer
      definition={productDefinition.list}
      serverComponent={ProductListUI}
      clientComponent={ProductListUIClient}
      componentProps={{ title: 'Our Products!' }}
    />
  );
}
```

### Data Mutation

- **`useNexusMutation`**: A hook for performing CUD (Create, Update, Delete) operations in Client Components. Ideal for when you need to affect data and update the UI.

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
        // On success, revalidate the 'products' tag to update the list.
        await revalidateServerTags(['products']); // revalidateServerTags is a Server Action, so it can be used in Client Components.
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
          {isPending ? 'Adding...' : 'Add Product'}
        </button>
      </div>
    );
  };
  ```

- **`useNexusAction` & `useNexusFormAction`**: Convenient wrappers for calling Server Actions from Client Components, complete with `pending` states and lifecycle callbacks.

  ```tsx
  'use client';

  import { useNexusFormAction } from 'next-nexus/client';

  const ProductForm = () => {
    const { formAction, isPending, isSuccess } = useNexusFormAction(
      async (formData: FormData) => {
        'use server';
        // ...server logic
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

- **`next-nexus` (Universal)**:
  - `createNexusDefinition`: Creates an API `definition`.
  - `interceptors`: Adds logic to the global request/response lifecycle.
  - `revalidateServerTags`: Invalidates the Next.js data cache based on tags.
- **`next-nexus/server` (Server only)**:
  - `nexus`: Requests data in Server Components and registers it for hydration.
  - `NexusRenderer`: A component that enables rendering delegation.
  - `NexusHydrationBoundary`: Wraps a Server Component tree to collect hydration data.
  - `withNexusHydrationBoundary`: An HOC version for pages.
- **`next-nexus/client` (Client only)**:
  - `useNexusQuery`: A hook for querying data in Client Components.
  - `useNexusInfiniteQuery`: A hook for infinite scrolling and pagination.
  - `useNexusMutation`: A hook for CUD (Create, Update, Delete) operations.
  - `useNexusAction` & `useNexusFormAction`: Wrapper hooks for Server Actions.
  - `NexusRuntime`: Initializes the client runtime and cache.
  - `nexusCache`: A utility for direct access to the client cache.
  - `revalidateClientTags`: Invalidates the client cache based on tags.
- **`next-nexus/errors` (Errors)**:
  - `isNexusError`: A type guard to check if an error is of type `NexusError`.

## Debugging (Dev Only)

- Request lifecycle logs (START/SUCCESS/ERROR/TIMEOUT) are printed in development by default.
- To enable detailed cache logs (`HIT`/`HIT-STALE`/`MISS`/`SKIP`/`MATCH`/`SET`/`UPDATE`/`DELETE`), add the following environment variable.

```bash
# .env.local
NEXT_PUBLIC_NEXUS_DEBUG=true
```

## License

MIT
