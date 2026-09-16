#!/bin/bash
# Orbit video → 3D Gaussian splat, the whole recipe.
#
#   bash scripts/make-splat.sh "/path/to/orbit_loop.mp4" homestead 2026-09-10
#
# Run this once per capture that has orbit footage. It takes roughly half an hour on an
# Apple M-series machine, nearly all of it unattended, and the numbers below are what the
# first run actually measured on the September 2026 Homestead orbit.
#
# Prerequisites, installed once:
#   brew install ffmpeg colmap
#   Brush (the trainer) — Apple-silicon build, no Rust toolchain needed:
#     curl -L https://github.com/ArthurBrussee/brush/releases/download/v0.3.0/brush-app-aarch64-apple-darwin.tar.xz \
#       | tar -xJ -C .cache/brush
#
# Why these tools: standard 3DGS trainers (Inria, gsplat, Nerfstudio) are CUDA-only, so on
# a Mac the workable trainer is Brush, which runs on Metal through wgpu.
#
# A caveat worth repeating: one orbit at one altitude gives weak vertical parallax, so the
# middle of the plot resolves well while the edges grow spiky needles. Two or three orbits
# at different heights and tilts, plus a top-down grid, would fix that at the source and
# are worth asking the pilot for.
set -e
cd "$(dirname "$0")/.."

VIDEO="${1:?usage: make-splat.sh <video> <project-slug> <capture-date>}"
SLUG="${2:?}"
DATE="${3:?}"

FRAMES=96          # frames to solve against; matches the orbit scrubber's frame count
WORK=".cache/sfm-$SLUG-$DATE"
OUT="public/assets/$SLUG/$DATE/splat"
BRUSH=".cache/brush/brush-app-aarch64-apple-darwin/brush_app"

mkdir -p "$WORK/images" "$OUT" .cache/splat

# 1 — frames. Straight from the video at full width: the WebP frames the site ships are
# compressed far too hard for reliable feature matching.
DURATION=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")
ffmpeg -v error -y -i "$VIDEO" -vf "fps=$FRAMES/$DURATION,scale=1920:-2" -q:v 2 "$WORK/images/%03d.jpg"

# 2 — poses (~6 min). Every frame is matched against every other, which closes the loop
# where the orbit returns to its start. COLMAP's GPU paths are CUDA-only, hence use_gpu 0.
colmap feature_extractor --database_path "$WORK/db.db" --image_path "$WORK/images" \
  --ImageReader.single_camera 1 --ImageReader.camera_model SIMPLE_RADIAL \
  --FeatureExtraction.use_gpu 0 --FeatureExtraction.max_image_size 1600 \
  --SiftExtraction.max_num_features 8192
colmap exhaustive_matcher --database_path "$WORK/db.db" --FeatureMatching.use_gpu 0
mkdir -p "$WORK/sparse"
colmap mapper --database_path "$WORK/db.db" --image_path "$WORK/images" --output_path "$WORK/sparse"
colmap model_analyzer --path "$WORK/sparse/0"
# The gate: registered frames should be all of them, mean reprojection error near 1 px.
# September 2026 Homestead: 96/96 registered, 83,723 points, 1.13 px.

# 3 — train (~21 min for 12k steps on an M5). Exports at 4k/8k/12k steps; 8k was the sweet
# spot — 12k grew to 903k splats without looking better.
"$BRUSH" "$WORK" --total-steps 12000 --max-resolution 1280 --max-splats 1200000 \
  --export-path .cache/splat --export-every 4000 --export-name "splat_{iter}.ply"

# 4 — compress. A raw 8k-step PLY is 109 MB; as .ksplat with spherical harmonics dropped
# to degree 0 it is 11 MB, and the light build is 4.7 MB for phones. The converter is not
# in the npm package, so fetch it and point its three.js import at the real module:
UTIL=node_modules/@mkkellogg/gaussian-splats-3d/util/create-ksplat.js
if [ ! -f "$UTIL" ]; then
  mkdir -p "$(dirname "$UTIL")"
  curl -sL -o "$UTIL" https://raw.githubusercontent.com/mkkellogg/GaussianSplats3D/main/util/create-ksplat.js
  sed -i '' "s|from '../build/demo/lib/three.module.js'|from 'three'|" "$UTIL"
fi
node "$UTIL" .cache/splat/splat_08000.ply "$OUT/site.ksplat" 1 1 "0,0,0" 5.0 256 0
node "$UTIL" .cache/splat/splat_04000.ply "$OUT/site-light.ksplat" 1 1 "0,0,0" 5.0 256 0

# 5 — framing. A reconstruction has no idea which way is up or where the subject is, so the
# viewer is told: the centre comes from the points nearest the orbit's own centre (the
# median over all points is dragged away by distant buildings), and up is averaged from the
# cameras. Writes straight into src/data/assets.json.
node scripts/splat-scene.mjs "$WORK" "$SLUG" "$DATE"

echo "done → $OUT"
