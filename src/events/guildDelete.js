const musicManager = require('../managers/MusicManager');

module.exports = {
  name: 'guildDelete',
  once: false,
  async execute(client, guild) {
    console.log(`[Kira] Removed from guild: ${guild.name} (${guild.id})`);
    try {
      await musicManager.stop(guild.id);
    } catch (e) {}
  }
};
