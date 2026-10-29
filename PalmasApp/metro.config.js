const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * palmas-backend/ يقع خارج مجلد التطبيق، ويشاركه الموقعُ نفسه.
 * إضافته هنا تجعل Metro يقرأ منه مباشرة بدل الاحتفاظ بنسخة مكرّرة داخل التطبيق
 * — نسخة واحدة تعني أن الموقع والتطبيق لا يمكن أن يختلفا.
 */
const shared = path.resolve(__dirname, '..', 'palmas-backend');

config.watchFolders = [...(config.watchFolders || []), shared];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  ...(config.resolver.nodeModulesPaths || []),
];

module.exports = config;
