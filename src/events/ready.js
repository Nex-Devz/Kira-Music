const { ActivityType } = require('discord.js');
const commandHandler = require('../handlers/CommandHandler');
const musicManager = require('../managers/MusicManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Kira] Bot logged in as ${client.user.tag} (ID: ${client.user.id})`);

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
    musicManager.init(client);

    // Register slash commands globally
    await commandHandler.registerSlashCommands(client);

    // Restore 24/7 Voice Channels
    await musicManager.restore247Players();

    console.log('[Kira] All systems initialized and ready.');
  }
};
