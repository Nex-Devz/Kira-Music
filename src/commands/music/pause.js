const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'pause',
  description: 'Pause audio playback',
  aliases: ['halt'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause audio playback'),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    if (player.paused) {
      return context.replyError('Playback is already paused.');
    }

    await musicManager.pause(context.guildId);
    return context.replySuccess('Audio playback paused.');
  }
};
