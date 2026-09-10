chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen') {
    renderIcon(message.data.temp, message.data.iconUrl).then((dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Keep message channel open for async response
  }
});

async function renderIcon(temp, iconUrl) {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, 38, 38);

  if (iconUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = iconUrl;
      });
      ctx.drawImage(img, 0, 0, 38, 38);
    } catch (e) {
      console.warn('Could not render background icon onto canvas:', e);
    }
  }

  // Draw temperature badge overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 18, 38, 20, 4);
  } else {
    ctx.rect(0, 18, 38, 20);
  }
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(temp, 19, 32);

  return canvas.toDataURL('image/png');
}