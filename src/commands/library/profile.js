const { SlashCommandBuilder } = require('discord.js');
const userRepo = require('../../database/repositories/UserRepository');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'profile',
  description: 'Display your listening stats and music profile card',
  aliases: ['userinfo', 'musicprofile'],
  argNames: ['user'],
  guildOnly: true,
  cooldown: 4,

  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Display your listening stats and music profile card')
    .addUserOption(opt => opt.setName('user').setDescription('User to view profile for (optional)')),

  async execute(context) {
    const targetUser = context.getUser('user') || context.user;
    await context.deferReply();

    const profileData = userRepo.getProfileStats(targetUser.id);
    const payload = await uiTemplates.buildProfileView(profileData, targetUser);
    return context.reply(payload);
  }
};
