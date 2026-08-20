const { SlashCommandBuilder } = require('discord.js');
const guildRepo = require('../../database/repositories/GuildRepository');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'settings',
  description: 'View and configure server playback and music settings',
  aliases: ['config', 'dashboard'],
  guildOnly: true,
  adminOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View and configure server playback and music settings'),

  async execute(context) {
    const guildData = guildRepo.get(context.guildId);
    const payload = uiTemplates.buildSettingsDashboard(guildData);
    return context.reply(payload);
  }
};
