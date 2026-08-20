const { SlashCommandBuilder } = require('discord.js');
const guildRepo = require('../../database/repositories/GuildRepository');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'permissions',
  description: 'View playback and music control permission rules for this server',
  aliases: ['perms'],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('View playback and music control permission rules'),

  async execute(context) {
    const guildData = guildRepo.get(context.guildId);
    const djRoleText = guildData.dj_role_id ? `<@&${guildData.dj_role_id}>` : 'None (Open Access)';
    const musicChannelText = guildData.music_channel_id ? `<#${guildData.music_channel_id}>` : 'All Channels';

    const info = [
      `• **DJ Role:** ${djRoleText}`,
      `• **Music Command Channel:** ${musicChannelText}`,
      `• **Admins & Server Managers:** Full Bypass`,
      `• **Track Requesters:** Can skip and seek their own requested songs`
    ].join('\n');

    return context.reply(uiTemplates.buildSuccessMessage(`### Permission Rules\n${info}`));
  }
};
