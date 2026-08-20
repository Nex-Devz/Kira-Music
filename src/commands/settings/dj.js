const { SlashCommandBuilder } = require('discord.js');
const guildRepo = require('../../database/repositories/GuildRepository');

module.exports = {
  name: 'dj',
  description: 'Set or clear the DJ role for playback controls',
  aliases: ['setdj', 'djrole'],
  argNames: ['role'],
  guildOnly: true,
  adminOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('dj')
    .setDescription('Set or clear the DJ role for playback controls')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to designate as DJ (leave empty to disable)')),

  async execute(context) {
    const role = context.getRole('role');
    if (!role) {
      guildRepo.update(context.guildId, { dj_role_id: null });
      return context.replySuccess('DJ role requirement disabled. Anyone in the voice channel can control playback.');
    }

    guildRepo.update(context.guildId, { dj_role_id: role.id });
    return context.replySuccess(`DJ role set to <@&${role.id}>.`);
  }
};
