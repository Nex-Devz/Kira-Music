const guildRepo = require('../database/repositories/GuildRepository');

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(client, guild) {
    console.log(`[Kira] Joined new guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    guildRepo.create(guild.id);
  }
};
