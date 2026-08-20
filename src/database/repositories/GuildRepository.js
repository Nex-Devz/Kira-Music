const dbManager = require('../index');
const { DEFAULT_CONFIG } = require('../../config/constants');

class GuildRepository {
  constructor() {
    this.db = dbManager.getDb();
    this.getStmt = this.db.prepare('SELECT * FROM guilds WHERE guild_id = ?');
    this.createStmt = this.db.prepare(`
      INSERT INTO guilds (guild_id, prefix, dj_role_id, music_channel_id, player_channel_id, player_message_id, default_volume, loop_mode, autoplay, mode_247, player_theme, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStmt = this.db.prepare(`
      UPDATE guilds
      SET prefix = ?, dj_role_id = ?, music_channel_id = ?, player_channel_id = ?, player_message_id = ?,
          default_volume = ?, loop_mode = ?, autoplay = ?, mode_247 = ?, player_theme = ?, permissions = ?, updated_at = ?
      WHERE guild_id = ?
    `);
  }

  get(guildId) {
    if (!guildId) return null;
    const row = this.getStmt.get(guildId);
    if (!row) {
      return this.create(guildId);
    }
    return {
      ...row,
      autoplay: Boolean(row.autoplay),
      mode_247: Boolean(row.mode_247),
      permissions: JSON.parse(row.permissions || '{}')
    };
  }

  create(guildId) {
    const now = Date.now();
    const defaultData = {
      guild_id: guildId,
      prefix: DEFAULT_CONFIG.PREFIX,
      dj_role_id: null,
      music_channel_id: null,
      player_channel_id: null,
      player_message_id: null,
      default_volume: DEFAULT_CONFIG.DEFAULT_VOLUME,
      loop_mode: DEFAULT_CONFIG.DEFAULT_LOOP,
      autoplay: DEFAULT_CONFIG.DEFAULT_AUTOPLAY ? 1 : 0,
      mode_247: DEFAULT_CONFIG.DEFAULT_247 ? 1 : 0,
      player_theme: DEFAULT_CONFIG.DEFAULT_PLAYER_THEME,
      permissions: '{}',
      created_at: now,
      updated_at: now
    };

    this.createStmt.run(
      defaultData.guild_id,
      defaultData.prefix,
      defaultData.dj_role_id,
      defaultData.music_channel_id,
      defaultData.player_channel_id,
      defaultData.player_message_id,
      defaultData.default_volume,
      defaultData.loop_mode,
      defaultData.autoplay,
      defaultData.mode_247,
      defaultData.player_theme,
      defaultData.permissions,
      defaultData.created_at,
      defaultData.updated_at
    );

    return {
      ...defaultData,
      autoplay: Boolean(defaultData.autoplay),
      mode_247: Boolean(defaultData.mode_247),
      permissions: {}
    };
  }

  update(guildId, updates) {
    const current = this.get(guildId);
    const updated = { ...current, ...updates, updated_at: Date.now() };

    this.updateStmt.run(
      updated.prefix,
      updated.dj_role_id || null,
      updated.music_channel_id || null,
      updated.player_channel_id || null,
      updated.player_message_id || null,
      updated.default_volume,
      updated.loop_mode,
      updated.autoplay ? 1 : 0,
      updated.mode_247 ? 1 : 0,
      updated.player_theme,
      JSON.stringify(updated.permissions || {}),
      updated.updated_at,
      guildId
    );

    return updated;
  }
}

module.exports = new GuildRepository();
