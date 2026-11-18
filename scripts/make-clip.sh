#!/usr/bin/env bash
# Turns a phone video into a small looping clip for the sign library.
# Usage: scripts/make-clip.sh path/to/video.mov j
#   -> public/signs/j-motion.mp4  (the real motion, looped, muted)
#   -> public/signs/j.jpg         (a still photo, used when paused)
# Needs ffmpeg:  brew install ffmpeg
set -euo pipefail
in="$1"; letter="$(echo "$2" | tr 'A-Z' 'a-z')"
out=public/signs
ffmpeg -y -i "$in" -t 4 -an -vf "scale=480:-2,fps=24" -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart "$out/${letter}-motion.mp4"
ffmpeg -y -ss 0.2 -i "$in" -frames:v 1 -vf "scale=480:-2" -q:v 3 "$out/${letter}.jpg"
echo "Made $out/${letter}-motion.mp4 and $out/${letter}.jpg"
echo "Now add to sign-${letter} in src/Shared/Components/Signs/Library/signLibrary.json:"
echo "  \"clip\": \"/signs/${letter}-motion.mp4\", \"still\": \"/signs/${letter}.jpg\""
