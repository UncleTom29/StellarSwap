const store = new Map();

export const cache = {
  set(key, value, ttl) {
    store.set(key, { value, expires: Date.now() + ttl });
  },

  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  del(key) {
    store.delete(key);
  },

  bust(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  },

  clear() {
    store.clear();
  },
};
