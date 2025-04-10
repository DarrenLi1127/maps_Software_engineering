package edu.brown.cs.student.main.server.geoJson;

import java.util.LinkedHashMap;
import java.util.Map;

/** Cache for redlining data queries. Implements a simple LRU (Least Recently Used) cache. */
public class RedliningDataCache {
  // Default maximum cache size (in number of entries)
  private static final int DEFAULT_MAX_SIZE = 20;

  // The cache storage - uses LinkedHashMap for LRU implementation
  private final Map<String, String> cache;
  private final int maxSize;

  /** Constructor with default cache size. */
  public RedliningDataCache() {
    this(DEFAULT_MAX_SIZE);
  }

  /**
   * Constructor with specified cache size.
   *
   * @param maxSize Maximum number of entries to keep in cache
   */
  public RedliningDataCache(int maxSize) {
    this.maxSize = maxSize;

    // Create a LinkedHashMap with access-order
    // (which moves entries to the end of the list when accessed)
    this.cache =
        new LinkedHashMap<String, String>(16, 0.75f, true) {
          @Override
          protected boolean removeEldestEntry(Map.Entry<String, String> eldest) {
            return size() > RedliningDataCache.this.maxSize;
          }
        };
  }

  /**
   * Check if the cache has data for a given key.
   *
   * @param key The cache key
   * @return true if the key exists in the cache
   */
  public synchronized boolean hasData(String key) {
    return cache.containsKey(key);
  }

  /**
   * Get data from the cache.
   *
   * @param key The cache key
   * @return The cached data, or null if not found
   */
  public synchronized String getData(String key) {
    return cache.get(key);
  }

  /**
   * Put data into the cache.
   *
   * @param key The cache key
   * @param data The data to cache
   */
  public synchronized void putData(String key, String data) {
    cache.put(key, data);
  }

  /** Clear the cache. */
  public synchronized void clear() {
    cache.clear();
  }

  /**
   * Get the current cache size.
   *
   * @return The number of entries in the cache
   */
  public synchronized int size() {
    return cache.size();
  }
}
