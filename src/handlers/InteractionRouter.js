const musicManager = require('../managers/MusicManager');
const permissionManager = require('../managers/PermissionManager');
const uiTemplates = require('../ui/templates');
const errorHandler = require('./ErrorHandler');

// Modular Handlers
const playerButtonHandler = require('./buttons/PlayerButtonHandler');
const queueButtonHandler = require('./buttons/QueueButtonHandler');
const lyricsButtonHandler = require('./buttons/LyricsButtonHandler');
const playlistButtonHandler = require('./buttons/PlaylistButtonHandler');
const setupButtonHandler = require('./buttons/SetupButtonHandler');
const premiumButtonHandler = require('./buttons/PremiumButtonHandler');

const filterSelectHandler = require('./selects/FilterSelectHandler');
const searchSelectHandler = require('./selects/SearchSelectHandler');
const playlistSelectHandler = require('./selects/PlaylistSelectHandler');
const helpSelectHandler = require('./selects/HelpSelectHandler');
const settingsSelectHandler = require('./selects/SettingsSelectHandler');

const modalRouter = require('./modals/ModalRouter');
const autocompleteRouter = require('./autocomplete/AutocompleteRouter');

class InteractionRouter {
  /**
   * Route button, select menu, modal, and autocomplete interactions
   */
  async handle(interaction) {
    try {
      if (interaction.isAutocomplete()) {
        await autocompleteRouter.handle(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.handleStringSelect(interaction);
      } else if (interaction.isModalSubmit()) {
        await modalRouter.handle(interaction);
      }
    } catch (err) {
      if (!interaction.isAutocomplete()) {
        await errorHandler.handleInteractionError(err, interaction);
      }
    }
  }

  // --- BUTTON ROUTING ---
  async handleButton(interaction) {
    const customId = interaction.customId;
    const [namespace, action, param1, param2] = customId.split(':');
    const guildId = interaction.guildId;
    const player = musicManager.getPlayer(guildId);

    // Playback Permissions Check
    const playbackActions = ['pause', 'resume', 'skip', 'previous', 'stop', 'vol', 'seek', 'loop', 'autoplay', 'shuffle'];
    if (namespace === 'player' && playbackActions.includes(action)) {
      if (!permissionManager.canControlPlayback(interaction.member, player)) {
        return interaction.reply(uiTemplates.buildErrorMessage('You do not have permission to control playback.'));
      }
    }

    switch (namespace) {
      case 'player':
        await playerButtonHandler.handle(interaction, action, param1, param2, player);
        break;

      case 'queue':
        await queueButtonHandler.handle(interaction, action, param1, player);
        break;

      case 'lyrics':
        await lyricsButtonHandler.handle(interaction, action, param1, player);
        break;

      case 'playlist':
        await playlistButtonHandler.handle(interaction, action, param1);
        break;

      case 'setup':
        await setupButtonHandler.handle(interaction, action, param1);
        break;

      case 'premium':
        await premiumButtonHandler.handle(interaction, action);
        break;

      case 'search':
        if (action === 'cancel') {
          await interaction.update(uiTemplates.buildSuccessMessage('Search cancelled.'));
        }
        break;

      default:
        await interaction.reply(uiTemplates.buildErrorMessage('Unknown button action.'));
        break;
    }
  }

  // --- STRING SELECT ROUTING ---
  async handleStringSelect(interaction) {
    const customId = interaction.customId;
    const selectedValue = interaction.values[0];

    switch (customId) {
      case 'filter:select':
        await filterSelectHandler.handle(interaction, selectedValue);
        break;

      case 'search:select':
        await searchSelectHandler.handle(interaction, selectedValue);
        break;

      case 'playlist:select':
        await playlistSelectHandler.handle(interaction, selectedValue);
        break;

      case 'help:category':
        await helpSelectHandler.handle(interaction, selectedValue);
        break;

      case 'settings:category':
        await settingsSelectHandler.handle(interaction, selectedValue);
        break;

      default:
        await interaction.reply(uiTemplates.buildErrorMessage('Unknown select option.'));
        break;
    }
  }
}

module.exports = new InteractionRouter();
