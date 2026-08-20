const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'previous',
  description: 'Play the previously played track',
  aliases: ['prev', 'back'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('previous')
    .setDescription('Play the previously played track'),

  async execute(context) {
    try {
      await musicManager.previous(context.guildId);
      return context.replySuccess('Playing previous track.');
    } catch (err) {
      return context.replyError(err.message || 'No previous track available.');
    }
  }
};
