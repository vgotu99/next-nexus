import {
  enterPendingStore,
  reservePending,
  releaseReservation,
  incPending,
  decPending,
  markRenderSettled,
  waitForAll,
} from '@/scope/requestPendingStore';

describe('requestPendingStore', () => {
  it('waitForAll returns immediately when no store', async () => {
    await expect(waitForAll()).resolves.toBeUndefined();
  });

  it('handles lifecycle: reserve -> inc -> dec -> release -> settled -> waitForAll', async () => {
    enterPendingStore();
    reservePending();

    incPending();

    decPending();

    markRenderSettled();
    releaseReservation();

    await expect(waitForAll()).resolves.toBeUndefined();
  });
});
