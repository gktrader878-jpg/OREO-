import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const width = 640;
const height = 360;
const fps = 30;
const durationSec = 30; // 30s seamless loop
const totalFrames = fps * durationSec;

const outputPaths = [
  path.resolve('./public/From Klickpin.com - Short gratitude lines for thoughtful sharing made to spark ideas in seconds for inner peace-pin-id-88172105195587185.mp4'),
  path.resolve('./public/oreo_hologram.mp4'),
  path.resolve('./src/assets/videos/oreo_hologram.mp4')
];

fs.mkdirSync('./public', { recursive: true });
fs.mkdirSync('./src/assets/videos', { recursive: true });

const targetFile = outputPaths[0];

const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-pix_fmt', 'rgb24',
  '-s', `${width}x${height}`,
  '-r', String(fps),
  '-i', '-',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  targetFile
]);

ffmpeg.stderr.on('data', (d) => {
  // console.log(d.toString());
});

ffmpeg.on('close', (code) => {
  console.log(`FFmpeg finished with code ${code}`);
  if (code === 0 && fs.existsSync(targetFile)) {
    for (let i = 1; i < outputPaths.length; i++) {
      fs.copyFileSync(targetFile, outputPaths[i]);
    }
    console.log('Video generated and copied to all locations successfully!');
  }
});

// Framebuffer
const buf = Buffer.alloc(width * height * 3);

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (Math.floor(y) * width + Math.floor(x)) * 3;
  buf[idx] = Math.max(buf[idx], r);
  buf[idx + 1] = Math.max(buf[idx + 1], g);
  buf[idx + 2] = Math.max(buf[idx + 2], b);
}

function drawCircle(cx, cy, radius, thickness, r, g, b, alpha = 1) {
  const minR = radius - thickness / 2;
  const maxR = radius + thickness / 2;
  const minX = Math.max(0, Math.floor(cx - maxR - 1));
  const maxX = Math.min(width - 1, Math.ceil(cx + maxR + 1));
  const minY = Math.max(0, Math.floor(cy - maxR - 1));
  const maxY = Math.min(height - 1, Math.ceil(cy + maxR + 1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= minR && dist <= maxR) {
        setPixel(x, y, r * alpha, g * alpha, b * alpha);
      }
    }
  }
}

function drawArc(cx, cy, radius, thickness, startAngle, endAngle, r, g, b) {
  const minR = radius - thickness / 2;
  const maxR = radius + thickness / 2;
  const minX = Math.max(0, Math.floor(cx - maxR - 1));
  const maxX = Math.min(width - 1, Math.ceil(cx + maxR + 1));
  const minY = Math.max(0, Math.floor(cy - maxR - 1));
  const maxY = Math.min(height - 1, Math.ceil(cy + maxR + 1));

  let s = startAngle % (Math.PI * 2);
  let e = endAngle % (Math.PI * 2);
  if (s < 0) s += Math.PI * 2;
  if (e < 0) e += Math.PI * 2;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= minR && dist <= maxR) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;
        const inArc = s <= e ? (angle >= s && angle <= e) : (angle >= s || angle <= e);
        if (inArc) {
          setPixel(x, y, r, g, b);
        }
      }
    }
  }
}

const cx = width / 2;
const cy = height / 2;

async function generateAll() {
  for (let frame = 0; frame < totalFrames; frame++) {
    buf.fill(0); // clear black
    const t = frame / fps;

    const rot1 = (t * 0.8) % (Math.PI * 2);
    const rot2 = (-t * 1.4) % (Math.PI * 2);
    const rot3 = (t * 0.5) % (Math.PI * 2);
    const rot4 = (-t * 2.0) % (Math.PI * 2);

    // 1. Outer subtle thin rings
    drawCircle(cx, cy, 162, 1, 80, 80, 80);
    drawCircle(cx, cy, 146, 1, 140, 140, 140);
    drawCircle(cx, cy, 138, 1, 60, 60, 60);

    // 2. Outer Compass Ticks
    for (let i = 0; i < 60; i++) {
      const a = rot3 * 0.2 + (i / 60) * Math.PI * 2;
      const isMaj = i % 5 === 0;
      const len = isMaj ? 8 : 4;
      const rInner = 146;
      const rOuter = 146 + len;
      for (let d = rInner; d <= rOuter; d += 0.8) {
        setPixel(cx + Math.cos(a) * d, cy + Math.sin(a) * d, isMaj ? 240 : 120, isMaj ? 240 : 120, isMaj ? 240 : 120);
      }
    }

    // 3. Thick Outer Segment Arc (CR-12 band)
    drawArc(cx, cy, 130, 10, rot1, rot1 + Math.PI * 0.9, 255, 255, 255);
    drawArc(cx, cy, 130, 3, rot1 + Math.PI * 1.1, rot1 + Math.PI * 1.8, 200, 200, 200);

    // 4. Equalizer Frequency Arc
    drawArc(cx, cy, 108, 6, rot2, rot2 + Math.PI * 0.65, 255, 255, 255);
    const eqBars = 22;
    for (let i = 0; i < eqBars; i++) {
      const a = rot2 + Math.PI * 0.75 + (i / eqBars) * Math.PI * 0.85;
      const barH = 3 + Math.abs(Math.sin(t * 5 + i * 0.4)) * 14;
      for (let r = 104; r <= 104 + barH; r += 0.8) {
        for (let wOff = -0.015; wOff <= 0.015; wOff += 0.008) {
          setPixel(cx + Math.cos(a + wOff) * r, cy + Math.sin(a + wOff) * r, 255, 255, 255);
        }
      }
    }

    // 5. Triangle Widget
    const triAngle = rot4 * 0.4;
    const triR = 86;
    const triX = cx + Math.cos(triAngle) * triR;
    const triY = cy + Math.sin(triAngle) * triR;
    drawCircle(triX, triY, 15, 2, 255, 255, 255);
    drawCircle(triX, triY, 6, 6, 255, 255, 255);

    // 6. Mid Tech Segment Ring (Radius 64)
    drawCircle(cx, cy, 64, 1.2, 160, 160, 160);
    drawArc(cx, cy, 64, 4.5, rot3, rot3 + Math.PI * 0.8, 255, 255, 255);

    // 7. Inner Core Reticle & Crosshair
    const pulse = Math.sin(t * 3) * 2;
    drawCircle(cx, cy, 38 + pulse, 2, 255, 255, 255);
    drawCircle(cx, cy, 26, 1, 140, 140, 140);
    drawCircle(cx, cy, 14, 14, 255, 255, 255);
    drawCircle(cx, cy, 6, 6, 0, 0, 0);
    drawCircle(cx, cy, 2, 2, 255, 255, 255);

    // Cross lines
    for (let d = 22; d <= 46; d += 0.8) {
      setPixel(cx + d, cy, 255, 255, 255);
      setPixel(cx - d, cy, 255, 255, 255);
      setPixel(cx, cy + d, 255, 255, 255);
      setPixel(cx, cy - d, 255, 255, 255);
    }

    // Dotted track (Radius 96)
    for (let i = 0; i < 16; i++) {
      const a = rot1 * 1.5 + (i / 16) * Math.PI * 2;
      const dotX = cx + Math.cos(a) * 96;
      const dotY = cy + Math.sin(a) * 96;
      drawCircle(dotX, dotY, 2, 2, 220, 220, 220);
    }

    const canWrite = ffmpeg.stdin.write(buf);
    if (!canWrite) {
      await new Promise(r => ffmpeg.stdin.once('drain', r));
    }
  }

  ffmpeg.stdin.end();
}

generateAll();
