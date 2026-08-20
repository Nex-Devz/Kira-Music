const { SlashCommandBuilder } = require('discord.js');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'setup',
  description: 'Interactive first-time server setup wizard for music and player channels',
  aliases: ['init', 'wizard'],
  guildOnly: true,
  adminOnly: true,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Interactive first-time server setup wizard'),

  async execute(context) {
    const payload = uiTemplates.buildSetupWizard(1);
    return context.reply(payload);
  }
};
