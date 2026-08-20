const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'stop',
  description: 'Stop playback, clear queue, and leave voice channel',
  aliases: ['leave', 'disconnect'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback, clear queue, and leave voice channel'),

  async execute(context) {
    await musicManager.stop(context.guildId);
    return context.replySuccess('Playback stopped and queue cleared.');
  }
};
