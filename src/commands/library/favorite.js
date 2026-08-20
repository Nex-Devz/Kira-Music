const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const userRepo = require('../../database/repositories/UserRepository');

module.exports = {
  name: 'favorite',
  description: 'Add or remove the current playing track to your personal favorites',
  aliases: ['fav'],
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Add or remove current playing track to your favorites'),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    const curTrack = player.currentTrack;

    if (!curTrack) {
      return context.replyError('No track currently playing.');
    }

    const isFav = userRepo.isFavorite(context.userId, curTrack.uri);
    if (isFav) {
      userRepo.removeFavorite(context.userId, curTrack.uri);
      return context.replySuccess(`Removed **${curTrack.title}** from your favorites.`);
    } else {
      userRepo.addFavorite(context.userId, {
        title: curTrack.title || curTrack.info?.title,
        author: curTrack.author || curTrack.info?.author,
        uri: curTrack.uri || curTrack.info?.uri,
        duration: curTrack.duration || curTrack.info?.duration
      });
      return context.replySuccess(`Added **${curTrack.title}** to your favorites!`);
    }
  }
};
