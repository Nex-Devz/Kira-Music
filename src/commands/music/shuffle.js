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
    if (!player.queue || player.queue.tracksList?.length < 2) {
      return context.replyError('Need at least 2 tracks in the queue to shuffle.');
    }

    player.queue.shuffle();
    await musicManager.updatePlayerMessage(player);
    return context.replySuccess(`Shuffled **${player.queue.tracksList.length} tracks** in the queue.`);
  }
};
