const dbManager = require('../index');

class PersistentPlayerRepository {
  constructor() {
    this.db = dbManager.getDb();
    this.getStmt = this.db.prepare('SELECT * FROM persistent_players WHERE guild_id = ?');
    this.setStmt = this.db.prepare(`
      INSERT INTO persistent_players (guild_id, voice_channel_id, text_channel_id, player_message_id, is_247, volume, loop_mode, autoplay, filters, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        voice_channel_id = excluded.voice_channel_id,
        text_channel_id = excluded.text_channel_id,
        player_message_id = excluded.player_message_id,
        is_247 = excluded.is_247,
        volume = excluded.volume,
        loop_mode = excluded.loop_mode,
        autoplay = excluded.autoplay,
        filters = excluded.filters,
        updated_at = excluded.updated_at
    `);
    this.deleteStmt = this.db.prepare('DELETE FROM persistent_players WHERE guild_id = ?');
    this.listAll247Stmt = this.db.prepare('SELECT * FROM persistent_players WHERE is_247 = 1');
  }

  get(guildId) {
    if (!guildId) return null;
    const row = this.getStmt.get(guildId);
    if (!row) return null;
    return {
      ...row,
      is_247: Boolean(row.is_247),
      autoplay: Boolean(row.autoplay),
      filters: JSON.parse(row.filters || '[]')
    };
  }

  save(guildId, data) {
    this.setStmt.run(
      guildId,
      data.voiceChannelId || data.voice_channel_id || null,
      data.textChannelId || data.text_channel_id || null,
      data.playerMessageId || data.player_message_id || null,
      data.is247 || data.is_247 ? 1 : 0,
      data.volume || 80,
      data.loopMode || data.loop_mode || 'off',
      data.autoplay ? 1 : 0,
      JSON.stringify(data.filters || []),
      Date.now()
    );
  }

  delete(guildId) {
    return this.deleteStmt.run(guildId).changes > 0;
  }

  list247() {
    return this.listAll247Stmt.all().map(row => ({
      ...row,
      is_247: true,
      autoplay: Boolean(row.autoplay),
      filters: JSON.parse(row.filters || '[]')
    }));
  }
}

module.exports = new PersistentPlayerRepository();
