import React from 'react';
import { ActivityId } from '../CuteHub';
import {
  IconBrush, IconCinema, IconCoffee, IconGamepad, IconHeart,
  IconHome, IconMicOff, IconMicOn, IconSliders, IconSparkle,
  IconStar, IconWheel,
} from '../KawaiiIcons';

interface Props {
  activeActivity: ActivityId;
  wsOnline: boolean;
  hasOtherPeer: boolean;
  micOn: boolean;
  showMenu: boolean;
  onSelectActivity: (act: ActivityId) => void;
  onReact: (emoji: string) => void;
  onToggleMic: () => void;
  onToggleMenu: () => void;
}

const TABS: { id: ActivityId; render: () => React.ReactNode }[] = [
  { id: 'hub', render: () => <IconHome size={19} /> },
  { id: 'cinema', render: () => <IconCinema size={19} /> },
  { id: 'draw', render: () => <IconBrush size={19} /> },
  { id: 'games', render: () => <IconGamepad size={19} /> },
  { id: 'wheel', render: () => <IconWheel size={19} /> },
  { id: 'relax', render: () => <IconCoffee size={19} /> },
];

export const TopBar: React.FC<Props> = ({
  activeActivity, wsOnline, hasOtherPeer, micOn, showMenu,
  onSelectActivity, onReact, onToggleMic, onToggleMenu,
}) => (
  <header className="theater-topbar kawaii-topbar">
    <div className="brand-cluster">
      <div className="topbar-activity-tabs kawaii-nav-pills">
        {TABS.map((tab) => (
          <button
            key={tab.id} type="button"
            className={`topbar-act-btn ${activeActivity === tab.id ? 'active' : ''}`}
            onClick={() => onSelectActivity(tab.id)} aria-label={tab.id}
          >
            {tab.render()}
          </button>
        ))}
      </div>
      <span className={`kawaii-status-dot ${wsOnline ? (hasOtherPeer ? 'both' : 'wait') : 'off'}`} />
    </div>

    <div className="action-cluster">
      <div className="react-bar kawaii-react-bar">
        <button type="button" className="react-btn" onClick={() => onReact('♥')} aria-label="Heart"><IconHeart size={18} /></button>
        <button type="button" className="react-btn" onClick={() => onReact('✦')} aria-label="Sparkle"><IconSparkle size={18} /></button>
        <button type="button" className="react-btn" onClick={() => onReact('★')} aria-label="Star"><IconStar size={18} /></button>
      </div>
      <button type="button" className={`top-btn quick-mic-btn ${micOn ? '' : 'is-off'}`} onClick={onToggleMic} aria-label="Microphone">
        {micOn ? <IconMicOn size={19} /> : <IconMicOff size={19} />}
      </button>
      <button type="button" className={`top-btn menu-toggle-btn ${showMenu ? 'accent' : ''}`} onClick={onToggleMenu} aria-label="Menu">
        <IconSliders size={19} />
      </button>
    </div>
  </header>
);
