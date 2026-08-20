const { SlashCommandBuilder } = require('discord.js');
const recommendCommand = require('./recommend');

module.exports = {
  ...recommendCommand,
  name: 'related',
  description: 'Find related songs to the current track',
  aliases: ['similartracks'],

  data: new SlashCommandBuilder()
    .setName('related')
    .setDescription('Find related songs to the current track')
};
