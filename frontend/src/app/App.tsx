import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { ActivityPage } from "./pages/ActivityPage";
import { MemoryPage } from "./pages/MemoryPage";
import { QueuePage } from "./pages/QueuePage";
import { SettingsPage } from "./pages/SettingsPage";
import { TonightPage } from "./pages/TonightPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { ROUTES } from "../routes";

/**
 * Purpose: App providers and route table only.
 * Does not: own chrome layout or page business logic.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROUTES.root} element={<Navigate to={ROUTES.tonight} replace />} />
          <Route path={ROUTES.tonight} element={<TonightPage />} />
          <Route path={ROUTES.queue} element={<QueuePage />} />
          <Route path={ROUTES.workflow} element={<WorkflowPage />} />
          <Route path={ROUTES.memory} element={<MemoryPage />} />
          <Route path={ROUTES.activity} element={<ActivityPage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
