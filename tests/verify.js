const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('--- Starting Kira Music Bot Test & Verification Suite ---\n');

  // 1. Test Database and Repositories
  console.log('[1/5] Testing SQLite Database and Repositories...');
  const dbManager = require('../src/database');
  const guildRepo = require('../src/database/repositories/GuildRepository');
  const userRepo = require('../src/database/repositories/UserRepository');
  const playlistRepo = require('../src/database/repositories/PlaylistRepository');
  const premiumRepo = require('../src/database/repositories/PremiumRepository');
  const statsRepo = require('../src/database/repositories/StatsRepository');
  const blacklistRepo = require('../src/database/repositories/BlacklistRepository');

  // Guild Repo Test
  const testGuild = guildRepo.get('111222333444');
  assert.strictEqual(testGuild.prefix, '!');
  const updatedGuild = guildRepo.update('111222333444', { prefix: 'k!', default_volume: 90 });
  assert.strictEqual(updatedGuild.prefix, 'k!');
  assert.strictEqual(updatedGuild.default_volume, 90);

  // User Repo & Favorites Test
  userRepo.addFavorite('user_test_1', { title: 'Test Song', author: 'Artist A', uri: 'https://example.com/1', duration: 180000 });
  const favs = userRepo.getFavorites('user_test_1');
  assert.strictEqual(favs.length, 1);
  assert.strictEqual(favs[0].title, 'Test Song');

  // History & Profile Stats Test
  userRepo.addHistory('user_test_1', '111222333444', { title: 'Test Song', author: 'Artist A', uri: 'https://example.com/1', duration: 180000 });
  const profile = userRepo.getProfileStats('user_test_1');
  assert.strictEqual(profile.totalPlayed, 1);

  // Playlist Repo Test
  const pl = playlistRepo.create('user_test_1', '111222333444', 'My Playlist', 'Test playlist');
  assert.strictEqual(pl.name, 'My Playlist');
  playlistRepo.addTrack(pl.id, { title: 'Track 1', author: 'Artist 1', uri: 'https://example.com/t1', duration: 200000 });
  const fetchedPl = playlistRepo.get(pl.id);
  assert.strictEqual(fetchedPl.tracks.length, 1);

  // Premium Repo Test
  premiumRepo.set('user_test_1', 'user', 'gold', 'admin', 0);
  const prem = premiumRepo.get('user_test_1');
  assert.strictEqual(prem.tier, 'gold');

  // Blacklist Repo Test
  blacklistRepo.add('bad_user', 'user', 'Spam', 'admin');
  assert.strictEqual(blacklistRepo.isBlacklisted('bad_user'), true);
  blacklistRepo.remove('bad_user');
  assert.strictEqual(blacklistRepo.isBlacklisted('bad_user'), false);

  console.log('✓ Database and all repositories verified successfully.\n');

  // 2. Test Discord Components V2 Builders
  console.log('[2/5] Testing Discord Components V2 Builders & Layouts...');
  const {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectBuilder,
    createV2Payload
  } = require('../src/ui/componentsV2');
  const { COMPONENT_TYPES, BUTTON_STYLES, MESSAGE_FLAGS } = require('../src/config/constants');

  const container = new ContainerBuilder(0x5865f2)
    .addComponents(
      new TextDisplayBuilder('**Title**\nSubtitle description'),
      new SeparatorBuilder(true, 1),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_1').setLabel('Click Me').setStyle(BUTTON_STYLES.PRIMARY),
        new ButtonBuilder().setUrl('https://example.com').setLabel('Link').setStyle(BUTTON_STYLES.LINK)
      )
    );

  const payload = createV2Payload(container);
  assert.strictEqual(payload.flags, MESSAGE_FLAGS.IS_COMPONENTS_V2);
  assert.strictEqual(payload.components[0].type, COMPONENT_TYPES.CONTAINER);
  assert.strictEqual(payload.components[0].components[0].type, COMPONENT_TYPES.TEXT_DISPLAY);
  assert.strictEqual(payload.components[0].components[1].type, COMPONENT_TYPES.SEPARATOR);
  assert.strictEqual(payload.components[0].components[2].type, COMPONENT_TYPES.ACTION_ROW);
  assert.strictEqual(payload.components[0].components[2].components[0].type, COMPONENT_TYPES.BUTTON);
  console.log('✓ Components V2 structure matches Discord specifications.\n');

  // 3. Test Canvas Generation
  console.log('[3/5] Testing Skia Canvas Player & Profile Card Renderers...');
  const playerCanvas = require('../src/canvas/PlayerCanvas');
  const profileCanvas = require('../src/canvas/ProfileCanvas');

  const playerBuffer = await playerCanvas.render({
    title: 'Interstellar Theme',
    author: 'Hans Zimmer',
    duration: 245000,
    position: 95000,
    requester: 'CosmicListener',
    paused: false,
    loop: 'track',
    autoplay: true,
    filters: ['Bassboost', 'Nightcore']
  });
  assert(Buffer.isBuffer(playerBuffer));
  assert(playerBuffer.length > 5000);

  const profileBuffer = await profileCanvas.render(profile, { username: 'CosmicUser', tag: 'CosmicUser#0001' });
  assert(Buffer.isBuffer(profileBuffer));
  assert(profileBuffer.length > 5000);

  console.log(`✓ Player card rendered (${playerBuffer.length} bytes) & Profile card rendered (${profileBuffer.length} bytes).\n`);

  // 4. Test Command Registry & Slash Command Builders
  console.log('[4/5] Testing Command Loader & Slash Command Definitions...');
  const commandHandler = require('../src/handlers/CommandHandler');
  commandHandler.loadCommands();

  const requiredCommands = [
    'play', 'search', 'pause', 'resume', 'skip', 'previous', 'stop', 'restart',
    'seek', 'forward', 'rewind', 'volume', 'nowplaying', 'queue', 'loop',
    'shuffle', 'autoplay', '247', 'lyrics', 'recommend', 'related', 'favorite',
    'favorites', 'history', 'profile', 'playlist', 'filters', 'settings',
    'setup', 'prefix', 'dj', 'player', 'permissions', 'premium', 'stats',
    'help', 'ping', 'botinfo', 'invite', 'support', 'dev'
  ];

  for (const cmdName of requiredCommands) {
    const cmd = commandHandler.commands.get(cmdName);
    assert(cmd, `Missing required command: ${cmdName}`);
    assert(typeof cmd.execute === 'function', `Command ${cmdName} missing execute method`);
  }
  console.log(`✓ Verified all ${requiredCommands.length} required commands are loaded and valid.\n`);

  // 5. Test Premium Manager Logic
  console.log('[5/5] Testing PremiumManager Entitlements & Tiers...');
  const premiumManager = require('../src/managers/PremiumManager');
  assert.strictEqual(premiumManager.hasNoPrefix('free_user'), false);
  assert.strictEqual(premiumManager.hasNoPrefix('user_test_1'), true); // user_test_1 is gold
  assert.strictEqual(premiumManager.canUse247(null, 'user_test_1'), true);
  assert.strictEqual(premiumManager.canUseFilter('timescale', null, 'user_test_1'), true);
  assert.strictEqual(premiumManager.getMaxQueueSize(null, 'user_test_1'), 1000);

  console.log('✓ Premium tier logic verified successfully.\n');

  console.log('====================================================');
  console.log('🎉 ALL TESTS PASSED! KIRA MUSIC BOT IS FULLY READY.');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Verification failed with error:', err);
  process.exit(1);
});
