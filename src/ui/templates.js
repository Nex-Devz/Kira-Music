const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectBuilder,
  createV2Payload
} = require('./componentsV2');
const { BUTTON_STYLES } = require('../config/constants');
const playerCanvas = require('../canvas/PlayerCanvas');
const profileCanvas = require('../canvas/ProfileCanvas');

class UITemplates {
  formatDuration(ms) {
    if (!ms || isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  // --- PLAYER VIEW ---
  async buildPlayerView(player, options = {}) {
    const current = player.currentTrack || player.queue?.current || null;
    if (!current) {
      return this.buildEmptyPlayerView();
    }

    const title = current.title || current.info?.title || 'Unknown Track';
    const author = current.author || current.info?.author || 'Unknown Artist';
    const duration = current.duration || current.info?.duration || current.length || 0;
    const position = player.position || 0;
    const artworkUrl = current.artworkUrl || current.info?.artworkUrl || current.thumbnail || null;
    const requester = current.requester?.username || current.requesterTag || 'User';
    const paused = Boolean(player.paused);
    const loop = player.loop || player.queue?.repeatMode || 'off';
    const autoplay = Boolean(player.autoplay || player.isAutoplayEnabled?.());
    const filters = player.activeFilters || [];

    const canvasBuffer = await playerCanvas.render({
      title,
      author,
      duration,
      position,
      artworkUrl,
      requester,
      paused,
      loop,
      autoplay,
      filters
    });

    const queueSize = player.queue?.tracksList?.length || player.queue?.size || 0;
    const volume = player.volume || 80;

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `**${title}**\n${author} • Volume: \`${volume}%\` • Queue: \`${queueSize} tracks\``
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player:previous')
            .setLabel('Previous')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId(paused ? 'player:resume' : 'player:pause')
            .setLabel(paused ? 'Resume' : 'Pause')
            .setStyle(paused ? BUTTON_STYLES.SUCCESS : BUTTON_STYLES.PRIMARY),
          new ButtonBuilder()
            .setCustomId('player:skip')
            .setLabel('Skip')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:stop')
            .setLabel('Stop')
            .setStyle(BUTTON_STYLES.DANGER)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player:queue')
            .setLabel('Queue')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:lyrics')
            .setLabel('Lyrics')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:favorite')
            .setLabel('Favorite')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:more')
            .setLabel('Audio Controls')
            .setStyle(BUTTON_STYLES.SECONDARY)
        )
      );

    return createV2Payload(container, {
      files: [{ attachment: canvasBuffer, name: 'player.png' }],
      ephemeral: options.ephemeral
    });
  }

