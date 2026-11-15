import React from 'react';
import { IconChevronLeft, IconChevronRight } from './KawaiiIcons';
import { StudioFabMenu } from './studio/StudioFabMenu';
import { StudioTopLeftNav } from './studio/StudioTopLeftNav';
import { resolveBgColor, StudioBg, StudioEvent, StudioPoint, StudioStroke, StudioTool } from './studio/types';
import { useStudioCanvasActions } from './studio/useStudioCanvasActions';
import { useStudioPointers } from './studio/useStudioPointers';
import { useStudioReceiver } from './studio/useStudioReceiver';
import { useStudioShortcuts } from './studio/useStudioShortcuts';
import { useStudioState } from './studio/useStudioState';
import { clientToWorldNorm, worldNormToScreenPct } from './studio/viewportRenderer';

export type { StudioBg, StudioEvent, StudioPoint, StudioStroke, StudioTool };

interface Props {
  myId?: string; myName: string; peerName?: string;
  initialStrokes: StudioStroke[]; initialBg: StudioBg;
  onEmitStudio: (ev: StudioEvent) => void;
  onRegisterStudioReceiver: (fn: (ev: StudioEvent) => void) => void;
  onSyncLocalState: (strokes: StudioStroke[], bg: StudioBg) => void;
  onBackToHub: () => void;
}

export const DrawingStudio: React.FC<Props> = ({
  myId, myName, peerName, initialStrokes, initialBg,
  onEmitStudio, onRegisterStudioReceiver, onSyncLocalState, onBackToHub,
}) => {
  const authorKey = myId || myName;
  const st = useStudioState(initialStrokes, initialBg);
  const toWorldNorm = (cx: number, cy: number) => clientToWorldNorm(st.viewCanvasRef.current, cx, cy, st.panRef.current, st.zoomRef.current);

  const actions = useStudioCanvasActions({ ...st, authorKey, myName, clientToWorldNorm: toWorldNorm, onSyncLocalState, onEmitStudio });

  useStudioShortcuts({
    ...st, rebuildWorldCanvas: actions.rebuildWorldCanvas, renderViewport: actions.renderViewport,
    onUndo: actions.handleUndoMine, onRedo: actions.handleRedoMine,
  });
  useStudioReceiver({
    ...st, peerName, updateCounters: actions.updateCounters,
    rebuildWorldCanvas: actions.rebuildWorldCanvas, renderViewport: actions.renderViewport, onRegisterStudioReceiver,
  });
  const pointers = useStudioPointers({
    ...st, authorKey, myName, clientToWorldNorm: toWorldNorm, renderViewport: actions.renderViewport,
    triggerBucketFill: actions.triggerBucketFill, commitStroke: actions.commitStroke, onEmitStudio,
  });

  const currentBgHex = resolveBgColor(st.bg);
  const cursorPos = st.remoteCursor ? worldNormToScreenPct(st.viewCanvasRef.current, st.remoteCursor.x, st.remoteCursor.y, st.panRef.current, st.zoomRef.current) : null;

  return (
    <main className="cinema-stage studio-stage">
      <div className="screen-bezel studio-bezel kawaii-clean-studio">
        <div className="studio-canvas-container">
          <canvas
            ref={st.viewCanvasRef} className={`studio-canvas tool-${st.tool}`}
            onPointerDown={pointers.handlePointerDown} onPointerMove={pointers.handlePointerMove}
            onPointerUp={pointers.handlePointerUp} onPointerCancel={pointers.handlePointerUp}
            onWheel={pointers.handleWheel} onContextMenu={(e) => e.preventDefault()}
            onPointerLeave={() => onEmitStudio({ t: 'studio', action: 'cursor', cursor: null })}
          />
          {st.remoteCursor && cursorPos && (
            <div className="studio-remote-cursor" style={{ left: cursorPos.left, top: cursorPos.top }}>
              <span className="rc-dot" style={{ background: st.remoteCursor.color }} />
            </div>
          )}
          <StudioTopLeftNav
            tool={st.tool} bg={st.bg} currentBgHex={currentBgHex} bgMenuOpen={st.bgMenuOpen}
            isViewMoved={st.pan.x !== 0 || st.pan.y !== 0 || st.zoom !== 1} onBackToHub={onBackToHub}
            onTogglePan={() => st.setTool((p) => (p === 'pan' ? 'pen' : 'pan'))}
            onToggleBgMenu={() => { st.setBgMenuOpen((o) => !o); st.setMenuOpen(false); }}
            onChangeBg={actions.handleChangeBg}
            onResetView={() => { st.panRef.current = { x: 0, y: 0 }; st.zoomRef.current = 1; st.setPan({ x: 0, y: 0 }); st.setZoom(1); actions.renderViewport(); }}
          />
          <div className="kawaii-floating-top-right">
            <div className="kawaii-undo-pill">
              <button type="button" className="kawaii-chevron-btn" onClick={actions.handleUndoMine} disabled={st.myUndoCount === 0} aria-label="Undo my stroke"><IconChevronLeft size={22} /></button>
              <button type="button" className="kawaii-chevron-btn" onClick={actions.handleRedoMine} disabled={st.myRedoCount === 0} aria-label="Redo my stroke"><IconChevronRight size={22} /></button>
            </div>
          </div>
          <StudioFabMenu
            menuOpen={st.menuOpen} tool={st.tool} color={st.color} size={st.size} bg={st.bg} currentBgHex={currentBgHex} filledShape={st.filledShape}
            onToggleMenu={() => { st.setMenuOpen((o) => !o); st.setBgMenuOpen(false); }} onSelectTool={st.setTool}
            onSelectColor={(c) => { st.setColor(c); if (st.tool === 'eraser' || st.tool === 'pan') st.setTool('pen'); }}
            onChangeSize={st.setSize} onChangeBg={actions.handleChangeBg} onToggleFill={() => st.setFilledShape((f) => !f)}
            onDownloadPng={actions.handleDownloadPng} onClearAll={actions.handleClearAll}
          />
        </div>
      </div>
    </main>
  );
};
