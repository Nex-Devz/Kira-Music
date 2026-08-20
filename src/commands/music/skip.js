const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'skip',
  description: 'Skip the current track',
  aliases: ['next', 's'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    const curTrack = player.currentTrack || player.queue?.current;
    await musicManager.skip(context.guildId);
    return context.replySuccess(`Skipped **${curTrack?.title || 'current track'}**.`);
  }
};
