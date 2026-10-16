import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';
import { classify, youtubeId } from '../server/resolve.js';

test('Room asigna asientos izquierdo y derecho a los 2 participantes y rechaza un tercero', () => {
  let clock = 1000;
  const room = new Room({ now: () => clock });
  const ws1 = {};
  const ws2 = {};
  const ws3 = {};

  const a = room.join({ id: 'pc-1', session: 's1', name: 'Yo', seat: 'left', device: 'desktop' }, ws1);
  assert.equal(a.ok, true);
  assert.equal(a.peer.seat, 'left');

  // Aunque pida left, como está ocupado le asigna right automáticamente
  const b = room.join({ id: 'mov-1', session: 's2', name: 'Ella', seat: 'left', device: 'mobile' }, ws2);
  assert.equal(b.ok, true);
  assert.equal(b.peer.seat, 'right');

  const c = room.join({ id: 'extra', session: 's3', name: 'Intruso', seat: 'left' }, ws3);
  assert.equal(c.ok, false);
  assert.equal(c.reason, 'full');

  // Si 'pc-1' recarga la página con un nuevo ws, reemplaza su conexión sin bloquear la sala
  const ws1New = {};
  const re = room.join({ id: 'pc-1', session: 's1b', name: 'Yo', seat: 'left', device: 'desktop' }, ws1New);
  assert.equal(re.ok, true);
  assert.equal(re.replaced.ws, ws1);

  // Cerrar el ws viejo no borra al peer nuevo
  assert.equal(room.leave('pc-1', ws1), false);
  assert.equal(room.peers.size, 2);
});

test('Room sincroniza play/pausa/seek acotando timestamps', () => {
  let clock = 10_000;
  const room = new Room({ now: () => clock });
  const pb = room.setPlayback({ playing: true, position: 42.5 }, 'pc-1', 9_800);
  assert.equal(pb.playing, true);
  assert.equal(pb.position, 42.5);
  assert.equal(pb.updatedAt, 9_800);
});

test('classify reconoce YouTube, MediaFire, Google Drive, Dropbox y HLS', () => {
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(classify('https://www.youtube.com/watch?v=dQw4w9WgXcQ').kind, 'youtube');

  const mf = classify('https://www.mediafire.com/file/abc123/peli.mp4/file');
  assert.equal(mf.kind, 'file');
  assert.equal(mf.via, 'mediafire');
  assert.ok(mf.url.startsWith('/api/stream?link='));

  const dr = classify('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing');
  assert.equal(dr.via, 'drive');

  const db = classify('https://www.dropbox.com/s/xyz/video.mp4?dl=0');
  assert.equal(db.via, 'dropbox');
  assert.ok(db.url.includes('raw=1'));

  const hls = classify('https://cdn.example.com/live/master.m3u8');
  assert.equal(hls.kind, 'hls');
});

test('Room almacena y limpia trazos de dibujo en snapshot', () => {
  const room = new Room();
  assert.deepEqual(room.snapshot().drawings, []);

  room.addDrawStroke({ id: 's1', color: '#ffcf6b', width: 4, points: [{ x: 0.1, y: 0.1 }] });
  assert.equal(room.snapshot().drawings.length, 1);
  assert.equal(room.snapshot().drawings[0].id, 's1');

  room.clearDrawings();
  assert.equal(room.snapshot().drawings.length, 0);
});
