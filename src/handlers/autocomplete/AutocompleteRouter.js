const playlistRepo = require('../../database/repositories/PlaylistRepository');
const userRepo = require('../../database/repositories/UserRepository');
const musicManager = require('../../managers/MusicManager');

class AutocompleteRouter {
  async handle(interaction) {
    const commandName = interaction.commandName;
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = (focusedOption.value || '').toLowerCase();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    let choices = [];

    // 1. Playlists Autocomplete
    if (commandName === 'playlist') {
      if (focusedOption.name === 'name') {
        const userPlaylists = playlistRepo.getUserPlaylists(userId);
        choices = userPlaylists
          .filter(p => p.name.toLowerCase().includes(focusedValue))
          .slice(0, 25)
          .map(p => ({
            name: `${p.name} (${p.track_count || 0} tracks)`,
            value: p.name
          }));
      }
    }

    // 2. Play / Search Autocomplete
    else if (commandName === 'play' || commandName === 'search') {
      if (focusedOption.name === 'query') {
        if (!focusedValue) {
          // Suggest user's top favorites or recent history
          const favs = userRepo.getFavorites(userId).slice(0, 5);
          choices = favs.map(f => ({
            name: `Favorite: ${f.title.substring(0, 50)} - ${f.author.substring(0, 30)}`,
            value: f.uri || f.title
          }));
        } else {
          try {
            const searchRes = await musicManager.search(focusedValue, interaction.user);
            if (searchRes && searchRes.tracks) {
              choices = searchRes.tracks.slice(0, 8).map(t => {
                const title = (t.title || t.info?.title || 'Unknown').substring(0, 60);
                const author = (t.author || t.info?.author || 'Unknown').substring(0, 30);
                return {
                  name: `${title} - ${author}`,
                  value: t.uri || title
                };
              });
            }
          } catch (e) {}
        }
      }
    }

    // 3. Filters Autocomplete
    else if (commandName === 'filters') {
      if (focusedOption.name === 'preset') {
        const presets = [
          { name: 'Default / Reset Filters', value: 'none' },
          { name: 'Bass Boost (Deep Low-End EQ)', value: 'bassboost' },
          { name: 'Nightcore (Accelerated Pitch & Tempo)', value: 'nightcore' },
          { name: 'Vaporwave (Slow & Deep Pitch)', value: 'vaporwave' },
          { name: '8D Spatial Audio (360-Degree Rotation)', value: '8d' },
          { name: 'Karaoke (Vocal Suppression)', value: 'karaoke' },
          { name: 'Timescale (Tempo & Pitch Scaling)', value: 'timescale' }
        ];
        choices = presets.filter(p => p.name.toLowerCase().includes(focusedValue) || p.value.toLowerCase().includes(focusedValue));
      }
    }

    // 4. Queue Jump Autocomplete
    else if (commandName === 'queue') {
      const player = musicManager.getPlayer(guildId);
      if (player && player.queue?.tracksList) {
        choices = player.queue.tracksList
          .slice(0, 20)
          .map((t, idx) => {
            const title = (t.title || t.info?.title || 'Unknown').substring(0, 70);
            return {
              name: `#${idx + 1} - ${title}`,
              value: idx + 1
            };
          })
          .filter(c => String(c.name).toLowerCase().includes(focusedValue) || String(c.value).includes(focusedValue));
      }
    }

    await interaction.respond(choices.slice(0, 25));
  }
}

module.exports = new AutocompleteRouter();
