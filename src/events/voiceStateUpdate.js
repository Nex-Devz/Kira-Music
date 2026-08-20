const musicManager = require('../managers/MusicManager');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(client, oldState, newState) {
    const guildId = oldState.guild.id;
    const player = musicManager.getPlayer(guildId);
    if (!player) return;

    const botId = client.user.id;

    // Check if bot was disconnected
    if (oldState.id === botId && !newState.channelId) {
      if (!player.is247) {
        await musicManager.stop(guildId);
      }
      return;
    }

    // Check if bot's voice channel became empty
    if (player.voiceChannelId) {
      const channel = oldState.guild.channels.cache.get(player.voiceChannelId);
      if (channel) {
        const nonBots = channel.members.filter(m => !m.user.bot);
        if (nonBots.size === 0 && !player.is247) {
          // No users left in voice channel, auto destroy after timeout if needed
          setTimeout(async () => {
            const currentChan = client.channels.cache.get(player.voiceChannelId);
            if (currentChan && currentChan.members.filter(m => !m.user.bot).size === 0 && !player.is247) {
              await musicManager.stop(guildId);
            }
          }, 30000);
        }
      }
    }
  }
};
