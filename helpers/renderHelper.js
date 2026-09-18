/**
 * helpers/renderHelper.js - Helper chuyển đổi bảng HTML thành ảnh PNG bằng Puppeteer
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

let browserInstance = null;

const TEMPLATE_PATH = path.join(__dirname, '../templates/itemsTable.html');
const CDN_PRE_RENDER_3D = "https://raw.githubusercontent.com/Owen1212055/mc-assets/main/item-assets/";
const SVG_QUESTION_MARK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>";

const MC_COLOR_HEX = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#FF5555',
  'd': '#FF55FF',
  'e': '#FFFF55',
  'f': '#FFFFFF',
  'black': '#000000',
  'dark_blue': '#0000AA',
  'dark_green': '#00AA00',
  'dark_aqua': '#00AAAA',
  'dark_red': '#AA0000',
  'dark_purple': '#AA00AA',
  'gold': '#FFAA00',
  'gray': '#AAAAAA',
  'dark_gray': '#555555',
  'blue': '#5555FF',
  'green': '#55FF55',
  'aqua': '#55FFFF',
  'red': '#FF5555',
  'light_purple': '#FF55FF',
  'yellow': '#FFFF55',
  'white': '#FFFFFF'
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browserInstance = await puppeteer.launch(launchOptions);
  }
  return browserInstance;
}

/**
 * Format tên item từ id (ví dụ: 'blaze_rod' -> 'Blaze Rod')
 */
