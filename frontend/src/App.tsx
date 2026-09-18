import { NavLink, Route, Routes, BrowserRouter } from "react-router-dom";
import { ActivityPage } from "./features/activity/ActivityPage";
import { MemoryPage } from "./features/memory/MemoryPage";

/**
 * Purpose: Wire Memory and Activity screens into the local UI.
 * Does not: implement Queue, Settings key entry, or app chrome owned by other agents.
 */
export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="app-nav" aria-label="Primary">
          <strong>Jobhunt Copilot</strong>
          <NavLink to="/memory">04 Memory & profiles</NavLink>
          <NavLink to="/activity">05 Activity & logs</NavLink>
        </nav>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<MemoryPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
