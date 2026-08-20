const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const premiumManager = require('../../managers/PremiumManager');
const guildRepo = require('../../database/repositories/GuildRepository');

module.exports = {
  name: 'autoplay',
  description: 'Automatically discover and play related tracks when the queue finishes',
  aliases: ['ap', 'auto'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Automatically discover and play related tracks when the queue finishes'),

  async execute(context) {
    const canAutoplay = premiumManager.canUseAutoplay(context.guildId, context.userId);
    if (!canAutoplay) {
      return context.replyError('Autoplay requires an upgraded **Premium Plan** (Silver, Gold, or Diamond). Use `/premium` to view perks.');
    }

    const player = musicManager.getPlayer(context.guildId);
    const newState = !player.autoplay;
    musicManager.setAutoplay(context.guildId, newState);
    guildRepo.update(context.guildId, { autoplay: newState ? 1 : 0 });
    await musicManager.updatePlayerMessage(player);

    return context.replySuccess(`Autoplay is now **${newState ? 'Enabled' : 'Disabled'}**.`);
  }
};
