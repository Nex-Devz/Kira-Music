const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const cacheManager = require('../../managers/CacheManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'search',
  description: 'Search for tracks and select from interactive results',
  aliases: ['find'],
  argNames: ['query'],
  voiceRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for tracks and select from interactive results')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song title or artist to search')
        .setRequired(true)
    ),

  async execute(context) {
    const query = context.getString('query');
    if (!query) {
      return context.replyError('Please provide a search term.');
    }

    await context.deferReply();

    try {
      const searchResult = await musicManager.search(query, context.user);
      if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
        return context.replyError(`No results found for "${query}".`);
      }

      // Cache search result for interactive select router
      cacheManager.setTrackInfo('last_search:' + context.userId, searchResult);

      const payload = uiTemplates.buildSearchResultsView(query, searchResult.tracks);
      return context.reply(payload);
    } catch (err) {
      return context.replyError(`Search failed: ${err.message}`);
    }
  }
};
