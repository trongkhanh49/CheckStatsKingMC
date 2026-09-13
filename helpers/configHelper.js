/**
 * helpers/configHelper.js - Quản lý cấu hình động cho Discord Bot (displayMode: 'text' | 'image')
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');

const defaultConfig = {
  displayMode: 'text', // mode chung cũ cho AH/Order
  balDisplayMode: 'text',
  statsDisplayMode: 'text'
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('[ConfigHelper] Lỗi khi đọc config.json:', err.message);
  }
  return { ...defaultConfig };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('[ConfigHelper] Lỗi khi ghi config.json:', err.message);
  }
}

let currentConfig = loadConfig();

module.exports = {
  getDisplayMode() {
    return currentConfig.displayMode || 'text';
  },
  getBalDisplayMode() {
    return currentConfig.balDisplayMode || 'text';
  },
  getStatsDisplayMode() {
    return currentConfig.statsDisplayMode || 'text';
  },
  setBalDisplayMode(mode) {
    if (mode === 'text' || mode === 'image') {
      currentConfig.balDisplayMode = mode;
      saveConfig(currentConfig);
    }
    return currentConfig.balDisplayMode;
  },
  setStatsDisplayMode(mode) {
    if (mode === 'text' || mode === 'image') {
      currentConfig.statsDisplayMode = mode;
      saveConfig(currentConfig);
    }
    return currentConfig.statsDisplayMode;
  },
  toggleBalDisplayMode() {
    currentConfig.balDisplayMode = currentConfig.balDisplayMode === 'image' ? 'text' : 'image';
    saveConfig(currentConfig);
    return currentConfig.balDisplayMode;
  },
  toggleStatsDisplayMode() {
    currentConfig.statsDisplayMode = currentConfig.statsDisplayMode === 'image' ? 'text' : 'image';
    saveConfig(currentConfig);
    return currentConfig.statsDisplayMode;
  },
  setBalanceStatsDisplayMode(mode) {
    if (mode === 'text' || mode === 'image') {
      currentConfig.balDisplayMode = mode;
      currentConfig.statsDisplayMode = mode;
      saveConfig(currentConfig);
    }
    return mode === 'image' ? 'image' : 'text';
  },
  toggleBalanceStatsDisplayMode() {
    const newMode = currentConfig.balDisplayMode === 'image' ? 'text' : 'image';
    currentConfig.balDisplayMode = newMode;
    currentConfig.statsDisplayMode = newMode;
    saveConfig(currentConfig);
    return newMode;
  },
  setDisplayMode(mode) {
    if (mode === 'text' || mode === 'image') {
      currentConfig.displayMode = mode;
      saveConfig(currentConfig);
    }
    return currentConfig.displayMode;
  },
  toggleDisplayMode() {
    currentConfig.displayMode = currentConfig.displayMode === 'image' ? 'text' : 'image';
    saveConfig(currentConfig);
    return currentConfig.displayMode;
  }
};
