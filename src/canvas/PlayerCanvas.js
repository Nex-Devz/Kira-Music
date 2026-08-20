const { createCanvas, loadImage } = require('@napi-rs/canvas');
const cacheManager = require('../managers/CacheManager');

class PlayerCanvas {
  /**
   * Format milliseconds into MM:SS or HH:MM:SS
   */
  formatDuration(ms) {
    if (!ms || isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Truncate text with ellipsis
   */
  truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  /**
   * Render modern dark player card
   */
  async render(data) {
    const {
      title = 'Unknown Track',
      author = 'Unknown Artist',
      duration = 0,
      position = 0,
      artworkUrl = null,
      requester = 'Anonymous',
      paused = false,
      loop = 'off',
      autoplay = false,
      filters = []
    } = data;

    const width = 800;
    const height = 260;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Base Background - Deep Obsidian Dark
    ctx.fillStyle = '#0f1015';
    ctx.fillRect(0, 0, width, height);

    // 2. Load Artwork if available
    let artworkImg = null;
    let dominantColor = '#5865F2';

    if (artworkUrl) {
      try {
        const cached = cacheManager.getArtwork(artworkUrl);
        if (cached) {
          artworkImg = cached.img;
          dominantColor = cached.color;
        } else {
          const img = await loadImage(artworkUrl);
          artworkImg = img;
          dominantColor = '#4f56e9';
          cacheManager.setArtwork(artworkUrl, { img, color: dominantColor });
        }
      } catch (err) {
        artworkImg = null;
      }
    }

    // 3. Subtle Ambient Glow from dominant color
    const glowGrad = ctx.createRadialGradient(200, 130, 20, 200, 130, 350);
    glowGrad.addColorStop(0, dominantColor + '22');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. Subtle Border Container
    ctx.strokeStyle = '#23252e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // 5. Render Artwork Box
    const artX = 30;
    const artY = 30;
    const artSize = 200;
    const radius = 12;

    ctx.save();
    // Rounded Clip for artwork
    ctx.beginPath();
    ctx.moveTo(artX + radius, artY);
    ctx.lineTo(artX + artSize - radius, artY);
    ctx.quadraticCurveTo(artX + artSize, artY, artX + artSize, artY + radius);
    ctx.lineTo(artX + artSize, artY + artSize - radius);
    ctx.quadraticCurveTo(artX + artSize, artY + artSize, artX + artSize - radius, artY + artSize);
    ctx.lineTo(artX + radius, artY + artSize);
    ctx.quadraticCurveTo(artX, artY + artSize, artX, artY + artSize - radius);
    ctx.lineTo(artX, artY + radius);
    ctx.quadraticCurveTo(artX, artY, artX + radius, artY);
    ctx.closePath();
    ctx.clip();

    if (artworkImg) {
      ctx.drawImage(artworkImg, artX, artY, artSize, artSize);
    } else {
      // Sleek fallback album art
      const fallbackGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
      fallbackGrad.addColorStop(0, '#1c1e27');
      fallbackGrad.addColorStop(1, '#111217');
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(artX, artY, artSize, artSize);

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AUDIO', artX + artSize / 2, artY + artSize / 2 + 12);
    }
    ctx.restore();

    // Artwork Border
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(artX + radius, artY);
    ctx.lineTo(artX + artSize - radius, artY);
    ctx.quadraticCurveTo(artX + artSize, artY, artX + artSize, artY + radius);
    ctx.lineTo(artX + artSize, artY + artSize - radius);
    ctx.quadraticCurveTo(artX + artSize, artY + artSize, artX + artSize - radius, artY + artSize);
    ctx.lineTo(artX + radius, artY + artSize);
    ctx.quadraticCurveTo(artX, artY + artSize, artX, artY + artSize - radius);
    ctx.lineTo(artX, artY + radius);
    ctx.quadraticCurveTo(artX, artY, artX + radius, artY);
    ctx.closePath();
    ctx.strokeStyle = '#2d313d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 6. Right Side - Track Details
    const contentX = 260;
    const contentWidth = width - contentX - 35;

    // Status Badges (Playing/Paused, Loop, Autoplay)
    let badgeX = contentX;
    const badgeY = 32;

    const renderBadge = (label, color, bgColor) => {
      ctx.font = 'bold 10px sans-serif';
      const textWidth = ctx.measureText(label).width;
      const bWidth = textWidth + 16;
      const bHeight = 20;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, bWidth, bHeight, 4);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(label, badgeX + 8, badgeY + 14);

      badgeX += bWidth + 8;
    };

    if (paused) {
      renderBadge('PAUSED', '#fbbf24', '#2d2516');
    } else {
      renderBadge('PLAYING', '#34d399', '#142921');
    }

    if (loop && loop !== 'off') {
      renderBadge(`LOOP: ${loop.toUpperCase()}`, '#818cf8', '#1e2038');
    }

    if (autoplay) {
      renderBadge('AUTOPLAY', '#c084fc', '#271936');
    }

    if (filters && filters.length > 0) {
      renderBadge(`FX: ${filters.join(', ').toUpperCase()}`, '#38bdf8', '#142738');
    }

    // Track Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    const cleanTitle = this.truncateText(ctx, title, contentWidth);
    ctx.fillText(cleanTitle, contentX, 85);

    // Track Author / Artist
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    const cleanAuthor = this.truncateText(ctx, author, contentWidth);
    ctx.fillText(cleanAuthor, contentX, 112);

    // Requester Meta
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Requested by: ${requester}`, contentX, 138);

    // 7. Progress Bar & Timestamps
    const barX = contentX;
    const barY = 175;
    const barWidth = contentWidth;
    const barHeight = 8;
    const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

    // Background track
    ctx.fillStyle = '#232631';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Filled progress
    if (progress > 0) {
      const fillWidth = Math.max(8, barWidth * progress);
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
      fillGrad.addColorStop(0, '#5865F2');
      fillGrad.addColorStop(1, '#818cf8');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillWidth, barHeight, 4);
      ctx.fill();

      // Glowing Thumb
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(barX + fillWidth, barY + barHeight / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Time Indicators
    const posText = this.formatDuration(position);
    const durText = duration > 0 ? this.formatDuration(duration) : 'LIVE';

    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(posText, barX, barY + 28);

    ctx.textAlign = 'right';
    ctx.fillText(durText, barX + barWidth, barY + 28);

    return canvas.toBuffer('image/png');
  }
}

module.exports = new PlayerCanvas();