function formatItemDisplayName(id) {
  if (!id) return 'Item';
  return id
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Lấy URL Icon 3D Pre-rendered với fallback dấu hỏi (?)
 */
function getItemIconUrl(id) {
  if (!id) return SVG_QUESTION_MARK;
  const cleanId = id.toLowerCase().trim();
  if (cleanId === 'player_head' || cleanId === 'skull' || cleanId === 'air' || cleanId === 'barrier') {
    return SVG_QUESTION_MARK;
  }
  return `${CDN_PRE_RENDER_3D}${cleanId.toUpperCase()}.png`;
}

// Chuẩn hóa phông chữ Small Caps độc lạ của Server Minecraft (ví dụ: đơɴ ʜàɴɢ ᴄủᴀ -> don hang cua)
function normalizeSmallCaps(str) {
  if (!str) return '';
  return String(str)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/ᴀ/g, 'a')
    .replace(/ʙ/g, 'b')
    .replace(/ᴄ/g, 'c')
    .replace(/ᴅ/g, 'd')
    .replace(/ᴇ/g, 'e')
    .replace(/ғ/g, 'f')
    .replace(/ɢ/g, 'g')
    .replace(/ʜ/g, 'h')
    .replace(/ɪ/g, 'i')
    .replace(/ᴊ/g, 'j')
    .replace(/ᴋ/g, 'k')
    .replace(/ʟ/g, 'l')
    .replace(/ᴍ/g, 'm')
    .replace(/ɴ/g, 'n')
    .replace(/ᴏ/g, 'o')
    .replace(/ᴘ/g, 'p')
    .replace(/ǫ/g, 'q')
    .replace(/ʀ/g, 'r')
    .replace(/ꜱ/g, 's')
    .replace(/ᴛ/g, 't')
    .replace(/ᴜ/g, 'u')
    .replace(/ᴠ/g, 'v')
    .replace(/ᴡ/g, 'w')
    .replace(/x/g, 'x')
    .replace(/ʏ/g, 'y')
    .replace(/ᴢ/g, 'z')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cleanMinecraftText(text) {
  if (!text) return '';
  return String(text)
    .replace(/§x(§[0-9a-f]){6}/gi, '')
    .replace(/&x(&[0-9a-f]){6}/gi, '')
    .replace(/&#[0-9a-f]{6}/gi, '')
    .replace(/§#[0-9a-f]{6}/gi, '')
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/&[0-9a-fk-or]/gi, '')
    .replace(/§./g, '')
    .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
    .normalize('NFC')
    .trim();
}

function cleanBuyerName(str) {
  if (!str) return 'Ẩn danh';
  let cleanText = cleanMinecraftText(str);
  let normalized = normalizeSmallCaps(cleanText);

  const prefixMatch = normalized.match(/^(?:don\s*hang|order)?(?:\s*cua|\s*of|:|\s)*\s*/iu);
  if (prefixMatch && prefixMatch[0].length > 0) {
    const prefixLen = prefixMatch[0].length;
    let buyerPart = cleanText.substring(prefixLen).trim();
    buyerPart = buyerPart.replace(/^[:\-\s#]+/, '').trim();
    if (buyerPart) return buyerPart;
  }

  cleanText = cleanText.replace(/^(?:đơn\s*hàng|don\s*hang|order)?(?:\s*của|\s*cua|:|\s)*\s*/iu, '').trim();
  cleanText = cleanText.replace(/^[:\-\s#]+/, '').trim();
  return cleanText || 'Ẩn danh';
}

function getColorHex(color) {
  if (!color) return null;
  if (color.startsWith('#')) return color;
  return MC_COLOR_HEX[color.toLowerCase()] || null;
}

function parseSectionCodesToHtml(text, defaultColor = '#ffffff') {
  if (!text) return '';
  if (!text.includes('§')) {
    return `<span style="color: ${defaultColor};">${escapeHtml(text)}</span>`;
  }

  let currentColor = defaultColor;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrikethrough = false;

  let resultHtml = '';
  let currentSegment = '';

  function flushSegment() {
    if (!currentSegment) return;
    let styles = [];
    if (currentColor) styles.push(`color: ${currentColor}`);
    if (isBold) styles.push(`font-weight: bold`);
    if (isItalic) styles.push(`font-style: italic`);
    let decorations = [];
    if (isUnderline) decorations.push('underline');
    if (isStrikethrough) decorations.push('line-through');
    if (decorations.length > 0) styles.push(`text-decoration: ${decorations.join(' ')}`);

    const styleStr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    resultHtml += `<span${styleStr}>${escapeHtml(currentSegment)}</span>`;
    currentSegment = '';
  }

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '§' && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();
      i++;

      if (MC_COLOR_HEX[code]) {
        flushSegment();
        currentColor = MC_COLOR_HEX[code];
      } else if (code === 'l') {
        flushSegment();
        isBold = true;
      } else if (code === 'o') {
        flushSegment();
        isItalic = true;
      } else if (code === 'n') {
        flushSegment();
        isUnderline = true;
      } else if (code === 'm') {
        flushSegment();
        isStrikethrough = true;
      } else if (code === 'r') {
        flushSegment();
        currentColor = defaultColor;
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrikethrough = false;
      }
    } else {
      currentSegment += text[i];
    }
  }

  flushSegment();
  return resultHtml || `<span style="color: ${defaultColor};">${escapeHtml(text)}</span>`;
}

function parseMinecraftComponentToHtml(obj, inheritedColor = '#ffffff') {
  if (!obj) return '';

  if (typeof obj === 'string') {
    let str = obj.trim();
    if (str.startsWith('{') || str.startsWith('[')) {
      try {
        const parsed = JSON.parse(str);
        return parseMinecraftComponentToHtml(parsed, inheritedColor);
      } catch (e) {}
    }
    if (str.includes('§')) {
      return parseSectionCodesToHtml(str, inheritedColor);
    }
    return `<span style="color: ${inheritedColor};">${escapeHtml(str)}</span>`;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => parseMinecraftComponentToHtml(item, inheritedColor)).join('');
  }

  if (typeof obj === 'object') {
    let currentColor = getColorHex(obj.color) || inheritedColor;
    let result = '';

    if (obj.text) {
      let styles = [];
      if (currentColor) styles.push(`color: ${currentColor}`);
      if (obj.bold) styles.push('font-weight: bold');
      if (obj.italic === true) styles.push('font-style: italic');
      if (obj.italic === false) styles.push('font-style: normal');
      let decs = [];
      if (obj.underlined) decs.push('underline');
      if (obj.strikethrough) decs.push('line-through');
      if (decs.length > 0) styles.push(`text-decoration: ${decs.join(' ')}`);

      const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
      result += `<span${styleAttr}>${escapeHtml(obj.text)}</span>`;
    }

    if (obj.extra && Array.isArray(obj.extra)) {
      result += parseMinecraftComponentToHtml(obj.extra, currentColor);
    }

    return result;
  }

  return `<span style="color: ${inheritedColor};">${escapeHtml(String(obj))}</span>`;
}

function formatMinecraftTextToHtml(input, defaultColor = '#ffffff') {
  if (!input) return `<span style="color: ${defaultColor};">Vật phẩm</span>`;

  if (typeof input === 'string') {
    let str = input.trim();
    if (str.startsWith('{') || str.startsWith('[')) {
      try {
        const parsed = JSON.parse(str);
        return parseMinecraftComponentToHtml(parsed, defaultColor);
      } catch (e) {}
    }
  }

  if (typeof input === 'object') {
    return parseMinecraftComponentToHtml(input, defaultColor);
  }

  return parseSectionCodesToHtml(String(input), defaultColor);
}

/**
 * Render bảng danh sách vật phẩm ra Buffer ảnh PNG
 * @param {string} title - Tiêu đề bảng (ví dụ: "DANH SÁCH ORDER: ELYTRA")
 * @param {string} itemQuery - Tên item tra cứu
 * @param {Array} items - Danh sách đơn hàng/vật phẩm
 * @param {string} type - Loại lệnh ('order' hoặc 'ah')
 * @returns {Promise<Buffer>}
 */
async function renderTableImage(title, itemQuery, items, type = 'order') {
  let templateContent = '';
  try {
    templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  } catch (err) {
    console.error('[RenderHelper] Không thể đọc file templates/itemsTable.html:', err.message);
    throw err;
  }

  const rowsHtml = items.map((item, index) => {
    const price = item.price || 'N/A';
    const rawName = item.itemName || item.name;
    const rawDisplay = item.displayName || '';
    const cleanDisplay = cleanMinecraftText(rawDisplay);
    const normalizedDisplay = normalizeSmallCaps(cleanDisplay);

    let iconItemQuery = '';
    if (rawName && rawName !== 'player_head' && rawName !== 'skull' && rawName !== 'air') {
      iconItemQuery = rawName;
    } else if (itemQuery) {
      iconItemQuery = itemQuery;
    }

    const iconUrl = getItemIconUrl(iconItemQuery);

    const isOrderTitle = /^(?:don\s*hang|order)/i.test(normalizedDisplay);

    let itemNameHtml = '';
    if (rawDisplay && !isOrderTitle && cleanDisplay !== 'Item' && cleanDisplay !== 'Vật phẩm') {
      itemNameHtml = formatMinecraftTextToHtml(rawDisplay, '#ffffff');
    } else {
      const derivedName = formatItemDisplayName(iconItemQuery);
      itemNameHtml = formatMinecraftTextToHtml(derivedName, '#ffffff');
    }

    let subInfoHtml = '';
    if (type === 'order') {
      let buyerName = item.buyer;
      if (!buyerName || buyerName === 'Ẩn danh' || /^(?:don\s*hang|order)/i.test(normalizeSmallCaps(buyerName))) {
        buyerName = cleanBuyerName(rawDisplay || cleanDisplay);
      }
      if (buyerName && buyerName !== 'Ẩn danh') {
        subInfoHtml = `<div class="sub-info">Người mua: <span class="highlight-user">${escapeHtml(buyerName)}</span></div>`;
      }
    } else if (type === 'ah' && item.seller && item.seller !== 'Ẩn danh') {
      subInfoHtml = `<div class="sub-info">Người bán: <span class="highlight-user">${escapeHtml(item.seller)}</span></div>`;
    }

    return `
      <tr>
        <td class="stt">#${index + 1}</td>
        <td class="icon-td">
          <div class="mc-slot">
            <img class="item-icon" src="${iconUrl}" onerror="this.onerror=null;this.src='${SVG_QUESTION_MARK}';" alt="${rawName || 'item'}" />
          </div>
        </td>
        <td class="item-name">
          ${itemNameHtml}
          ${subInfoHtml}
        </td>
        <td class="price">${price}</td>
      </tr>
    `;
  }).join('\n');

  const compiledHtml = templateContent
    .replace('{{TITLE}}', title)
    .replace('{{ROWS}}', rowsHtml);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 640, height: 480, deviceScaleFactor: 2 });
    await page.setContent(compiledHtml, { waitUntil: 'load', timeout: 30000 });

    // Đợi tất cả các icon tải xong hoàn toàn hoặc chuyển sang fallback
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        return new Promise(resolve => {
          let attempts = 0;
          const check = () => {
            attempts++;
            if ((img.complete && img.naturalWidth !== 0) || attempts > 25) {
              resolve();
            } else {
              setTimeout(check, 100);
            }
          };
          img.onload = check;
          img.onerror = () => setTimeout(check, 150);
          check();
        });
      }));
    });

    const elementHandle = await page.$('.table-container');
    if (!elementHandle) {
      throw new Error('Không tìm thấy container .table-container trong HTML');
    }

    const imageBuffer = await elementHandle.screenshot({
      type: 'png',
      omitBackground: true
    });

    return imageBuffer;
  } finally {
    await page.close();
  }
}


