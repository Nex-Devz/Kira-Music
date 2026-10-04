const { ActivityType } = require('discord.js');
const commandHandler = require('../handlers/CommandHandler');
const musicManager = require('../managers/MusicManager');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    const shardId = client.shard?.ids?.[0] ?? 0;
    logger.ready(`Shard #${shardId} Ready`);
    logger.ready(`${client.user.username} online!`);

    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    logger.ready(`Ready on ${client.guilds.cache.size} servers, for a total of ${totalUsers} users`);

    const supportGuild = config.client.supportGuildId ? client.guilds.cache.get(config.client.supportGuildId) : null;
    if (!supportGuild) {
      console.log('[BoosterCheck] Support Guild not found!');
    }

    // Set rich presence
    client.user.setPresence({
      activities: [
        {
          name: '/play | Discord Components V2',
          type: ActivityType.Listening
        }
      ],
      status: 'online'
    });

    // Initialize YuKumo Lavalink Music Client
    await musicManager.init(client);

    // Register slash commands globally
    await commandHandler.registerSlashCommands(client);

    // Restore 24/7 Voice Channels
    await musicManager.restore247Players();
  }
};
