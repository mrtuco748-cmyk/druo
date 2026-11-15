// Despachador de mensajes WebSocket para sincronización, WebRTC y actividades
export function dispatchWsMessage({ m, me, room, send, broadcast, toOther }) {
  switch (m.t) {
    case 'signal':
      return toOther(me.id, { t: 'signal', from: me.id, session: me.session, data: m.data });
    case 'sync': {
      const playback = room.setPlayback(m.state, me.id, m.at);
      return toOther(me.id, { t: 'sync', playback, by: me.id, reason: m.reason || null });
    }
    case 'source':
      room.setSource(m.source, me.id);
      room.activity = 'cinema';
      return broadcast({ t: 'source', source: room.source, playback: room.playback, activity: 'cinema', by: me.id });
    case 'subs':
      room.subs = m.subs
        ? { name: String(m.subs.name || '').slice(0, 120), text: String(m.subs.text || ''), offset: Number(m.subs.offset) || 0 }
        : null;
      return broadcast({ t: 'subs', subs: room.subs, by: me.id });
    case 'cam':
      room.cams[me.id] = { zoom: Number(m.zoom) || 1, y: Number(m.y) || 0, on: m.on !== false, mic: m.mic !== false };
      return toOther(me.id, { t: 'cam', id: me.id, ...room.cams[me.id] });
    case 'buffering':
    case 'speaking':
    case 'cap':
    case 'react':
      return toOther(me.id, { ...m, from: me.id });
    case 'draw':
      if (m.action === 'commit' && m.stroke) room.addDrawStroke(m.stroke);
      else if (m.action === 'clear') room.clearDrawings();
      return toOther(me.id, { ...m, from: me.id });
    case 'activity':
      if (typeof m.activity === 'string') {
        room.activity = m.activity.slice(0, 32);
        return broadcast({ t: 'activity', activity: room.activity, by: me.id, name: me.name });
      }
      return;
    case 'studio':
      if (m.action === 'commit' && m.stroke) room.addStudioStroke(m.stroke);
      else if (m.action === 'remove' && m.id) room.removeStudioStroke(m.id);
      else if (m.action === 'replace' && Array.isArray(m.strokes)) room.studioStrokes = m.strokes.slice(-500);
      else if (m.action === 'bg' && typeof m.bg === 'string') room.studioBg = m.bg.slice(0, 32);
      else if (m.action === 'clear') room.clearStudioStrokes();
      return toOther(me.id, { ...m, from: me.id, name: me.name });
    case 'shared': {
      const sharedKey = typeof m.section === 'string' ? m.section : m.key;
      if (typeof sharedKey === 'string' && sharedKey.length <= 32) {
        room.sharedState[sharedKey] = m.data;
        return broadcast({
          t: 'shared',
          section: sharedKey,
          key: sharedKey,
          data: m.data,
          by: me.id,
          name: me.name,
        });
      }
      return;
    }
  }
}