const STATS_TEMPLATE_PATH = path.join(__dirname, '../templates/statsTable.html');
const BALANCE_TEMPLATE_PATH = path.join(__dirname, '../templates/balanceCard.html');

function filterStatLore(lines) {
  return (lines || [])
    .map(line => cleanMinecraftText(line))
    .filter(line => {
      if (!line) return false;
      if (/^[_\-+=*~]*$/.test(line)) return false;
      if (/[-=_]{4,}/.test(line)) return false;
      const lower = line.toLowerCase();
      if (lower.includes('nhấp') || lower.includes('click') || lower.includes('click chuột')) return false;
      return true;
    });
}

function classifyStatItem(item) {
  const haystack = normalizeSmallCaps([
    item.name || '',
    cleanMinecraftText(item.displayName || ''),
    ...(item.lore || []).map(cleanMinecraftText)
  ].join(' '));

  if (/(money|balance|tien|xu|coin|shard|earned|spent|thu nhap|chi tieu|kiếm duoc|tieu)/.test(haystack)) {
    return 'economy';
  }
  if (/(kill|death|mob|slain|giết|chet|ha guc|chien dau|combat)/.test(haystack)) {
    return 'combat';
  }
  if (/(playtime|thoi gian|gio choi|blocks? (placed|broken)|block|dat|pha|online|offline|activity|hoat dong)/.test(haystack)) {
    return 'play';
  }
  if (/(rank|danh hieu|cap do|level|profile|nguoi choi|status|trang thai|ten)/.test(haystack)) {
    return 'profile';
  }

  // Fallback dựa trên tên item Minecraft để tránh đẩy dữ liệu vào sai cột.
  const name = normalizeSmallCaps(item.name || '');
  if (/(emerald|gold|amethyst|diamond|copper)/.test(name)) return 'economy';
  if (/(sword|axe|bow|skull|zombie|skeleton)/.test(name)) return 'combat';
  if (/(clock|pickaxe|brick|stone|block)/.test(name)) return 'play';
  return 'profile';
}

