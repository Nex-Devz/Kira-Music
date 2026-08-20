const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'nowplaying',
  description: 'Display interactive player card and playback state',
  aliases: ['np', 'current'],
  playerRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Display interactive player card and playback state'),

  async execute(context) {
    await context.deferReply();
    const player = musicManager.getPlayer(context.guildId);
    const payload = await uiTemplates.buildPlayerView(player);
    return context.reply(payload);
  }
};
