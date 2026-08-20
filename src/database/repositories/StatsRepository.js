const dbManager = require('../index');

class StatsRepository {
  constructor() {
    this.db = dbManager.getDb();
    this.recordPlayStmt = this.db.prepare(`
      INSERT INTO stats (guild_id, user_id, tracks_played, play_time_ms, updated_at)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        tracks_played = tracks_played + 1,
        play_time_ms = play_time_ms + excluded.play_time_ms,
        updated_at = excluded.updated_at
    `);

    this.getGuildStatsStmt = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        SUM(tracks_played) as total_tracks,
        SUM(play_time_ms) as total_play_time
      FROM stats
      WHERE guild_id = ?
    `);

    this.getGuildTopUsersStmt = this.db.prepare(`
      SELECT user_id, tracks_played, play_time_ms
      FROM stats
      WHERE guild_id = ?
      ORDER BY tracks_played DESC
      LIMIT ?
    `);

    this.getGlobalStatsStmt = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT guild_id) as total_guilds,
        COUNT(DISTINCT user_id) as total_users,
        SUM(tracks_played) as total_tracks,
        SUM(play_time_ms) as total_play_time
      FROM stats
    `);
  }

  recordPlay(guildId, userId, durationMs = 0) {
    if (!guildId || !userId) return;
    this.recordPlayStmt.run(guildId, userId, Math.max(0, durationMs), Date.now());
  }

  getGuildStats(guildId) {
    const summary = this.getGuildStatsStmt.get(guildId) || { total_users: 0, total_tracks: 0, total_play_time: 0 };
    const topUsers = this.getGuildTopUsersStmt.all(guildId, 5);
    return {
      guildId,
      totalUsers: summary.total_users || 0,
      totalTracks: summary.total_tracks || 0,
      totalPlayTimeMs: summary.total_play_time || 0,
      topUsers
    };
  }

  getGlobalStats() {
    const summary = this.getGlobalStatsStmt.get() || { total_guilds: 0, total_users: 0, total_tracks: 0, total_play_time: 0 };
    return {
      totalGuilds: summary.total_guilds || 0,
      totalUsers: summary.total_users || 0,
      totalTracks: summary.total_tracks || 0,
      totalPlayTimeMs: summary.total_play_time || 0
    };
  }
}

module.exports = new StatsRepository();
