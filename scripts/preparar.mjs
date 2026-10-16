// Convierte cualquier video (.mkv, .mp4, .avi) con el ffmpeg de la PC a 2 versiones MP4 (faststart):
// - 360p (~320 kbps): liviana, arranca al instante incluso con mal internet
// - 720p (~1.2 Mbps): HD nítida
// Uso: npm run preparar -- "C:\ruta\a\pelicula.mkv" "Nombre de la peli"

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.log('Uso: npm run preparar -- "C:\\ruta\\pelicula.mkv" "Título opcional"');
  process.exit(1);
}

const title = (process.argv[3] || path.basename(input, path.extname(input))).replace(/[\\/:*?"<>|]/g, '').trim();
const outDir = path.resolve('convertidos', title);
fs.mkdirSync(outDir, { recursive: true });

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: 'inherit' });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg salió con ${code}`))));
  });
}

const targets = [
  {
    name: '360p',
    file: path.join(outDir, `${title}-360p.mp4`),
    vf: 'scale=-2:360',
    vb: '320k',
    maxrate: '420k',
    bufsize: '840k',
    ab: '64k',
  },
  {
    name: '720p',
    file: path.join(outDir, `${title}-720p.mp4`),
    vf: 'scale=-2:720',
    vb: '1150k',
    maxrate: '1500k',
    bufsize: '3000k',
    ab: '96k',
  },
];

for (const t of targets) {
  console.log(`\n🎬 Generando versión ${t.name} -> ${t.file}`);
  await runFfmpeg([
    '-y',
    '-i',
    input,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-vf',
    t.vf,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-b:v',
    t.vb,
    '-maxrate',
    t.maxrate,
    '-bufsize',
    t.bufsize,
    '-c:a',
    'aac',
    '-ac',
    '2',
    '-b:a',
    t.ab,
    '-movflags',
    '+faststart',
    t.file,
  ]);
}

console.log(`\n✅ Listo en: ${outDir}`);
console.log('Ya podés subir ambas versiones desde el botón "🎬 Película" en Druo con el mismo nombre.');
