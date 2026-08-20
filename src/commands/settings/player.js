const { SlashCommandBuilder } = require('discord.js');
const guildRepo = require('../../database/repositories/GuildRepository');

module.exports = {
  name: 'player',
  description: 'Set or clear the persistent player channel',
  aliases: ['playerchannel', 'setplayer'],
  argNames: ['channel'],
  guildOnly: true,
  adminOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Set or clear the dedicated persistent player channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Text channel for the dedicated player')),

  async execute(context) {
    const channel = context.getChannel('channel');
    if (!channel) {
      guildRepo.update(context.guildId, { player_channel_id: null });
      return context.replySuccess('Persistent player channel disabled. Player will update in the command channel.');
    }

    guildRepo.update(context.guildId, { player_channel_id: channel.id });
    return context.replySuccess(`Persistent player channel set to <#${channel.id}>.`);
  }
};
