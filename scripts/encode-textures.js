#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Encoding texture files to base64...');

// Read texture files
const textureDir = path.join(__dirname, '../public/audio/textures');
const outputPath = path.join(__dirname, '../lib/audio/textures.ts');

try {
  const vinylBuffer = fs.readFileSync(path.join(textureDir, 'vinyl_crackle.wav'));
  const tapeBuffer = fs.readFileSync(path.join(textureDir, 'tape_hiss.wav'));
  const rainBuffer = fs.readFileSync(path.join(textureDir, 'rain_ambient.wav'));

  console.log('Texture sizes:');
  console.log(`- Vinyl: ${(vinylBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Tape: ${(tapeBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Rain: ${(rainBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Generate TypeScript file with embedded base64 data
  const output = `// Auto-generated texture data - DO NOT EDIT
// Generated on ${new Date().toISOString()}

// Texture audio files embedded as base64 for production deployment
// These are decoded and written to /tmp at runtime in production

export const TEXTURE_DATA = {
  vinyl: '${vinylBuffer.toString('base64')}',
  tape: '${tapeBuffer.toString('base64')}',
  rain: '${rainBuffer.toString('base64')}'
};

// Helper function to get textures as Buffers
export function getTextureBuffers() {
  return {
    vinyl: Buffer.from(TEXTURE_DATA.vinyl, 'base64'),
    tape: Buffer.from(TEXTURE_DATA.tape, 'base64'),
    rain: Buffer.from(TEXTURE_DATA.rain, 'base64')
  };
}
`;

  fs.writeFileSync(outputPath, output);
  console.log(`✅ Successfully generated ${outputPath}`);
  
  const stats = fs.statSync(outputPath);
  console.log(`Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

} catch (error) {
  console.error('❌ Error encoding textures:', error);
  process.exit(1);
}