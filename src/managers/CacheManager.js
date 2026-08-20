const { LRUCache } = require('lru-cache');

class CacheManager {
  constructor() {
    this.artworkCache = new LRUCache({
      max: 200,
      ttl: 1000 * 60 * 60 * 6 // 6 hours
    });

    this.lyricsCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 60 * 12 // 12 hours
    });

    this.trackInfoCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 60 // 1 hour
    });
  }

  getArtwork(url) {
    return this.artworkCache.get(url);
  }

  setArtwork(url, data) {
    this.artworkCache.set(url, data);
  }

  getLyrics(query) {
    return this.lyricsCache.get(query.toLowerCase());
  }

  setLyrics(query, data) {
    this.lyricsCache.set(query.toLowerCase(), data);
  }

  getTrackInfo(key) {
    return this.trackInfoCache.get(key);
  }

  setTrackInfo(key, data) {
    this.trackInfoCache.set(key, data);
  }

  clearAll() {
    this.artworkCache.clear();
    this.lyricsCache.clear();
    this.trackInfoCache.clear();
  }

  getStats() {
    return {
      artworkCount: this.artworkCache.size,
      lyricsCount: this.lyricsCache.size,
      trackInfoCount: this.trackInfoCache.size
    };
  }
}

module.exports = new CacheManager();
