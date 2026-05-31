import React, { useState } from 'react';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ContactsPage } from './pages/ContactsPage';
import { OrgUnitsPage } from './pages/OrgUnitsPage';
import { RisksPage } from './pages/RisksPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { SourcesPage } from './pages/SourcesPage';
import { RolesPage } from './pages/RolesPage';

type View = 'projects' | 'contacts' | 'org' | 'risks' | 'meetings' | 'sources' | 'params-roles';

const NAV_MAIN: { key: View; label: string }[] = [
  { key: 'projects',  label: 'Projects' },
  { key: 'contacts',  label: 'Contacts' },
  { key: 'org',       label: 'Organization' },
  { key: 'risks',     label: 'Risks' },
  { key: 'meetings',  label: 'Meetings' },
  { key: 'sources',   label: 'Sources' },
];

const NAV_PARAMS: { key: View; label: string }[] = [
  { key: 'params-roles', label: 'Roles' },
];

// Icône Tune (Material Design) en SVG inline
const TuneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 6 }}>
    <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
  </svg>
);

function App() {
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.replace('#', '') as View;
    return [...NAV_MAIN, ...NAV_PARAMS].some(n => n.key === hash) ? hash : 'projects';
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [pendingMeeting, setPendingMeeting] = useState<string | undefined>();

  const goToMeeting = (meetingId: string) => {
    setPendingMeeting(meetingId);
    setView('meetings');
    setSelectedProject(null);
    window.location.hash = 'meetings';
  };

  const renderMain = () => {
    if (view === 'projects' && selectedProject) {
      return <ProjectDetailPage id={selectedProject} onBack={() => setSelectedProject(null)} onGoToMeeting={goToMeeting} />;
    }
    switch (view) {
      case 'projects': return <ProjectsPage onSelect={setSelectedProject} />;
      case 'contacts': return <ContactsPage />;
      case 'org':      return <OrgUnitsPage />;
      case 'risks':    return <RisksPage />;
      case 'meetings': return <MeetingsPage initialSelectedId={pendingMeeting} />;
      case 'sources':  return <SourcesPage />;
      case 'params-roles': return <RolesPage />;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>📋 Projecter</h1>
        <nav className="nav">
          {NAV_MAIN.map(n => (
            <button
              key={n.key}
              className={view === n.key ? 'active' : ''}
              onClick={() => { setView(n.key); setSelectedProject(null); window.location.hash = n.key; }}
            >
              {n.label}
            </button>
          ))}

          {/* ── Parameters section ─────────────────────────────────────────── */}
          <div style={{ margin: '16px 0 4px', padding: '0 10px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            <TuneIcon />Parameters
          </div>
          {NAV_PARAMS.map(n => (
            <button
              key={n.key}
              className={view === n.key ? 'active' : ''}
              onClick={() => { setView(n.key); setSelectedProject(null); window.location.hash = n.key; }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <p className="muted" style={{ marginTop: 24, fontSize: 11 }}>
          DEV · :3054 · server :5054
        </p>
      </aside>
      <main className="main">{renderMain()}</main>
    </div>
  );
}

export default App;
