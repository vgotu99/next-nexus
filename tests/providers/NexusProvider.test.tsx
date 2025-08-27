/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import React from 'react';

const ClientMock = jest.fn(
  ({ children }: { children: React.ReactNode; maxSize?: number }) => (
    <div data-testid='client'>{children}</div>
  )
);
const ServerMock = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid='server'>{children}</div>
));

jest.mock('@/providers/ClientNexusProvider', () => ({
  __esModule: true,
  default: ClientMock,
}));

jest.mock('@/providers/ServerNexusProvider', () => ({
  __esModule: true,
  default: ServerMock,
}));

describe('NexusProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('chooses ClientNexusProvider on client and forwards maxSize', () => {
    jest.doMock('@/utils/environmentUtils', () => ({
      isClientEnvironment: () => true,
      isServerEnvironment: () => false,
      isDevelopment: () => false,
    }));

    jest.isolateModules(() => {
      const { NexusProvider } = require('@/providers/NexusProvider');
      const { getByTestId } = render(
        <NexusProvider maxSize={7}>
          <span>child</span>
        </NexusProvider>
      );
      expect(getByTestId('client')).toBeTruthy();
      expect(ClientMock).toHaveBeenCalledTimes(1);
      const call = (ClientMock as jest.Mock).mock.calls[0][0];
      expect(call.maxSize).toBe(7);
    });
  });

  it('chooses ServerNexusProvider on server', () => {
    jest.doMock('@/utils/environmentUtils', () => ({
      isClientEnvironment: () => false,
      isServerEnvironment: () => true,
      isDevelopment: () => false,
    }));

    jest.isolateModules(() => {
      const { NexusProvider } = require('@/providers/NexusProvider');
      const { getByTestId } = render(
        <NexusProvider>
          <span>server-child</span>
        </NexusProvider>
      );
      expect(getByTestId('server')).toBeTruthy();
      expect(ServerMock).toHaveBeenCalledTimes(1);
    });
  });
});
