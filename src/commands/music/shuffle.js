const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'shuffle',
  description: 'Randomly shuffle all tracks in the queue',
  aliases: ['shuff', 'mix'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Randomly shuffle all tracks in the queue'),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    const isCurrentInTracks = Boolean(player.currentTrack && player.queue.tracks[0] === player.currentTrack);
    const upcomingCount = isCurrentInTracks ? Math.max(0, player.queue.tracks.length - 1) : (player.queue.tracks?.length || 0);

    if (upcomingCount < 2) {
      return context.replyError('Need at least 2 upcoming tracks in the queue to shuffle.');
    }

    player.queue.shuffle();
    await musicManager.updatePlayerMessage(player);
    return context.replySuccess(`Shuffled **${upcomingCount} tracks** in the queue.`);
  }
};
