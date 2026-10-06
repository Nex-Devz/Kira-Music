const guildRepo = require('../../database/repositories/GuildRepository');
const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');
const { DEFAULT_CONFIG } = require('../../config/constants');

class SettingsButtonHandler {
  async handle(interaction, action, param1) {
    const guildId = interaction.guildId;

    // Every settings action is destructive/admin-level — verify server-side.
    if (!permissionManager.isAdmin(interaction.member)) {
      return interaction.reply(uiTemplates.buildErrorMessage('Only administrators can change server settings.'));
    }

    const dashboard = () => uiTemplates.buildSettingsDashboard(guildRepo.get(guildId));

    switch (action) {
      case 'view':
        // Setup wizard's "View Settings" button — surface the dashboard.
        await interaction.update(dashboard());
        break;

      case 'channel': {
        if (param1 === 'current') {
          guildRepo.update(guildId, { music_channel_id: interaction.channelId, player_channel_id: interaction.channelId });
        } else {
          guildRepo.update(guildId, { music_channel_id: null, player_channel_id: null });
        }
        await interaction.update(dashboard());
        break;
      }

      case 'dj': {
        if (param1 === 'create') {
          try {
            const role = await interaction.guild.roles.create({
              name: 'DJ',
              color: 0x5865f2,
              reason: 'Kira Music Bot DJ Role'
            });
            guildRepo.update(guildId, { dj_role_id: role.id });
          } catch (e) {
            return interaction.reply(
              uiTemplates.buildErrorMessage('Could not create the DJ role. Check my role permissions and try again.')
            );
          }
        } else {
          guildRepo.update(guildId, { dj_role_id: null });
        }
        await interaction.update(dashboard());
        break;
      }

      case 'reset': {
        if (param1 === 'confirm') {
          guildRepo.update(guildId, {
            prefix: DEFAULT_CONFIG.PREFIX,
            dj_role_id: null,
            music_channel_id: null,
            player_channel_id: null,
            default_volume: DEFAULT_CONFIG.DEFAULT_VOLUME,
            loop_mode: DEFAULT_CONFIG.DEFAULT_LOOP,
            autoplay: DEFAULT_CONFIG.DEFAULT_AUTOPLAY ? 1 : 0,
            mode_247: DEFAULT_CONFIG.DEFAULT_247 ? 1 : 0
          });
          await interaction.update(dashboard());
        } else {
          await interaction.update(dashboard());
        }
        break;
      }

      default:
        await interaction.deferUpdate();
        break;
    }
  }
}

module.exports = new SettingsButtonHandler();
