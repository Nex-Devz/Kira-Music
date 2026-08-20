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
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#0f1015';
    ctx.fillRect(0, 0, width, height);

    // Subtle container border
    ctx.strokeStyle = '#23252e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Ambient glow
    const ambient = ctx.createRadialGradient(100, 100, 10, 100, 100, 400);
    ambient.addColorStop(0, '#5865f218');
    ambient.addColorStop(1, 'transparent');
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, width, height);

    // 2. Avatar
    const avatarX = 40;
    const avatarY = 40;
    const avatarSize = 90;
    const avatarRadius = 16;

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
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
    ctx.clip();
    if (avatarImg) {
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = '#23252e';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // User Tag & Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const tag = userObj?.tag || userObj?.username || 'User Profile';
    ctx.fillText(tag, 150, 75);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText('Listening Profile & Analytics', 150, 105);

    // 3. Stat Metric Boxes
    const metrics = [
      { label: 'TRACKS PLAYED', value: String(userData.totalPlayed || 0) },
      { label: 'TIME LISTENED', value: this.formatDuration(userData.totalDurationMs || 0) },
      { label: 'FAVORITES', value: String(userData.favoritesCount || 0) },
      { label: 'PLAYLISTS', value: String(userData.playlistsCount || 0) }
    ];

    const boxY = 150;
    const boxW = 165;
    const boxH = 75;
    const gap = 17;
    const startX = 40;

    metrics.forEach((m, idx) => {
      const bx = startX + idx * (boxW + gap);
      ctx.fillStyle = '#16171f';
      ctx.beginPath();
      ctx.roundRect(bx, boxY, boxW, boxH, 8);
      ctx.fill();

      ctx.strokeStyle = '#23252e';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(m.label, bx + 15, boxY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(m.value, bx + 15, boxY + 58);
    });

    // 4. Top Artists & Top Tracks Columns
    const colY = 245;
    const colW = 345;
    const colH = 130;

    // Top Artists Card
    ctx.fillStyle = '#16171f';
    ctx.beginPath();
    ctx.roundRect(40, colY, colW, colH, 8);
    ctx.fill();
    ctx.strokeStyle = '#23252e';
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('TOP ARTISTS', 55, colY + 25);

    const topArtists = userData.topArtists || [];
    if (topArtists.length === 0) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '13px sans-serif';
      ctx.fillText('No listening history recorded yet.', 55, colY + 60);
    } else {
      topArtists.slice(0, 3).forEach((a, i) => {
        ctx.fillStyle = '#d1d5db';
        ctx.font = '13px sans-serif';
        const artistLine = `${i + 1}. ${this.truncate(ctx, a.author, 230)}`;
        ctx.fillText(artistLine, 55, colY + 55 + i * 24);

        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(`${a.count} plays`, 40 + colW - 15, colY + 55 + i * 24);
        ctx.textAlign = 'left';
      });
    }

    // Top Tracks Card
    const trackCardX = 40 + colW + 30;
    ctx.fillStyle = '#16171f';
    ctx.beginPath();
    ctx.roundRect(trackCardX, colY, colW, colH, 8);
    ctx.fill();
    ctx.strokeStyle = '#23252e';
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('TOP TRACKS', trackCardX + 15, colY + 25);

    const topTracks = userData.topTracks || [];
    if (topTracks.length === 0) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '13px sans-serif';
      ctx.fillText('No tracks played yet.', trackCardX + 15, colY + 60);
    } else {
      topTracks.slice(0, 3).forEach((t, i) => {
        ctx.fillStyle = '#d1d5db';
        ctx.font = '13px sans-serif';
        const trackLine = `${i + 1}. ${this.truncate(ctx, t.title, 230)}`;
        ctx.fillText(trackLine, trackCardX + 15, colY + 55 + i * 24);

        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(`${t.count} plays`, trackCardX + colW - 15, colY + 55 + i * 24);
        ctx.textAlign = 'left';
      });
    }

    return canvas.toBuffer('image/png');
  }
}

module.exports = new ProfileCanvas();
