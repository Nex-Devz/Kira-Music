const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'restart',
  description: 'Restart the current track from the beginning',
  aliases: ['replay'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the current track from the beginning'),

  async execute(context) {
    await musicManager.seek(context.guildId, 0);
    return context.replySuccess('Restarted current track.');
  }
};
