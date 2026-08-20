const crypto = require('crypto');
const dbManager = require('../index');

class PlaylistRepository {
  constructor() {
    this.db = dbManager.getDb();

    this.getPlaylistStmt = this.db.prepare('SELECT * FROM playlists WHERE id = ?');
    this.getPlaylistByNameStmt = this.db.prepare('SELECT * FROM playlists WHERE user_id = ? AND LOWER(name) = LOWER(?)');
    this.getUserPlaylistsStmt = this.db.prepare('SELECT p.*, COUNT(pt.id) as track_count FROM playlists p LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id WHERE p.user_id = ? GROUP BY p.id ORDER BY p.updated_at DESC');
    this.getGuildPublicPlaylistsStmt = this.db.prepare('SELECT p.*, COUNT(pt.id) as track_count FROM playlists p LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id WHERE p.guild_id = ? AND p.is_public = 1 GROUP BY p.id ORDER BY p.updated_at DESC');
    
    this.createPlaylistStmt = this.db.prepare(`
      INSERT INTO playlists (id, user_id, guild_id, name, description, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.deletePlaylistStmt = this.db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?');
    this.updatePlaylistStmt = this.db.prepare('UPDATE playlists SET name = ?, description = ?, is_public = ?, updated_at = ? WHERE id = ?');

    // Tracks
    this.getTracksStmt = this.db.prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC');
    this.addTrackStmt = this.db.prepare(`
      INSERT INTO playlist_tracks (playlist_id, title, author, uri, duration, artwork_url, source, position, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.removeTrackByPositionStmt = this.db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?');
    this.clearTracksStmt = this.db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?');
  }

  create(userId, guildId, name, description = '', isPublic = false) {
    const existing = this.getPlaylistByNameStmt.get(userId, name);
    if (existing) {
      throw new Error(`A playlist named "${name}" already exists.`);
    }

    const id = crypto.randomBytes(6).toString('hex');
    const now = Date.now();
    this.createPlaylistStmt.run(id, userId, guildId || null, name, description, isPublic ? 1 : 0, now, now);
    return {
      id,
      user_id: userId,
      guild_id: guildId,
      name,
      description,
      is_public: Boolean(isPublic),
      created_at: now,
      updated_at: now,
      tracks: []
    };
  }

  get(id) {
    const row = this.getPlaylistStmt.get(id);
    if (!row) return null;
    const tracks = this.getTracksStmt.all(id);
    return {
      ...row,
      is_public: Boolean(row.is_public),
      tracks
    };
  }

  getByName(userId, name) {
    const row = this.getPlaylistByNameStmt.get(userId, name);
    if (!row) return null;
    const tracks = this.getTracksStmt.all(row.id);
    return {
      ...row,
      is_public: Boolean(row.is_public),
      tracks
    };
  }

  getUserPlaylists(userId) {
    return this.getUserPlaylistsStmt.all(userId).map(p => ({
      ...p,
      is_public: Boolean(p.is_public)
    }));
  }

  getGuildPublicPlaylists(guildId) {
    return this.getGuildPublicPlaylistsStmt.all(guildId).map(p => ({
      ...p,
      is_public: Boolean(p.is_public)
    }));
  }

  delete(id, userId) {
    const tx = this.db.transaction(() => {
      this.clearTracksStmt.run(id);
      return this.deletePlaylistStmt.run(id, userId).changes > 0;
    });
    return tx();
  }

  addTrack(playlistId, track) {
    const playlist = this.get(playlistId);
    if (!playlist) throw new Error('Playlist not found.');

    const currentTracks = playlist.tracks || [];
    const position = currentTracks.length + 1;
    const now = Date.now();

    this.addTrackStmt.run(
      playlistId,
      track.title || 'Unknown Title',
      track.author || 'Unknown Artist',
      track.uri || '',
      track.duration || 0,
      track.artworkUrl || track.artwork_url || track.thumbnail || null,
      track.source || 'youtube',
      position,
      now
    );

    this.db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now, playlistId);
    return { position, ...track };
  }

  removeTrack(playlistId, position) {
    const playlist = this.get(playlistId);
    if (!playlist) throw new Error('Playlist not found.');

    const tx = this.db.transaction(() => {
      this.removeTrackByPositionStmt.run(playlistId, position);
      // Re-index remaining tracks
      const remaining = this.getTracksStmt.all(playlistId);
      const updatePosStmt = this.db.prepare('UPDATE playlist_tracks SET position = ? WHERE id = ?');
      remaining.forEach((tr, idx) => {
        updatePosStmt.run(idx + 1, tr.id);
      });
      this.db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(Date.now(), playlistId);
    });

    tx();
    return true;
  }
}

module.exports = new PlaylistRepository();
