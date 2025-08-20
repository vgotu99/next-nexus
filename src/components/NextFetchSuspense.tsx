import { Suspense, type SuspenseProps } from 'react';

import { runWithDelegationEnabled } from '../scope/renderRegistry';

export const NextFetchSuspense = (props: SuspenseProps) => {
  return runWithDelegationEnabled(() => {
    return <Suspense {...props} />;
  });
};
