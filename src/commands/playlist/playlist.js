const { SlashCommandBuilder } = require('discord.js');
const playlistRepo = require('../../database/repositories/PlaylistRepository');
const premiumManager = require('../../managers/PremiumManager');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'playlist',
  description: 'Create, manage, and play your custom playlists',
  aliases: ['pl'],
  argNames: ['subcommand', 'name', 'query'],
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Create, manage, and play custom playlists')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Optional description'))
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name to delete').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a song to a playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        .addStringOption(opt => opt.setName('query').setDescription('Song title or URL').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a song from a playlist by position')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        .addIntegerOption(opt => opt.setName('position').setDescription('Track position number').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub
        .setName('play')
        .setDescription('Play an entire playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name to play').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all your playlists')
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View tracks in a playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('import')
        .setDescription('Import a playlist from a YouTube or Spotify URL')
        .addStringOption(opt => opt.setName('name').setDescription('New playlist name').setRequired(true))
        .addStringOption(opt => opt.setName('url').setDescription('External playlist URL').setRequired(true))
    ),

  async execute(context) {
    let subcommand = 'list';
    if (context.isInteraction) {
      subcommand = context.source.options.getSubcommand(false) || 'list';
    } else {
      const sub = context.getString('subcommand');
      if (sub && ['create', 'delete', 'add', 'remove', 'play', 'list', 'view', 'import'].includes(sub.toLowerCase())) {
        subcommand = sub.toLowerCase();
      }
    }

    const userId = context.userId;
    const guildId = context.guildId;

    switch (subcommand) {
      case 'create': {
        const name = context.getString('name');
        const desc = context.getString('description') || '';
        const maxPlaylists = premiumManager.getMaxPlaylists(userId);
        const existingLists = playlistRepo.getUserPlaylists(userId);

        if (existingLists.length >= maxPlaylists) {
          return context.replyError(`You have reached the maximum playlist limit (**${maxPlaylists}**). Upgrade to Premium for higher limits.`);
        }

        try {
          const created = playlistRepo.create(userId, guildId, name, desc);
          return context.replySuccess(`Playlist **${created.name}** created successfully.`);
        } catch (err) {
          return context.replyError(err.message);
        }
      }

      case 'delete': {
        const name = context.getString('name');
        const pl = playlistRepo.getByName(userId, name);
        if (!pl) return context.replyError(`Playlist "${name}" not found.`);
        playlistRepo.delete(pl.id, userId);
        return context.replySuccess(`Deleted playlist **${pl.name}**.`);
      }

      case 'add': {
        const name = context.getString('name');
        const query = context.getString('query');
        const pl = playlistRepo.getByName(userId, name);
        if (!pl) return context.replyError(`Playlist "${name}" not found.`);

        const maxTracks = premiumManager.getMaxTracksPerPlaylist(userId);
        if ((pl.tracks?.length || 0) >= maxTracks) {
          return context.replyError(`This playlist has reached the max capacity of **${maxTracks} tracks**.`);
        }

        await context.deferReply();
        const searchRes = await musicManager.search(query, context.user);
        if (!searchRes || !searchRes.tracks?.length) {
          return context.replyError(`No results found for "${query}".`);
        }

        const track = searchRes.tracks[0];
        playlistRepo.addTrack(pl.id, {
          title: track.title || track.info?.title,
          author: track.author || track.info?.author,
          uri: track.uri || track.info?.uri,
          duration: track.duration || track.info?.duration
        });

        return context.replySuccess(`Added **${track.title}** to playlist **${pl.name}**.`);
      }

      case 'remove': {
        const name = context.getString('name');
        const pos = context.getInteger('position');
        const pl = playlistRepo.getByName(userId, name);
        if (!pl) return context.replyError(`Playlist "${name}" not found.`);
        if (!pos || pos < 1 || pos > (pl.tracks?.length || 0)) {
          return context.replyError(`Invalid position. Valid range: 1 to ${pl.tracks?.length || 0}.`);
        }
        playlistRepo.removeTrack(pl.id, pos);
        return context.replySuccess(`Removed track #${pos} from playlist **${pl.name}**.`);
      }

      case 'play': {
        const name = context.getString('name');
        const pl = playlistRepo.getByName(userId, name);
        if (!pl || !pl.tracks?.length) {
          return context.replyError(`Playlist "${name}" is empty or does not exist.`);
        }
        const voiceChannel = context.voiceChannel;
        if (!voiceChannel) {
          return context.replyError('You must be in a voice channel to play this playlist.');
        }

        await context.deferReply();
        await musicManager.play(guildId, voiceChannel.id, context.channel.id, pl.tracks, context.user);
        return context.replySuccess(`Loaded **${pl.tracks.length} tracks** from **${pl.name}** into the queue.`);
      }

      case 'list': {
        const playlists = playlistRepo.getUserPlaylists(userId);
        return context.reply(uiTemplates.buildPlaylistListView(playlists));
      }

      case 'view': {
        const name = context.getString('name');
        const pl = playlistRepo.getByName(userId, name);
        if (!pl) return context.replyError(`Playlist "${name}" not found.`);
        return context.reply(uiTemplates.buildPlaylistDetailsView(pl));
      }

      case 'import': {
        const name = context.getString('name');
        const url = context.getString('url');
        await context.deferReply();

        const searchRes = await musicManager.search(url, context.user);
        if (!searchRes || !searchRes.tracks?.length) {
          return context.replyError('Could not find tracks at the provided URL.');
        }

        const created = playlistRepo.create(userId, guildId, name, `Imported from ${url}`);
        const tracksToImport = searchRes.tracks.slice(0, premiumManager.getMaxTracksPerPlaylist(userId));
        for (const t of tracksToImport) {
          playlistRepo.addTrack(created.id, {
            title: t.title || t.info?.title,
            author: t.author || t.info?.author,
            uri: t.uri || t.info?.uri,
            duration: t.duration || t.info?.duration
          });
        }

        return context.replySuccess(`Imported **${tracksToImport.length} tracks** into new playlist **${created.name}**.`);
      }
    }
  }
};
