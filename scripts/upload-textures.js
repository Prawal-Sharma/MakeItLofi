const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// Set the token
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_UUBYHKv6YCz24k7P_ArnCAFH7qWSXozWozRBTUCpBll84LR';

async function uploadTextures() {
  const textureDir = path.join(process.cwd(), 'public/audio/textures');
  const textures = ['vinyl_crackle.wav', 'tape_hiss.wav', 'rain_ambient.wav'];
  
  const urls = {};
  
  for (const texture of textures) {
    const filePath = path.join(textureDir, texture);
    const buffer = fs.readFileSync(filePath);
    
    console.log(`Uploading ${texture}...`);
    
    const blob = await put(`textures/${texture}`, buffer, {
      access: 'public',
      addRandomSuffix: false,
    });
    
    urls[texture] = blob.url;
    console.log(`Uploaded ${texture} to: ${blob.url}`);
  }
  
  console.log('\nAdd these to your environment variables:');
  console.log(`TEXTURE_VINYL_URL=${urls['vinyl_crackle.wav']}`);
  console.log(`TEXTURE_TAPE_URL=${urls['tape_hiss.wav']}`);
  console.log(`TEXTURE_RAIN_URL=${urls['rain_ambient.wav']}`);
}

uploadTextures().catch(console.error);