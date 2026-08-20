const { createCanvas, loadImage } = require('@napi-rs/canvas');

class ProfileCanvas {
  formatDuration(ms) {
    if (!ms || isNaN(ms) || ms < 0) return '0m';
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + '...';
  }

  async render(userData, userObj) {
    const width = 840;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Deep Obsidian Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#07080b');
    bgGrad.addColorStop(0.5, '#0b0c10');
    bgGrad.addColorStop(1, '#0e1017');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Outer subtle border
    ctx.strokeStyle = '#1a1c24';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // 2. Avatar with Circular Ring & Glow
    const avatarX = 35;
    const avatarY = 35;
    const avatarSize = 85;

    let avatarImg = null;
    if (userObj?.displayAvatarURL) {
      try {
        const url = userObj.displayAvatarURL({ extension: 'png', size: 256 });
        avatarImg = await loadImage(url);
      } catch (e) {
        avatarImg = null;
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    if (avatarImg) {
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = '#1c1e27';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // Avatar Glowing Outer Ring
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#5865f2';
    ctx.lineWidth = 2;
    ctx.stroke();

    // User Tag & Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const tag = userObj?.tag || userObj?.username || 'User Profile';
    ctx.fillText(tag, 140, 70);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.fillText('Personal Music Telemetry & Listening Analytics', 140, 96);

    // 3. Stat Metric Boxes (Frosted dark cards)
    const metrics = [
      { label: 'TRACKS STREAMED', value: String(userData.totalPlayed || 0) },
      { label: 'TOTAL LISTENING', value: this.formatDuration(userData.totalDurationMs || 0) },
      { label: 'SAVED FAVORITES', value: String(userData.favoritesCount || 0) },
      { label: 'PLAYLISTS CREATED', value: String(userData.playlistsCount || 0) }
    ];

    const boxY = 145;
    const boxW = 180;
    const boxH = 75;
    const gap = 16;
    const startX = 35;

    metrics.forEach((m, idx) => {
      const bx = startX + idx * (boxW + gap);
      const bGrad = ctx.createLinearGradient(bx, boxY, bx, boxY + boxH);
      bGrad.addColorStop(0, '#13151d');
      bGrad.addColorStop(1, '#0e0f15');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, boxY, boxW, boxH, 8);
      ctx.fill();

      ctx.strokeStyle = '#202330';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(m.label, bx + 16, boxY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(m.value, bx + 16, boxY + 58);
    });

    // 4. Top Artists & Top Tracks Columns
    const colY = 240;
    const colW = 370;
    const colH = 135;

    // Top Artists Card
    const artCardX = 35;
    const aGrad = ctx.createLinearGradient(artCardX, colY, artCardX, colY + colH);
    aGrad.addColorStop(0, '#13151d');
    aGrad.addColorStop(1, '#0e0f15');
    ctx.fillStyle = aGrad;
    ctx.beginPath();
    ctx.roundRect(artCardX, colY, colW, colH, 8);
    ctx.fill();
    ctx.strokeStyle = '#202330';
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('TOP ARTISTS', artCardX + 16, colY + 24);

    const topArtists = userData.topArtists || [];
    if (topArtists.length === 0) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '13px sans-serif';
      ctx.fillText('No artist history recorded yet.', artCardX + 16, colY + 60);
    } else {
      topArtists.slice(0, 3).forEach((a, i) => {
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '13px sans-serif';
        const artistLine = `${i + 1}. ${this.truncate(ctx, a.author, 240)}`;
        ctx.fillText(artistLine, artCardX + 16, colY + 54 + i * 26);

        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(`${a.count} plays`, artCardX + colW - 16, colY + 54 + i * 26);
        ctx.textAlign = 'left';
      });
    }

    // Top Tracks Card
    const trackCardX = artCardX + colW + 30;
    const tGrad = ctx.createLinearGradient(trackCardX, colY, trackCardX, colY + colH);
    tGrad.addColorStop(0, '#13151d');
    tGrad.addColorStop(1, '#0e0f15');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.roundRect(trackCardX, colY, colW, colH, 8);
    ctx.fill();
    ctx.strokeStyle = '#202330';
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('TOP TRACKS', trackCardX + 16, colY + 24);

    const topTracks = userData.topTracks || [];
    if (topTracks.length === 0) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '13px sans-serif';
      ctx.fillText('No track history recorded yet.', trackCardX + 16, colY + 60);
    } else {
      topTracks.slice(0, 3).forEach((t, i) => {
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '13px sans-serif';
        const trackLine = `${i + 1}. ${this.truncate(ctx, t.title, 240)}`;
        ctx.fillText(trackLine, trackCardX + 16, colY + 54 + i * 26);

        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(`${t.count} plays`, trackCardX + colW - 16, colY + 54 + i * 26);
        ctx.textAlign = 'left';
      });
    }

    return canvas.toBuffer('image/png');
  }
}

module.exports = new ProfileCanvas();
