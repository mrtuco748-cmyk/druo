import React, { useRef, useState } from 'react';
import { fmtTime } from './types';

interface Props {
  duration: number;
  displayPos: number;
  bufferedPct: number;
  isScrubbing: boolean;
  setIsScrubbing: (b: boolean) => void;
  setScrubPos: (pos: number) => void;
  scrubPos: number;
  onSeekTo: (pos: number) => void;
}

export const CinemaTimeline: React.FC<Props> = ({
  duration, displayPos, bufferedPct, isScrubbing,
  setIsScrubbing, setScrubPos, scrubPos, onSeekTo,
}) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const calcRatio = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return null;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return { target: ratio * duration, x: Math.max(0, Math.min(rect.width, clientX - rect.left)) };
  };

  const handleDown = (e: React.PointerEvent) => {
    const res = calcRatio(e.clientX);
    if (!res) return;
    setIsScrubbing(true); setScrubPos(res.target);
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };

  const handleMove = (e: React.PointerEvent) => {
    const res = calcRatio(e.clientX);
    if (!res) return;
    setHoverX(res.x); setHoverPos(res.target);
    if (isScrubbing) setScrubPos(res.target);
  };

  const handleUp = (e: React.PointerEvent) => {
    if (isScrubbing) { onSeekTo(scrubPos); setTimeout(() => setIsScrubbing(false), 200); }
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const progressPct = duration > 0 ? (displayPos / duration) * 100 : 0;

  return (
    <div
      ref={timelineRef}
      className={`ctrl-timeline-wrap ${isScrubbing ? 'is-scrubbing' : ''}`}
      onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp}
      onPointerCancel={handleUp} onPointerLeave={() => { if (!isScrubbing) setHoverPos(null); }}
      role="slider" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={displayPos} tabIndex={0}
    >
      <div className="ctrl-timeline-track">
        <div className="ctrl-timeline-buffer" style={{ width: `${bufferedPct}%` }} />
        <div className="ctrl-timeline-progress" style={{ width: `${progressPct}%` }} />
        <div className="ctrl-timeline-thumb" style={{ left: `${progressPct}%` }} />
      </div>
      {hoverPos !== null && duration > 0 && (
        <div className="ctrl-time-bubble" style={{ left: `${hoverX}px` }}>{fmtTime(hoverPos)}</div>
      )}
    </div>
  );
};
