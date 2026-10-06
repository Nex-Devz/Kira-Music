const musicManager = require('../managers/MusicManager');

// One pending empty-channel timer per guild — voiceStateUpdate fires for every
// join/leave/move, so without this the timers would stack.
const pendingLeaveChecks = new Map();

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
        if (nonBots.size === 0 && !player.is247 && !pendingLeaveChecks.has(guildId)) {
          // No users left in voice channel, auto destroy after timeout if needed
          const timer = setTimeout(async () => {
            pendingLeaveChecks.delete(guildId);
            try {
              const currentGuild = client.guilds.cache.get(guildId);
              const currentChan = currentGuild?.channels.cache.get(player.voiceChannelId);
              const stillEmpty = currentChan && currentChan.members.filter(m => !m.user.bot).size === 0;
              const latest = musicManager.getPlayer(guildId);
              if (stillEmpty && latest && !latest.is247) {
                await musicManager.stop(guildId);
              }
            } catch (e) {}
          }, 30000);
          timer.unref?.();
          pendingLeaveChecks.set(guildId, timer);
        } else if (nonBots.size > 0) {
          // Someone rejoined — cancel the pending disconnect
          const existing = pendingLeaveChecks.get(guildId);
          if (existing) {
            clearTimeout(existing);
            pendingLeaveChecks.delete(guildId);
          }
        }
      }
    }
  }
};
