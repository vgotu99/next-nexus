Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
  },
  writable: true,
});

(global as any).fetch = jest.fn();

global.caches = {
  open: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
  match: jest.fn(),
} as any;

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

console.warn = jest.fn();
console.error = jest.fn();
console.log = jest.fn();
