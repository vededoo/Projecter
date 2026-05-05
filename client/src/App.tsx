import React, { useState } from 'react';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ContactsPage } from './pages/ContactsPage';
import { CompetencyCentersPage } from './pages/CompetencyCentersPage';
import { RisksPage } from './pages/RisksPage';
import { MeetingsPage } from './pages/MeetingsPage';

type View = 'projects' | 'contacts' | 'ccs' | 'risks' | 'meetings';

const NAV: { key: View; label: string }[] = [
  { key: 'projects',  label: 'Projects' },
  { key: 'contacts',  label: 'Contacts' },
  { key: 'ccs',       label: 'Competency Centers' },
  { key: 'risks',     label: 'Risks' },
  { key: 'meetings',  label: 'Meetings' },
];

function App() {
  const [view, setView] = useState<View>('projects');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const renderMain = () => {
    if (view === 'projects' && selectedProject) {
      return <ProjectDetailPage id={selectedProject} onBack={() => setSelectedProject(null)} />;
    }
    switch (view) {
      case 'projects': return <ProjectsPage onSelect={setSelectedProject} />;
      case 'contacts': return <ContactsPage />;
      case 'ccs':      return <CompetencyCentersPage />;
      case 'risks':    return <RisksPage />;
      case 'meetings': return <MeetingsPage />;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>📋 Projecter</h1>
        <nav className="nav">
          {NAV.map(n => (
            <button
              key={n.key}
              className={view === n.key ? 'active' : ''}
              onClick={() => { setView(n.key); setSelectedProject(null); }}
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
