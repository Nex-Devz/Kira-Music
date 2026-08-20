const dbManager = require('../index');

class UserRepository {
  constructor() {
    this.db = dbManager.getDb();

    // User table
    this.getUserStmt = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
    this.createUserStmt = this.db.prepare('INSERT INTO users (user_id, preferences, created_at, updated_at) VALUES (?, ?, ?, ?)');
    this.updateUserStmt = this.db.prepare('UPDATE users SET preferences = ?, updated_at = ? WHERE user_id = ?');

    // Favorites
    this.getFavoritesStmt = this.db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY added_at DESC');
    this.getFavoriteByUriStmt = this.db.prepare('SELECT * FROM favorites WHERE user_id = ? AND uri = ?');
    this.addFavoriteStmt = this.db.prepare(`
      INSERT INTO favorites (user_id, title, author, uri, duration, artwork_url, source, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.removeFavoriteStmt = this.db.prepare('DELETE FROM favorites WHERE user_id = ? AND (id = ? OR uri = ?)');
    this.clearFavoritesStmt = this.db.prepare('DELETE FROM favorites WHERE user_id = ?');

    // History
    this.getHistoryStmt = this.db.prepare('SELECT * FROM listening_history WHERE user_id = ? ORDER BY played_at DESC LIMIT ?');
    this.addHistoryStmt = this.db.prepare(`
      INSERT INTO listening_history (user_id, guild_id, title, author, uri, duration, played_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.clearHistoryStmt = this.db.prepare('DELETE FROM listening_history WHERE user_id = ?');

    // User profile stats
    this.getUserTotalListeningStmt = this.db.prepare('SELECT COUNT(*) as total_played, SUM(duration) as total_duration FROM listening_history WHERE user_id = ?');
    this.getUserTopArtistsStmt = this.db.prepare(`
      SELECT author, COUNT(*) as count
      FROM listening_history
      WHERE user_id = ?
      GROUP BY author
      ORDER BY count DESC
      LIMIT ?
    `);
    this.getUserTopTracksStmt = this.db.prepare(`
      SELECT title, author, uri, COUNT(*) as count
      FROM listening_history
      WHERE user_id = ?
      GROUP BY uri
      ORDER BY count DESC
      LIMIT ?
    `);
  }

  getUser(userId) {
    if (!userId) return null;
    let row = this.getUserStmt.get(userId);
    if (!row) {
      const now = Date.now();
      this.createUserStmt.run(userId, '{}', now, now);
      row = { user_id: userId, preferences: '{}', created_at: now, updated_at: now };
    }
    return {
      ...row,
      preferences: JSON.parse(row.preferences || '{}')
    };
  }

  updatePreferences(userId, prefs) {
    const user = this.getUser(userId);
    const updated = { ...user.preferences, ...prefs };
    this.updateUserStmt.run(JSON.stringify(updated), Date.now(), userId);
    return updated;
  }

  // Favorites
  getFavorites(userId) {
    return this.getFavoritesStmt.all(userId);
  }

  isFavorite(userId, uri) {
    return Boolean(this.getFavoriteByUriStmt.get(userId, uri));
  }

  addFavorite(userId, track) {
    const existing = this.getFavoriteByUriStmt.get(userId, track.uri);
    if (existing) return existing;

    const res = this.addFavoriteStmt.run(
      userId,
      track.title || 'Unknown Title',
      track.author || 'Unknown Artist',
      track.uri || '',
      track.duration || 0,
      track.artworkUrl || track.artwork_url || track.thumbnail || null,
      track.source || 'youtube',
      Date.now()
    );
    return { id: res.lastInsertRowid, ...track };
  }

  removeFavorite(userId, idOrUri) {
    return this.removeFavoriteStmt.run(userId, idOrUri, idOrUri).changes > 0;
  }

  clearFavorites(userId) {
    return this.clearFavoritesStmt.run(userId).changes;
  }

  // History
  getHistory(userId, limit = 50) {
    return this.getHistoryStmt.all(userId, limit);
  }

  addHistory(userId, guildId, track) {
    if (!track || !track.uri) return;
    this.addHistoryStmt.run(
      userId,
      guildId || null,
      track.title || 'Unknown Title',
      track.author || 'Unknown Artist',
      track.uri,
      track.duration || 0,
      Date.now()
    );
  }

  clearHistory(userId) {
    return this.clearHistoryStmt.run(userId).changes;
  }

  // Profile Analytics
  getProfileStats(userId) {
    const summary = this.getUserTotalListeningStmt.get(userId) || { total_played: 0, total_duration: 0 };
    const topArtists = this.getUserTopArtistsStmt.all(userId, 5);
    const topTracks = this.getUserTopTracksStmt.all(userId, 5);
    const favoritesCount = this.db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(userId)?.count || 0;
    const playlistsCount = this.db.prepare('SELECT COUNT(*) as count FROM playlists WHERE user_id = ?').get(userId)?.count || 0;

    return {
      userId,
      totalPlayed: summary.total_played || 0,
      totalDurationMs: summary.total_duration || 0,
      favoritesCount,
      playlistsCount,
      topArtists,
      topTracks
    };
  }
}

module.exports = new UserRepository();