function statRowHtml(item) {
  const title = cleanMinecraftText(item.displayName || '') || formatItemDisplayName(item.name);
  const lore = filterStatLore(item.lore);
  const value = lore.length ? lore.join(' • ') : '—';
  const iconUrl = getItemIconUrl(item.name);
  return `
    <div class="row">
      <img class="icon" src="${iconUrl}" onerror="this.onerror=null;this.src='${SVG_QUESTION_MARK}'" alt="">
      <div class="info">
        <div class="label">${escapeHtml(title)}</div>
        <div class="value">${escapeHtml(value)}</div>
      </div>
    </div>`;
}

function defaultProfileRows(player, status) {
  return `
    <div class="row">
      <img class="icon" src="https://mc-heads.net/avatar/${encodeURIComponent(player)}/64" onerror="this.onerror=null;this.src='${SVG_QUESTION_MARK}'" alt="">
      <div class="info"><div class="label">Người chơi</div><div class="value">${escapeHtml(player)}</div></div>
    </div>
    <div class="row">
      <div class="icon" style="display:flex;align-items:center;justify-content:center;font-size:25px">●</div>
      <div class="info"><div class="label">Trạng thái</div><div class="value">${escapeHtml(status)}</div></div>
    </div>`;
}

async function renderStatsImage(player, items = []) {
  let templateContent = fs.readFileSync(STATS_TEMPLATE_PATH, 'utf8');

  const validItems = (items || []).filter(item => !isDecorationItemForRender(item));
  const groups = { profile: [], economy: [], play: [], combat: [] };

  for (const item of validItems) {
    groups[classifyStatItem(item)].push(item);
  }

  const statusText = groups.profile.some(item => {
    const text = normalizeSmallCaps([
      item.displayName || '',
      ...(item.lore || [])
    ].map(cleanMinecraftText).join(' '));
    return text.includes('online');
  }) ? 'Online' : 'Offline';

  const renderGroup = (key, emptyText) =>
    groups[key].length
      ? groups[key].map(statRowHtml).join('')
      : `<div class="empty">${emptyText}</div>`;

  const avatar = `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128`;
  const fallbackAvatar = `https://mc-heads.net/avatar/Steve/128`;

  const html = templateContent
    .replace('{{PLAYER}}', escapeHtml(player))
    .replace('{{STATUS}}', escapeHtml(statusText))
    .replace('{{AVATAR}}', avatar)
    .replace('{{FALLBACK_AVATAR}}', fallbackAvatar)
    .replace('{{PROFILE}}', groups.profile.length ? groups.profile.map(statRowHtml).join('') : defaultProfileRows(player, statusText))
    .replace('{{ECONOMY}}', renderGroup('economy', 'Chưa có dữ liệu kinh tế'))
    .replace('{{PLAY}}', renderGroup('play', 'Chưa có dữ liệu hoạt động'))
    .replace('{{COMBAT}}', renderGroup('combat', 'Chưa có dữ liệu chiến đấu'));

  return renderHtmlElement(html, '.stats-container', {
    width: 1510,
    height: 600
  });
}

