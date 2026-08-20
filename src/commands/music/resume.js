const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'resume',
  description: 'Resume paused audio playback',
  aliases: ['unpause', 'continue'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused audio playback'),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    if (!player.paused) {
      return context.replyError('Playback is not paused.');
    }

    await musicManager.resume(context.guildId);
    return context.replySuccess('Audio playback resumed.');
  }
};
