const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'forward',
  description: 'Forward current track by specified number of seconds',
  aliases: ['fwd', 'ff'],
  argNames: ['seconds'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('forward')
    .setDescription('Forward current track by specified number of seconds')
    .addIntegerOption(option =>
      option
        .setName('seconds')
        .setDescription('Number of seconds to skip forward (default: 10)')
        .setMinValue(1)
        .setMaxValue(300)
    ),

  async execute(context) {
    const seconds = context.getInteger('seconds') || 10;
    const player = musicManager.getPlayer(context.guildId);
    const curPos = player.position || 0;
    const duration = player.currentTrack?.duration || 0;

    const targetPos = Math.min(duration || Infinity, curPos + seconds * 1000);
    await musicManager.seek(context.guildId, targetPos);
    return context.replySuccess(`Forwarded **+${seconds}s**.`);
  }
};
