#!/bin/bash

# Create FFmpeg layer for Lambda

mkdir -p /tmp/ffmpeg-layer/bin
cd /tmp/ffmpeg-layer

# Download static FFmpeg build for Lambda (Amazon Linux 2)
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
mv ffmpeg-*/ffmpeg bin/
mv ffmpeg-*/ffprobe bin/
chmod +x bin/*

# Create layer zip
zip -r ffmpeg-layer.zip bin

echo "FFmpeg layer created at /tmp/ffmpeg-layer/ffmpeg-layer.zip"
echo "Now upload it to AWS Lambda as a layer"