const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: DjsActionRow } = require('discord.js');
const guildRepo = require('../../database/repositories/GuildRepository');
const premiumManager = require('../../managers/PremiumManager');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  createV2Payload
} = require('../../ui/componentsV2');
const { BUTTON_STYLES } = require('../../config/constants');

class SettingsSelectHandler {
  async handle(interaction, selectedValue) {
    const guildId = interaction.guildId;
    const dashboard = () => uiTemplates.buildSettingsDashboard(guildRepo.get(guildId));

    switch (selectedValue) {
      case 'prefix': {
        const modal = new ModalBuilder()
          .setCustomId('modal:settings:prefix')
          .setTitle('Change Command Prefix')
          .addComponents(
            new DjsActionRow().addComponents(
              new TextInputBuilder()
                .setCustomId('settings_prefix')
                .setLabel('New prefix (1-5 characters)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(5)
                .setMinLength(1)
                .setRequired(true)
            )
          );
        return interaction.showModal(modal);
      }

      case 'volume': {
        const modal = new ModalBuilder()
          .setCustomId('modal:settings:volume')
          .setTitle('Default Player Volume')
          .addComponents(
            new DjsActionRow().addComponents(
              new TextInputBuilder()
                .setCustomId('settings_volume')
                .setLabel('Default volume (0-150)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. 80')
                .setMaxLength(3)
                .setRequired(true)
            )
          );
        return interaction.showModal(modal);
      }

      case 'dj':
        return interaction.update(
          this.buildChoiceView(
            'Configure DJ Role',
            'Pick who can control playback. Admins always retain access.',
            [
              new ButtonBuilder().setCustomId('settings:dj:none').setLabel('Open Access (No DJ Role)').setStyle(BUTTON_STYLES.SECONDARY),
              new ButtonBuilder().setCustomId('settings:dj:create').setLabel('Create & Assign "DJ" Role').setStyle(BUTTON_STYLES.PRIMARY)
            ]
          )
        );

      case 'channels':
        return interaction.update(
          this.buildChoiceView(
            'Command Channels',
            'Limit music commands to one channel, or allow the whole server.',
            [
              new ButtonBuilder().setCustomId('settings:channel:any').setLabel('Allow All Channels').setStyle(BUTTON_STYLES.SECONDARY),
              new ButtonBuilder().setCustomId('settings:channel:current').setLabel('Use This Channel Only').setStyle(BUTTON_STYLES.PRIMARY)
            ]
          )
        );

      case '247': {
        if (!premiumManager.canUse247(guildId, interaction.user.id)) {
          return interaction.reply(
            uiTemplates.buildErrorMessage('24/7 Mode requires a Gold or Diamond Premium tier. Use `/premium` to upgrade.')
          );
        }
        const guildData = guildRepo.get(guildId);
        const next247 = guildData.mode_247 ? 0 : 1;
        guildRepo.update(guildId, { mode_247: next247 });
        // Apply to the live player too, so the setting takes effect now.
        const livePlayer = musicManager.getPlayer(guildId);
        if (livePlayer) {
          livePlayer.is247 = Boolean(next247);
          if (typeof livePlayer.setStayInVc === 'function') {
            livePlayer.setStayInVc(Boolean(next247));
          }
        }
        return interaction.update(dashboard());
      }

      case 'autoplay': {
        if (!premiumManager.canUseAutoplay(guildId, interaction.user.id)) {
          return interaction.reply(
            uiTemplates.buildErrorMessage('Autoplay requires a Silver tier or above. Use `/premium` to view plans.')
          );
        }
        const guildData = guildRepo.get(guildId);
        const nextAutoplay = guildData.autoplay ? 0 : 1;
        guildRepo.update(guildId, { autoplay: nextAutoplay });
        const livePlayer = musicManager.getPlayer(guildId);
        if (livePlayer) {
          musicManager.setAutoplay(guildId, Boolean(nextAutoplay));
        }
        return interaction.update(dashboard());
      }

      case 'reset':
        return interaction.update(
          uiTemplates.buildConfirmMessage(
            'Reset **all** server settings (prefix, DJ role, channels, volume, loop, 24/7, autoplay) to defaults?',
            'settings:reset:confirm',
            'settings:reset:cancel'
          )
        );

      default:
        return interaction.update(dashboard());
    }
  }

  buildChoiceView(title, description, buttons) {
    const container = new ContainerBuilder(null).addComponents(
      new TextDisplayBuilder(`### ${title}\n${description}`),
      new SeparatorBuilder(true, 1),
      new ActionRowBuilder().addComponents(...buttons)
    );
    return createV2Payload(container);
  }
}

module.exports = new SettingsSelectHandler();
