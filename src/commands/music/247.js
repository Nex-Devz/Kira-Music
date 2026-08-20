const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const premiumManager = require('../../managers/PremiumManager');
const guildRepo = require('../../database/repositories/GuildRepository');
const persistentRepo = require('../../database/repositories/PersistentPlayerRepository');

module.exports = {
  name: '247',
  description: 'Toggle 24/7 persistent voice channel connection mode',
  aliases: ['stay', 'alwayson'],
  voiceRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 persistent voice channel connection mode'),

  async execute(context) {
    const can247 = premiumManager.canUse247(context.guildId, context.userId);
    if (!can247) {
      return context.replyError('24/7 Mode requires **Gold or Diamond Premium Tier**. Use `/premium` to upgrade.');
    }

    const player = musicManager.getPlayer(context.guildId) || musicManager.createPlayer(context.guildId, context.voiceChannel.id, context.channel.id);
    const newState = !player.is247;
    player.is247 = newState;

    if (typeof player.setStayInVc === 'function') {
      player.setStayInVc(newState);
    }

    guildRepo.update(context.guildId, { mode_247: newState ? 1 : 0 });

    if (newState) {
      persistentRepo.save(context.guildId, {
        voiceChannelId: context.voiceChannel.id,
        textChannelId: context.channel.id,
        is247: true,
        volume: player.volume || 80
      });
    } else {
      persistentRepo.delete(context.guildId);
    }

    return context.replySuccess(`24/7 Persistent Mode is now **${newState ? 'Enabled' : 'Disabled'}**.`);
  }
};
