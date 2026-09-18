import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/layout/AppShell";
import { ROUTES } from "./routes";
import { ActivityPage } from "./features/activity/ActivityPage";
import { MemoryPage } from "./features/memory/MemoryPage";
import { QueuePage } from "./features/queue/QueuePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TonightPage } from "./features/tonight/TonightPage";
import { WorkflowPage } from "./features/workflow/WorkflowPage";

/**
 * Purpose: Route table for the instrument-panel shell.
 * Inputs: None.
 * Returns: BrowserRouter wrapping AppShell and feature placeholders.
 * Does not: Implement Queue/Packet/Settings screens or call connector APIs from here.
 */
export default function App() {
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
