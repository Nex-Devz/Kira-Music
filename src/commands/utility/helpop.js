const { SlashCommandBuilder } = require('discord.js');
const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'helpop',
  description: 'Interactive Discord Components V2 command browser and help dashboard',
  aliases: ['help', 'commands', 'h', 'helpme'],
  argNames: ['category'],
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('helpop')
    .setDescription('Interactive command browser and help dashboard')
    .addStringOption(opt =>
      opt
        .setName('category')
        .setDescription('Command category')
        .addChoices(
          { name: 'Home Overview', value: 'home' },
          { name: 'Music & Playback', value: 'music' },
          { name: 'Queue & Audio', value: 'queue' },
          { name: 'Library & Playlists', value: 'library' },
          { name: 'Server Settings', value: 'settings' },
          { name: 'Premium & Utility', value: 'premium' }
        )
    ),

  async execute(context) {
    const cat = context.getString('category') || 'home';
    const isDev = permissionManager.isDeveloper(context.userId);
    const payload = uiTemplates.buildHelpMenu(cat, isDev);
    return context.reply(payload);
  }
};
