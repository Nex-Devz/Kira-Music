const cacheManager = require('../managers/CacheManager');

/**
 * Build a stable lyrics cache key from a track object.
 */
function trackQuery(track) {
  if (!track) return null;
  const title = track.title || track.info?.title;
  const author = track.author || track.info?.author;
  if (!title) return null;
  return author ? `${title} ${author}` : String(title);
}

/**
 * Resolve lyrics text for a query.
 * - Returns cached text immediately when available.
 * - When `allowNode` is set, asks the Lavalink node for the current track's
 *   lyrics (node lyrics always describe what is playing right now).
 * - Returns null when nothing is found — callers show honest copy instead of
 *   fabricated lyrics. Failures are never cached, so a retry can succeed.
 */
async function resolveLyrics(player, query, allowNode = false) {
  if (!query) return null;

  const cached = cacheManager.getLyrics(query);
  if (cached) return cached;

  let text = null;

  if (allowNode && player?.currentTrack?.encoded) {
    try {
      const lData = (await player.getCurrentLyrics?.()) || (await player.getLyrics?.());
      if (lData?.lines && Array.isArray(lData.lines)) {
        const joined = lData.lines.map(l => l.line || l.text).filter(Boolean).join('\n');
        text = joined.trim() || null;
      } else if (typeof lData?.text === 'string' && lData.text.trim()) {
        text = lData.text;
      }
    } catch (e) {
      // Node has no lyrics for this track — fall through to the honest null.
    }
  }

  if (text) {
    cacheManager.setLyrics(query, text);
  }
  return text;
}

module.exports = { trackQuery, resolveLyrics };
