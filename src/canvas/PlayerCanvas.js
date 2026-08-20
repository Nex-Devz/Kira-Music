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
   * Render ultra-sleek, sexy dark luxury player card
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

    const width = 840;
    const height = 270;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Base Luxury Obsidian Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#07080b');
    bgGrad.addColorStop(0.5, '#0b0c10');
    bgGrad.addColorStop(1, '#0e1017');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Load Artwork
    let artworkImg = null;
    if (artworkUrl) {
      try {
        const cached = cacheManager.getArtwork(artworkUrl);
        if (cached) {
          artworkImg = cached.img;
        } else {
          const img = await loadImage(artworkUrl);
          artworkImg = img;
          cacheManager.setArtwork(artworkUrl, { img });
        }
      } catch (err) {
        artworkImg = null;
      }
    }

    // 3. Subtle Ambient Light Glow from Top-Right
    const ambientGrad = ctx.createRadialGradient(width - 150, 60, 10, width - 150, 60, 350);
    ambientGrad.addColorStop(0, 'rgba(88, 101, 242, 0.08)');
    ambientGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. Subtle Outer Micro-Border
    ctx.strokeStyle = '#1a1c24';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // 5. Album Artwork Section with Vinyl Record Shadow
    const artX = 28;
    const artY = 28;
    const artSize = 214;
    const radius = 14;

    // Vinyl Disc Peek on the Right of Artwork
    ctx.save();
    ctx.beginPath();
    ctx.arc(artX + artSize - 10, artY + artSize / 2, artSize / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#121318';
    ctx.fill();
    ctx.strokeStyle = '#222530';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner Vinyl Grooves
    [20, 35, 50, 65, 80].forEach(r => {
      ctx.beginPath();
      ctx.arc(artX + artSize - 10, artY + artSize / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.stroke();
    });
    ctx.restore();

    // Album Artwork Image Card
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, radius);
    ctx.clip();

    if (artworkImg) {
      ctx.drawImage(artworkImg, artX, artY, artSize, artSize);
    } else {
      // Sleek fallback cover
      const fallbackGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
      fallbackGrad.addColorStop(0, '#151720');
      fallbackGrad.addColorStop(1, '#0c0d12');
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(artX, artY, artSize, artSize);

      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AUDIO', artX + artSize / 2, artY + artSize / 2 + 10);
    }
    ctx.restore();

    // Artwork Border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, radius);
    ctx.strokeStyle = '#262936';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 6. Right Details Section
    const contentX = 275;
    const contentWidth = width - contentX - 35;

    // Badges (Pills)
    let badgeX = contentX;
    const badgeY = 30;

    const renderPill = (label, textColor, bgGradColor1, bgGradColor2, borderColor) => {
      ctx.font = 'bold 9px sans-serif';
      const textWidth = ctx.measureText(label).width;
      const bWidth = textWidth + 16;
      const bHeight = 22;

      const pGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + bHeight);
      pGrad.addColorStop(0, bgGradColor1);
      pGrad.addColorStop(1, bgGradColor2);
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, bWidth, bHeight, 6);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.fillText(label, badgeX + 8, badgeY + 14);

      badgeX += bWidth + 8;
    };

    if (paused) {
      renderPill('PAUSED', '#fbbf24', '#261e0e', '#191307', '#3d2e14');
    } else {
      renderPill('PLAYING', '#34d399', '#0d221a', '#081711', '#143c2c');
    }

    if (loop && loop !== 'off') {
      renderPill(`LOOP: ${loop.toUpperCase()}`, '#a5b4fc', '#15172b', '#0e0f1d', '#282b52');
    }

    if (autoplay) {
      renderPill('AUTOPLAY', '#d8b4fe', '#1d122b', '#13091e', '#391e57');
    }

    if (filters && filters.length > 0) {
      renderPill(`DSP: ${filters.join(', ').toUpperCase()}`, '#7dd3fc', '#0d202e', '#07141e', '#163852');
    }

    // Waveform Equalizer Visualizer Micro-Bars (Right aligned)
    const eqX = width - 75;
    const eqY = 46;
    const barHeights = paused ? [4, 4, 4, 4, 4] : [14, 8, 16, 10, 12];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = paused ? '#4b5563' : '#5865f2';
      ctx.fillRect(eqX + i * 7, eqY - barHeights[i], 3.5, barHeights[i]);
    }

    // Track Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 23px sans-serif';
    ctx.textAlign = 'left';
    const cleanTitle = this.truncateText(ctx, title, contentWidth);
    ctx.fillText(cleanTitle, contentX, 90);

    // Track Artist
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    const cleanAuthor = this.truncateText(ctx, author, contentWidth);
    ctx.fillText(cleanAuthor, contentX, 118);

    // Requester Meta
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Added by: ${requester}`, contentX, 144);

    // 7. Progress Bar & Micro-Indicators
    const barX = contentX;
    const barY = 185;
    const barWidth = contentWidth;
    const barHeight = 6;
    const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

    // Track Background
    ctx.fillStyle = '#181a24';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 3);
    ctx.fill();

    // Filled Track
    if (progress > 0) {
      const fillWidth = Math.max(6, barWidth * progress);
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
      fillGrad.addColorStop(0, '#5865F2');
      fillGrad.addColorStop(1, '#a5b4fc');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillWidth, barHeight, 3);
      ctx.fill();

      // Glowing Playhead Indicator
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(barX + fillWidth, barY + barHeight / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Timestamps
    const posText = this.formatDuration(position);
    const durText = duration > 0 ? this.formatDuration(duration) : 'LIVE';

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(posText, barX, barY + 26);

    ctx.textAlign = 'right';
    ctx.fillText(durText, barX + barWidth, barY + 26);

    return canvas.toBuffer('image/png');
  }
}

module.exports = new PlayerCanvas();
