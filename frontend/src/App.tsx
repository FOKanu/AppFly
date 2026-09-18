import { NavLink, Route, Routes } from "react-router-dom";
import { TonightPage, WorkflowPage } from "./routes";

/**
 * Minimal review shell: Tonight (home) and Workflow (pipeline).
 * Foundation/shell owners may replace this chrome; keep the two feature imports.
 */
export function App() {
  return (
    <div className="shell">
      <header className="shell-mast">
        <p className="shell-brand">
          <span className="shell-glyph" aria-hidden="true" />
          AppFly
          <span className="shell-sub">Jobhunt Copilot</span>
        </p>
        <nav className="shell-nav" aria-label="Primary">
          <NavLink to="/" end>
            Tonight
          </NavLink>
          <NavLink to="/workflow">Workflow</NavLink>
        </nav>
        <p className="shell-canvas">Desktop 1440 · instrument panel</p>
      </header>
      <Routes>
        <Route path="/" element={<TonightPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
      </Routes>
    </div>
  );
}
