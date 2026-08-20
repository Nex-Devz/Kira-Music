const { SlashCommandBuilder } = require('discord.js');
const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'help',
  description: 'Interactive Discord Components V2 command browser',
  aliases: ['commands', 'h'],
  argNames: ['category'],
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Interactive command browser')
    .addStringOption(opt =>
      opt
        .setName('category')
        .setDescription('Command category')
        .addChoices(
          { name: 'Music & Playback', value: 'music' },
          { name: 'Queue & Audio', value: 'queue' },
          { name: 'Library & Playlists', value: 'library' },
          { name: 'Server Settings', value: 'settings' },
          { name: 'Premium & Utility', value: 'premium' }
        )
    ),

  async execute(context) {
    const cat = context.getString('category') || 'music';
    const isDev = permissionManager.isDeveloper(context.userId);
    const payload = uiTemplates.buildHelpMenu(cat, isDev);
    return context.reply(payload);
  }
};
