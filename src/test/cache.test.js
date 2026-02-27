import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cache } from '../utils/cache.js';

beforeEach(() => {
  cache.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cache', () => {
  it('stores and retrieves a value', () => {
    cache.set('foo', 42, 5000);
    expect(cache.get('foo')).toBe(42);
  });

  it('returns null for a missing key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('expires entry after TTL', () => {
    vi.useFakeTimers();
    cache.set('bar', 'hello', 1000);
    vi.advanceTimersByTime(1001);
    expect(cache.get('bar')).toBeNull();
  });

  it('del removes the key', () => {
    cache.set('baz', 99, 5000);
    cache.del('baz');
    expect(cache.get('baz')).toBeNull();
  });

  it('bust removes only keys with the given prefix', () => {
    cache.set('pool:abc', 1, 5000);
    cache.set('pool:xyz', 2, 5000);
    cache.set('other:abc', 3, 5000);
    cache.bust('pool:');
    expect(cache.get('pool:abc')).toBeNull();
    expect(cache.get('pool:xyz')).toBeNull();
    expect(cache.get('other:abc')).toBe(3);
  });
});
