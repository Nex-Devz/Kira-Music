/**
 * Application Constants and UI Visual Tokens
 * Minimal, dark, professional, stealth aesthetic with no unnecessary emojis.
 */

module.exports = {
  COLORS: {
    PRIMARY: null,       // Removed accent color for pure stealth dark container UI
    SUCCESS: null,       // Neutralized container color
    WARNING: null,
    DANGER: null,
    NEUTRAL: null,
    DARK_BG: 0x0a0b0e,
    CONTAINER: 0x14151a,
    ACCENT: 0x5865f2,
    PREMIUM: 0xf59e0b,
    MUTED: 0x949ba4
  },

  COMPONENT_TYPES: {
    ACTION_ROW: 1,
    BUTTON: 2,
    STRING_SELECT: 3,
    TEXT_INPUT: 4,
    USER_SELECT: 5,
    ROLE_SELECT: 6,
    MENTIONABLE_SELECT: 7,
    CHANNEL_SELECT: 8,
    SECTION: 9,
    TEXT_DISPLAY: 10,
    THUMBNAIL: 11,
    MEDIA_GALLERY: 12,
    FILE: 13,
    SEPARATOR: 14,
    CONTAINER: 17
  },

  BUTTON_STYLES: {
    PRIMARY: 1,
    SECONDARY: 2,
    SUCCESS: 3,
    DANGER: 4,
    LINK: 5
  },

  MESSAGE_FLAGS: {
    EPHEMERAL: 1 << 6, // 64
    IS_COMPONENTS_V2: 1 << 15 // 32768
  },

  PREMIUM_TIERS: {
    FREE: {
      id: 'free',
      name: 'Free Tier',
      maxQueueSize: 100,
      maxPlaylists: 3,
      maxTracksPerPlaylist: 50,
      noPrefix: false,
      autoplay: false,
      mode247: false,
      filters: ['bassboost', 'nightcore', 'vaporwave'],
      customTheme: false,
      priorityNodes: false
    },
    SILVER: {
      id: 'silver',
      name: 'Silver Tier',
      maxQueueSize: 300,
      maxPlaylists: 10,
      maxTracksPerPlaylist: 150,
      noPrefix: true,
      autoplay: true,
      mode247: false,
      filters: ['bassboost', 'nightcore', 'vaporwave', '8d', 'karaoke'],
      customTheme: false,
      priorityNodes: false
    },
    GOLD: {
      id: 'gold',
      name: 'Gold Tier',
      maxQueueSize: 1000,
      maxPlaylists: 30,
      maxTracksPerPlaylist: 500,
      noPrefix: true,
      autoplay: true,
      mode247: true,
      filters: ['bassboost', 'nightcore', 'vaporwave', '8d', 'karaoke', 'timescale', 'tremolo', 'vibrato'],
      customTheme: true,
      priorityNodes: true
    },
    DIAMOND: {
      id: 'diamond',
      name: 'Diamond Tier',
      maxQueueSize: 5000,
      maxPlaylists: 100,
      maxTracksPerPlaylist: 2000,
      noPrefix: true,
      autoplay: true,
      mode247: true,
      filters: ['all'],
      customTheme: true,
      priorityNodes: true
    }
  },

  DEFAULT_CONFIG: {
    PREFIX: '!',
    DEFAULT_VOLUME: 80,
    DEFAULT_LOOP: 'off', // off | track | queue
    DEFAULT_AUTOPLAY: false,
    DEFAULT_247: false,
    DEFAULT_PLAYER_THEME: 'classic_dark'
  }
};
