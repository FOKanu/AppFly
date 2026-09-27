import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/layout/AppShell";
import { ROUTES } from "./routes";
import { ActivityPage } from "./features/activity/ActivityPage";
import { MemoryPage } from "./features/memory/MemoryPage";
import { ProfilesPage } from "./features/profiles/ProfilesPage";
import { VaultPage } from "./features/vault/VaultPage";
import { PacketPage } from "./features/packet/PacketPage";
import { QueuePage } from "./features/queue/QueuePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SetupGate } from "./features/setup/SetupGate";
import { SetupPage } from "./features/setup/SetupPage";
import { TonightPage } from "./features/tonight/TonightPage";
import { WorkflowPage } from "./features/workflow/WorkflowPage";

/**
 * Purpose: Route table for the instrument-panel shell.
 * Inputs: None.
 * Returns: BrowserRouter wrapping AppShell and feature pages.
 * Does not: Call connector APIs from the router.
 */
export default function App() {
  return (
    <BrowserRouter>
      <SetupGate>
        <Routes>
          <Route path={ROUTES.setup} element={<SetupPage />} />
          <Route element={<AppShell />}>
            <Route path={ROUTES.root} element={<Navigate to={ROUTES.tonight} replace />} />
            <Route path={ROUTES.tonight} element={<TonightPage />} />
            <Route path={ROUTES.queue} element={<QueuePage />} />
            <Route path={`${ROUTES.queue}/:sourceId`} element={<QueuePage />} />
            <Route path="/packet/:sourceId" element={<PacketPage />} />
            <Route path={ROUTES.workflow} element={<WorkflowPage />} />
            <Route path={ROUTES.vault} element={<VaultPage />} />
            <Route path={ROUTES.profiles} element={<ProfilesPage />} />
            <Route path={`${ROUTES.profiles}/:profileId`} element={<ProfilesPage />} />
            <Route path={ROUTES.memory} element={<MemoryPage />} />
            <Route path={ROUTES.activity} element={<ActivityPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
          </Route>
        </Routes>
      </SetupGate>
    </BrowserRouter>
  );
}