async function renderBalanceImage(player, money) {
  let templateContent = fs.readFileSync(BALANCE_TEMPLATE_PATH, 'utf8');
  const avatar = `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128`;
  const fallbackAvatar = `https://mc-heads.net/avatar/Steve/128`;

  const html = templateContent
    .replace('{{PLAYER}}', escapeHtml(player))
    .replace('{{MONEY}}', escapeHtml(money))
    .replace('{{AVATAR}}', avatar)
    .replace('{{FALLBACK_AVATAR}}', fallbackAvatar);

  return renderHtmlElement(html, '.balance-card', {
    width: 760,
    height: 320
  });
}

async function renderHtmlElement(compiledHtml, selector, viewport = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: viewport.width || 800,
      height: viewport.height || 600,
      deviceScaleFactor: 2
    });

    await page.setContent(compiledHtml, {
      waitUntil: 'load',
      timeout: 30000
    });

    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map(img => new Promise(resolve => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        img.onload = finish;
        img.onerror = finish;
        if (img.complete) finish();
        setTimeout(finish, 5000);
      })));
    });

    const elementHandle = await page.$(selector);
    if (!elementHandle) {
      throw new Error(`Không tìm thấy container ${selector} trong HTML`);
    }

    return await elementHandle.screenshot({
      type: 'png',
      omitBackground: true
    });
  } finally {
    await page.close();
  }
}

function isDecorationItemForRender(item) {
  const nameLower = (item.name || '').toLowerCase();
  const displayName = cleanMinecraftText(item.displayName || '');
  if (nameLower.includes('glass_pane') || nameLower === 'air' || nameLower === 'barrier') return true;
  if (!displayName && (!item.lore || item.lore.length === 0)) return true;
  if ((!item.lore || item.lore.length === 0) && (nameLower.includes('pane') || nameLower.includes('stained'))) return true;
  return false;
}

const LEADERBOARD_TEMPLATE_PATH = path.join(__dirname, '../templates/leaderboardCard.html');

async function renderLeaderboardImage(name, entries = []) {
  const template = fs.readFileSync(LEADERBOARD_TEMPLATE_PATH, 'utf8');
  const rows = entries.slice(0, 10).map((entry, index) => {
    const player = escapeHtml(entry.player || 'Unknown');
    const value = escapeHtml(entry.value || 'N/A');
    const avatar = `https://mc-heads.net/avatar/${encodeURIComponent(entry.player || 'Steve')}/64`;
    return `
      <div class="lb-row">
        <div class="rank">#${index + 1}</div>
        <img class="avatar" src="${avatar}" onerror="this.onerror=null;this.src='https://mc-heads.net/avatar/Steve/64';" alt="">
        <div class="player">${player}</div>
        <div class="value">${value}</div>
      </div>`;
  }).join('');

  const html = template
    .replace('{{TITLE}}', escapeHtml(name))
    .replace('{{ROWS}}', rows || '<div class="empty">Không có dữ liệu</div>');

  return renderHtmlElement(html, '.leaderboard-card', {
    width: 1000,
    height: 760
  });
}

async function renderBountyImage(entries = []) {
  const template = fs.readFileSync(LEADERBOARD_TEMPLATE_PATH, 'utf8');
  const rows = entries.slice(0, 10).map((entry, index) => {
    const player = escapeHtml(entry.player || 'Unknown');
    const value = escapeHtml(entry.value || 'N/A');
    const avatar = `https://mc-heads.net/avatar/${encodeURIComponent(entry.player || 'Steve')}/64`;
    return `
      <div class="lb-row">
        <div class="rank">#${index + 1}</div>
        <img class="avatar" src="${avatar}" onerror="this.onerror=null;this.src='https://mc-heads.net/avatar/Steve/64';" alt="">
        <div class="player">${player}</div>
        <div class="value">${value}</div>
      </div>`;
  }).join('');

  const html = template
    .replace('{{TITLE}}', 'BOUNTY')
    .replace('{{ROWS}}', rows || '<div class="empty">Không có dữ liệu</div>');

  return renderHtmlElement(html, '.leaderboard-card', {
    width: 1000,
    height: 760
  });
}

module.exports = {
  renderTableImage,
  formatItemDisplayName,
  getItemIconUrl,
  formatMinecraftTextToHtml,
  renderStatsImage,
  renderBalanceImage,
  renderLeaderboardImage,
  renderBountyImage
};
