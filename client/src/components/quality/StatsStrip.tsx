import React from 'react';
import { CallStats } from '../../lib/rtc';

interface Props {
  stats: CallStats;
}

export const StatsStrip: React.FC<Props> = ({ stats }) => (
  <div className="stats-strip">
    <span>
      Estado: <strong>{stats.connected ? (stats.viaRelay ? 'Conectados (TURN)' : 'Conectados P2P') : 'Esperando al otro…'}</strong>
    </span>
    <span>Ping: <strong>{stats.rttMs} ms</strong></span>
    <span>Pérdida: <strong>{stats.lossPct}%</strong></span>
    <span>Subida/Bajada llamada: <strong>{stats.outKbps} / {stats.inKbps} kbps</strong></span>
    <span>Tu cámara activa: <strong>{stats.activeVideoLabel} ({stats.resolution})</strong></span>
  </div>
);
