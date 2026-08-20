const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'volume',
  description: 'Adjust playback volume',
  aliases: ['vol', 'v'],
  argNames: ['level'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust playback volume (0 - 150%)')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Volume level (0-150)')
        .setMinValue(0)
        .setMaxValue(150)
        .setRequired(true)
    ),

  async execute(context) {
    const level = context.getInteger('level');
    if (level === null || isNaN(level)) {
      const player = musicManager.getPlayer(context.guildId);
      return context.replySuccess(`Current playback volume: **${player.volume || 80}%**`);
    }

    const setVol = await musicManager.setVolume(context.guildId, level);
    return context.replySuccess(`Volume set to **${setVol}%**.`);
  }
};