  buildEmptyPlayerView() {
    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Player Idle\nNo tracks currently in playback queue. Use \`/play <query>\` to start streaming.`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player:help')
            .setLabel('Command Browser')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:favorites')
            .setLabel('My Favorites')
            .setStyle(BUTTON_STYLES.SECONDARY)
        )
      );
    return createV2Payload(container);
  }

  // --- MORE CONTROLS MODAL/PANEL ---
  buildMoreControlsView(player) {
    const loop = player.loop || player.queue?.repeatMode || 'off';
    const autoplay = Boolean(player.autoplay || player.isAutoplayEnabled?.());

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(`### Playback Controls & Audio Tuning`),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`player:loop:${loop === 'off' ? 'track' : loop === 'track' ? 'queue' : 'off'}`)
            .setLabel(`Loop: ${loop.toUpperCase()}`)
            .setStyle(loop !== 'off' ? BUTTON_STYLES.PRIMARY : BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId(`player:autoplay:${!autoplay}`)
            .setLabel(`Autoplay: ${autoplay ? 'ON' : 'OFF'}`)
            .setStyle(autoplay ? BUTTON_STYLES.PRIMARY : BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:shuffle')
            .setLabel('Shuffle Queue')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:247:toggle')
            .setLabel('24/7 Mode')
            .setStyle(BUTTON_STYLES.SECONDARY)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player:vol:down')
            .setLabel('Vol -10%')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:vol:up')
            .setLabel('Vol +10%')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:seek:back')
            .setLabel('-10s')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('player:seek:fwd')
            .setLabel('+10s')
            .setStyle(BUTTON_STYLES.SECONDARY)
        ),
        new ActionRowBuilder().addComponents(
          new StringSelectBuilder()
            .setCustomId('filter:select')
            .setPlaceholder('Select an Audio Filter Preset')
            .addOption('Default / Flat EQ', 'none', 'Reset audio filters to default')
            .addOption('Bass Boost', 'bassboost', 'Enhance low frequencies')
            .addOption('Nightcore', 'nightcore', 'Speed up and pitch up audio')
            .addOption('Vaporwave', 'vaporwave', 'Slow down and deepen audio')
            .addOption('8D Spatial Audio', '8d', 'Rotating 360-degree spatial effect')
            .addOption('Karaoke', 'karaoke', 'Attenuate vocal frequencies')
            .addOption('Timescale', 'timescale', 'Fine tempo and pitch tuning')
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player:refresh')
            .setLabel('Back to Player')
            .setStyle(BUTTON_STYLES.PRIMARY)
        )
      );

    return createV2Payload(container, { ephemeral: true });
  }

  // --- QUEUE VIEW ---
  buildQueueView(player, page = 1, pageSize = 10) {
    const queueList = player.queue?.tracksList || [];
    const current = player.currentTrack || player.queue?.current || null;
    const totalTracks = queueList.length;
    const totalPages = Math.max(1, Math.ceil(totalTracks / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const pageTracks = queueList.slice(startIndex, startIndex + pageSize);

    let totalDurationMs = (current?.duration || current?.length || 0);
    queueList.forEach(t => { totalDurationMs += (t.duration || t.length || 0); });

    let currentSection = 'No track playing';
    if (current) {
      const cTitle = current.title || current.info?.title || 'Unknown';
      const cAuthor = current.author || current.info?.author || 'Unknown';
      const cDur = this.formatDuration(current.duration || current.length || 0);
      currentSection = `**Now Playing:**\n${cTitle} - ${cAuthor} \`[${cDur}]\``;
    }

    let queueSection = 'Queue is empty. Add more tracks with `/play`.';
    if (pageTracks.length > 0) {
      queueSection = pageTracks.map((t, idx) => {
        const num = startIndex + idx + 1;
        const tTitle = t.title || t.info?.title || 'Unknown';
        const tAuthor = t.author || t.info?.author || 'Unknown';
        const tDur = this.formatDuration(t.duration || t.length || 0);
        return `\`${String(num).padStart(2, '0')}.\` **${tTitle}** - ${tAuthor} \`[${tDur}]\``;
      }).join('\n');
    }

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Server Playback Queue (Page ${currentPage}/${totalPages})\nTotal: **${totalTracks} tracks** • Duration: **${this.formatDuration(totalDurationMs)}**\n\n${currentSection}`
        ),
        new SeparatorBuilder(true, 1),
        new TextDisplayBuilder(queueSection),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`queue:page:1`)
            .setLabel('First')
            .setStyle(BUTTON_STYLES.SECONDARY)
            .setDisabled(currentPage === 1),
          new ButtonBuilder()
            .setCustomId(`queue:page:${currentPage - 1}`)
            .setLabel('Prev')
            .setStyle(BUTTON_STYLES.SECONDARY)
            .setDisabled(currentPage <= 1),
          new ButtonBuilder()
            .setCustomId(`queue:page:${currentPage + 1}`)
            .setLabel('Next')
            .setStyle(BUTTON_STYLES.SECONDARY)
            .setDisabled(currentPage >= totalPages),
          new ButtonBuilder()
            .setCustomId(`queue:page:${totalPages}`)
            .setLabel('Last')
            .setStyle(BUTTON_STYLES.SECONDARY)
            .setDisabled(currentPage === totalPages)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('player:shuffle')
            .setLabel('Shuffle')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('queue:clear')
            .setLabel('Clear Queue')
            .setStyle(BUTTON_STYLES.DANGER),
          new ButtonBuilder()
            .setCustomId('player:refresh')
            .setLabel('Back to Player')
            .setStyle(BUTTON_STYLES.PRIMARY)
        )
      );

    return createV2Payload(container);
  }

  // --- SEARCH RESULTS ---
  buildSearchResultsView(query, tracks) {
    const select = new StringSelectBuilder()
      .setCustomId('search:select')
      .setPlaceholder('Select a track to play');

    const topTracks = tracks.slice(0, 10);
    topTracks.forEach((t, i) => {
      const title = (t.title || t.info?.title || 'Unknown').substring(0, 70);
      const author = (t.author || t.info?.author || 'Unknown').substring(0, 40);
      const dur = this.formatDuration(t.duration || t.length || 0);
      select.addOption(`${i + 1}. ${title}`, String(i), `${author} • ${dur}`);
    });

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Search Results\nQuery: **"${query}"**\nSelect a track below to add it to playback.`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('search:cancel')
            .setLabel('Cancel')
            .setStyle(BUTTON_STYLES.SECONDARY)
        )
      );

    return createV2Payload(container);
  }

  // --- LYRICS VIEW ---
  buildLyricsView(title, author, lyricsText, page = 1) {
    const lines = lyricsText.split('\n');
    const linesPerPage = 25;
    const totalPages = Math.max(1, Math.ceil(lines.length / linesPerPage));
    const currentPage = Math.min(Math.max(1, page), totalPages);

    const start = (currentPage - 1) * linesPerPage;
    const pageLines = lines.slice(start, start + linesPerPage).join('\n');

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Lyrics: ${title}\n**Artist:** ${author} • Page **${currentPage}/${totalPages}**`
        ),
        new SeparatorBuilder(true, 1),
        new TextDisplayBuilder(pageLines || 'No lyrics available for this song.'),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`lyrics:page:${currentPage - 1}`)
            .setLabel('Previous')
            .setStyle(BUTTON_STYLES.SECONDARY)
            .setDisabled(currentPage <= 1),
          new ButtonBuilder()
            .setCustomId(`lyrics:page:${currentPage + 1}`)
            .setLabel('Next')
            .setStyle(BUTTON_STYLES.SECONDARY)
            .setDisabled(currentPage >= totalPages),
          new ButtonBuilder()
            .setCustomId('player:refresh')
            .setLabel('Back to Player')
            .setStyle(BUTTON_STYLES.PRIMARY)
        )
      );

    return createV2Payload(container);
  }

  // --- PLAYLIST VIEW ---
  buildPlaylistListView(playlists) {
    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(`### Saved Playlists\nManage and play your custom collections.`),
        new SeparatorBuilder(true, 1)
      );

    if (playlists.length === 0) {
      container.addComponents(
        new TextDisplayBuilder(`You have no playlists yet. Create one with \`/playlist create <name>\`.`)
      );
    } else {
      const select = new StringSelectBuilder()
        .setCustomId('playlist:select')
        .setPlaceholder('Select a playlist to view or load');

      const descList = playlists.slice(0, 10).map((p, idx) => {
        select.addOption(`${p.name}`, p.id, `${p.track_count || 0} tracks`);
        return `\`${idx + 1}.\` **${p.name}** — ${p.track_count || 0} tracks`;
      }).join('\n');

      container.addComponents(
        new TextDisplayBuilder(descList),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(select)
      );
    }

    container.addComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('playlist:create:btn')
          .setLabel('Create New Playlist')
          .setStyle(BUTTON_STYLES.PRIMARY)
      )
    );

    return createV2Payload(container);
  }

  buildPlaylistDetailsView(playlist) {
    const tracks = playlist.tracks || [];
    const tracksList = tracks.length > 0
      ? tracks.slice(0, 15).map((t, i) => `\`${i + 1}.\` **${t.title}** - ${t.author} \`[${this.formatDuration(t.duration)}]\``).join('\n')
      : 'This playlist has no tracks yet.';

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Playlist: ${playlist.name}\n${playlist.description || 'No description'} • **${tracks.length} tracks**`
        ),
        new SeparatorBuilder(true, 1),
        new TextDisplayBuilder(tracksList),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`playlist:play:${playlist.id}`)
            .setLabel('Play All')
            .setStyle(BUTTON_STYLES.SUCCESS)
            .setDisabled(tracks.length === 0),
          new ButtonBuilder()
            .setCustomId(`playlist:delete:${playlist.id}`)
            .setLabel('Delete Playlist')
            .setStyle(BUTTON_STYLES.DANGER),
          new ButtonBuilder()
            .setCustomId('playlist:list')
            .setLabel('Back to List')
            .setStyle(BUTTON_STYLES.SECONDARY)
        )
      );

    return createV2Payload(container);
  }

  // --- SETTINGS DASHBOARD ---
  buildSettingsDashboard(guildData) {
    const prefix = guildData.prefix || '!';
    const djRole = guildData.dj_role_id ? `<@&${guildData.dj_role_id}>` : 'Disabled (Open Access)';
    const musicChannel = guildData.music_channel_id ? `<#${guildData.music_channel_id}>` : 'All Channels';
    const playerChannel = guildData.player_channel_id ? `<#${guildData.player_channel_id}>` : 'Dynamic';
    const defaultVol = guildData.default_volume || 80;
    const mode247 = guildData.mode_247 ? 'Enabled' : 'Disabled';
    const autoplay = guildData.autoplay ? 'Enabled' : 'Disabled';
    const loopMode = (guildData.loop_mode || 'off').toUpperCase();

    const info = [
      `• **Prefix:** \`${prefix}\``,
      `• **DJ Role:** ${djRole}`,
      `• **Music Channel:** ${musicChannel}`,
      `• **Persistent Player Channel:** ${playerChannel}`,
      `• **Default Volume:** \`${defaultVol}%\``,
      `• **Default Loop:** \`${loopMode}\``,
      `• **24/7 Mode:** \`${mode247}\``,
      `• **Autoplay:** \`${autoplay}\``
    ].join('\n');

    const select = new StringSelectBuilder()
      .setCustomId('settings:category')
      .setPlaceholder('Configure Server Setting')
      .addOption('Prefix', 'prefix', 'Change bot command prefix')
      .addOption('DJ Role', 'dj', 'Set DJ role for playback controls')
      .addOption('Channels', 'channels', 'Lock music commands to specific channels')
      .addOption('Default Volume', 'volume', 'Set default volume on connect')
      .addOption('24/7 Voice Mode', '247', 'Toggle persistent 24/7 voice connection')
      .addOption('Autoplay', 'autoplay', 'Toggle automatic related tracks')
      .addOption('Reset Defaults', 'reset', 'Reset all guild settings to default');

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Server Settings Dashboard\nConfigure server playback, permissions, and channel rules.\n\n${info}`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(select)
      );

    return createV2Payload(container);
  }

  // --- SETUP WIZARD ---
  buildSetupWizard(step = 1, data = {}) {
    const container = new ContainerBuilder(null);

    if (step === 1) {
      container.addComponents(
        new TextDisplayBuilder(
          `### Interactive Setup: Step 1 of 3\nConfigure a dedicated music command channel or permit bot commands server-wide.`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('setup:channel:any')
            .setLabel('Allow All Channels')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('setup:channel:current')
            .setLabel('Set Current Channel')
            .setStyle(BUTTON_STYLES.PRIMARY)
        )
      );
    } else if (step === 2) {
      container.addComponents(
        new TextDisplayBuilder(
          `### Interactive Setup: Step 2 of 3\nConfigure DJ Role permissions. If disabled, all voice members can control playback.`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('setup:dj:none')
            .setLabel('Open Access (No DJ Role)')
            .setStyle(BUTTON_STYLES.SECONDARY),
          new ButtonBuilder()
            .setCustomId('setup:dj:create')
            .setLabel('Create & Assign "DJ" Role')
            .setStyle(BUTTON_STYLES.PRIMARY)
        )
      );
    } else if (step === 3) {
      container.addComponents(
        new TextDisplayBuilder(
          `### Setup Completed\nServer configuration is initialized. Use \`/play\` or adjust settings at any time with \`/settings\`.`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('settings:view')
            .setLabel('View Settings')
            .setStyle(BUTTON_STYLES.PRIMARY)
        )
      );
    }

    return createV2Payload(container);
  }

  // --- PREMIUM DASHBOARD ---
  buildPremiumDashboard(tier, userEntitlement, guildEntitlement) {
    const perks = [
      `• **No-Prefix Commands:** ${tier.noPrefix ? 'Unlocked' : 'Locked'}`,
      `• **24/7 Voice Channel Mode:** ${tier.mode247 ? 'Unlocked' : 'Locked'}`,
      `• **Autoplay Engine:** ${tier.autoplay ? 'Unlocked' : 'Locked'}`,
      `• **Max Queue Size:** \`${tier.maxQueueSize} tracks\``,
      `• **Max Playlists:** \`${tier.maxPlaylists} lists\``,
      `• **Audio Filter Presets:** \`${tier.filters.join(', ')}\``,
      `• **Priority Audio Nodes:** ${tier.priorityNodes ? 'Active' : 'Standard'}`
    ].join('\n');

    let statusText = `Active Plan: **${tier.name}**`;
    if (userEntitlement?.expires_at) {
      const expDate = new Date(userEntitlement.expires_at).toLocaleDateString();
      statusText += ` (Expires: ${expDate})`;
    } else if (guildEntitlement?.expires_at) {
      const expDate = new Date(guildEntitlement.expires_at).toLocaleDateString();
      statusText += ` (Server Plan Expires: ${expDate})`;
    }

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Premium Tier Dashboard\n${statusText}\n\n**Feature Entitlements:**\n${perks}`
        ),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setUrl('https://patreon.com/example')
            .setLabel('Upgrade Plan')
            .setStyle(BUTTON_STYLES.LINK),
          new ButtonBuilder()
            .setCustomId('premium:perks')
            .setLabel('View All Perks')
            .setStyle(BUTTON_STYLES.SECONDARY)
        )
      );

    return createV2Payload(container);
  }

  // --- HELP COMMAND ---
  buildHelpMenu(category = 'music', isDev = false) {
    const categories = {
      music: {
        title: 'Music & Playback Commands',
        commands: [
          '`/play <query>` - Play or queue a song / playlist from URL or name',
          '`/search <query>` - Search and select from top results',
          '`/pause` - Pause audio playback',
          '`/resume` - Resume paused audio',
          '`/skip` - Skip current playing track',
          '`/previous` - Play previously played track',
          '`/stop` - Stop playback and clear queue',
          '`/restart` - Restart current track from beginning',
          '`/seek <time>` - Seek to specified timestamp (e.g. 1m30s)',
          '`/forward <sec>` - Seek forward by seconds',
          '`/rewind <sec>` - Seek backward by seconds',
          '`/volume <0-150>` - Set playback volume',
          '`/nowplaying` - Display current track player card',
          '`/loop <off|track|queue>` - Configure repeat mode',
          '`/shuffle` - Shuffle tracks in queue',
          '`/autoplay` - Toggle automatic playback of related songs',
          '`/247` - Toggle 24/7 voice channel stay'
        ]
      },
      queue: {
        title: 'Queue & Audio Management',
        commands: [
          '`/queue` - Display paginated queue view',
          '`/queue add <query>` - Add track to queue',
          '`/queue remove <pos>` - Remove track at position',
          '`/queue move <from> <to>` - Move track to new position',
          '`/queue clear` - Remove all tracks from queue',
          '`/queue shuffle` - Shuffle the entire queue',
          '`/queue jump <pos>` - Jump directly to queue position',
          '`/filters` - Audio filter tuning panel',
          '`/lyrics` - View lyrics for current or specified song',
          '`/recommend` - Discover recommended tracks based on queue'
        ]
      },
      library: {
        title: 'Personal Music Library & Playlists',
        commands: [
          '`/favorite` - Add current track to your favorites',
          '`/favorites` - View and play your favorited songs',
          '`/history` - View your recent listening history',
          '`/profile` - View your listening profile & analytics card',
          '`/playlist create <name>` - Create a new playlist',
          '`/playlist delete <name>` - Delete a playlist',
          '`/playlist add <name> <track>` - Add track to playlist',
          '`/playlist remove <name> <pos>` - Remove track from playlist',
          '`/playlist play <name>` - Play an entire custom playlist',
          '`/playlist list` - View your saved playlists',
          '`/playlist view <name>` - View tracks inside a playlist',
          '`/playlist import <url>` - Import playlist from external URL'
        ]
      },
      settings: {
        title: 'Server Settings & Configuration',
        commands: [
          '`/settings` - Interactive server settings dashboard',
          '`/setup` - First-time server setup wizard',
          '`/prefix <new_prefix>` - Change guild prefix',
          '`/dj <role>` - Configure DJ role for controls',
          '`/player` - Configure persistent player channel',
          '`/permissions` - View / manage music command permissions'
        ]
      },
      premium: {
        title: 'Premium & Utility Commands',
        commands: [
          '`/premium` - View active premium plan & entitlements',
          '`/stats` - Server and global listening statistics',
          '`/ping` - Check Discord API & Lavalink latency',
          '`/botinfo` - View bot version, memory, and uptime',
          '`/invite` - Get bot invite URL',
          '`/support` - Join support community server'
        ]
      }
    };

    if (isDev) {
      categories.dev = {
        title: 'Developer / Owner Commands',
        commands: [
          '`/dev nodes` - Lavalink node statistics and controls',
          '`/dev guild <id>` - Inspect guild data and player state',
          '`/dev player <id>` - Manage player instance',
          '`/dev premium <grant|revoke>` - Manage premium entitlements',
          '`/dev cache` - Inspect and flush memory caches',
          '`/dev reload` - Reload command registry and modules',
          '`/dev sync` - Force sync application slash commands',
          '`/dev maintenance` - Toggle maintenance mode',
          '`/dev blacklist <add|remove>` - Block malicious users/guilds'
        ]
      };
    }

    const currentCat = categories[category] || categories.music;

    const select = new StringSelectBuilder()
      .setCustomId('help:category')
      .setPlaceholder('Choose a Command Category')
      .addOption('Music & Playback', 'music', 'Play, pause, skip, seek, and loop')
      .addOption('Queue & Audio', 'queue', 'Queue management, filters, and lyrics')
      .addOption('Library & Playlists', 'library', 'Favorites, history, and playlists')
      .addOption('Server Settings', 'settings', 'Prefix, DJ role, and channel rules')
      .addOption('Premium & Utility', 'premium', 'Perks, stats, ping, and info');

    if (isDev) {
      select.addOption('Developer Commands', 'dev', 'Owner maintenance and node tools');
    }

    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(`### ${currentCat.title}\n\n${currentCat.commands.join('\n')}`),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(select)
      );

    return createV2Payload(container);
  }

  // --- PROFILE VIEW ---
  async buildProfileView(userData, userObj) {
    const buffer = await profileCanvas.render(userData, userObj);
    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### ${userObj?.username || 'User'}'s Music Profile\nTotal Tracks: **${userData.totalPlayed || 0}** • Listening Time: **${this.formatDuration(userData.totalDurationMs || 0)}**`
        )
      );

    return createV2Payload(container, {
      files: [{ attachment: buffer, name: 'profile.png' }]
    });
  }

  // --- STATS VIEW ---
  buildStatsView(statsData) {
    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(
          `### Server Music Statistics\n• Total Users: **${statsData.totalUsers || 0}**\n• Total Tracks Streamed: **${statsData.totalTracks || 0}**\n• Total Listening Time: **${this.formatDuration(statsData.totalPlayTimeMs || 0)}**`
        ),
        new SeparatorBuilder(true, 1)
      );

    if (statsData.topUsers?.length > 0) {
      const topList = statsData.topUsers.map((u, i) =>
        `\`${i + 1}.\` <@${u.user_id}> — **${u.tracks_played}** tracks (${this.formatDuration(u.play_time_ms)})`
      ).join('\n');

      container.addComponents(
        new TextDisplayBuilder(`**Top Active Listeners:**\n${topList}`)
      );
    }

    return createV2Payload(container);
  }

  // --- GENERIC MESSAGE TEMPLATES ---
  buildSuccessMessage(text) {
    const container = new ContainerBuilder(null)
      .addComponents(new TextDisplayBuilder(`### Success\n${text}`));
    return createV2Payload(container);
  }

  buildErrorMessage(text) {
    const container = new ContainerBuilder(null)
      .addComponents(new TextDisplayBuilder(`### Error\n${text}`));
    return createV2Payload(container, { ephemeral: true });
  }

  buildLoadingMessage(text = 'Processing request...') {
    const container = new ContainerBuilder(null)
      .addComponents(new TextDisplayBuilder(text));
    return createV2Payload(container);
  }

  buildConfirmMessage(text, confirmCustomId, cancelCustomId = 'generic:cancel') {
    const container = new ContainerBuilder(null)
      .addComponents(
        new TextDisplayBuilder(`### Confirmation\n${text}`),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(confirmCustomId)
            .setLabel('Confirm')
            .setStyle(BUTTON_STYLES.DANGER),
          new ButtonBuilder()
            .setCustomId(cancelCustomId)
            .setLabel('Cancel')
            .setStyle(BUTTON_STYLES.SECONDARY)
        )
      );
    return createV2Payload(container);
  }
}

module.exports = new UITemplates();
