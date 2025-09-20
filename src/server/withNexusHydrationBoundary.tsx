import { NexusHydrationBoundary } from '@/server/NexusHydrationBoundary';

export const withNexusHydrationBoundary = <
  P extends React.JSX.IntrinsicAttributes,
>(
  Page: ((props: P) => Promise<React.JSX.Element> | React.JSX.Element) & {
    displayName?: string;
  }
) => {
  const Wrapped = async (props: P) => {
    return (
      <NexusHydrationBoundary>
        <Page {...props} />
      </NexusHydrationBoundary>
    );
  };

  const pageName = Page.displayName || Page.name || 'Component';
  Wrapped.displayName = `withNexusHydrationBoundary(${pageName})`;

  return Wrapped;
};
