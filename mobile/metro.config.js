const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for TypeScript files
config.resolver.sourceExts.push('cjs');

// Enable support for SVG files
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;