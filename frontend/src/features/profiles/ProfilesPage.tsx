import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import { Banner } from "../../shared/ui/Banner";
import { Toast, useToast } from "../../shared/ui/Toast";
import { copyToClipboard } from "../../app/layout/AppShell";
import { recordProfileSnapshot } from "../memory/versionLedger";
import { fetchSettings, profileFromSettings, saveProfile, saveSources } from "./api";
import { ProfileDocuments, documentsFor } from "./ProfileDocuments";
import { ProfileList } from "./ProfileList";
import { ProfileRequirements } from "./ProfileRequirements";
import { ProfileSettings, type ProfileSettingsValue } from "./ProfileSettings";
import type { HuntProfile } from "./types";
import "./profiles.css";

const EMPTY_FORM: ProfileSettingsValue = {
  roleTitles: [],
  location: "",
  seniority: "senior",
  salaryFloor: null,
  workMode: "hybrid",
};

/**
 * Purpose: Profiles — who you hunt as. Role titles, location, the documents the
 *          writer reads, and the sources the scout may use.
 * Does not: hold the application ledger; that is Memory. Does not render CV
 *           bodies — paths and presence only.
 */
export function ProfilesPage() {
  const { profileId } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [profiles, setProfiles] = useState<HuntProfile[]>([]);
  const [form, setForm] = useState<ProfileSettingsValue>(EMPTY_FORM);
  const [saved, setSaved] = useState<ProfileSettingsValue>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSources, setSavingSources] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AppFly · Profiles";
  }, []);

  const load = useCallback(async () => {
    try {
      const settings = await fetchSettings();
      const profile = profileFromSettings(settings);
      const next: ProfileSettingsValue = {
        ...EMPTY_FORM,
        roleTitles: profile.roleTitles,
        location: profile.location,
      };
      setProfiles([profile]);
      setForm(next);
      setSaved(next);
      setError(null);
    } catch {
      setError("Could not reach the local API. Start the copilot to edit your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Jump to the section named in the URL hash (#edit, #requirements, #documents).
  useEffect(() => {
    if (!hash || loading) return;
    const target = document.getElementById(hash.slice(1));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, loading]);

  const active =
    profiles.find((profile) => profile.id === profileId) ?? profiles[0] ?? null;

  const dirty = useMemo(
    () =>
      JSON.stringify(form.roleTitles) !== JSON.stringify(saved.roleTitles) ||
      form.location !== saved.location,
    [form, saved],
  );

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const settings = await saveProfile({
        keywords: form.roleTitles,
        location: form.location,
      });
      const profile = profileFromSettings(settings);
      setProfiles([profile]);
      const next: ProfileSettingsValue = {
        ...form,
        roleTitles: profile.roleTitles,
        location: profile.location,
      };
      setForm(next);
      setSaved(next);
      recordProfileSnapshot(profile, "saved");
      toast.show("Preset saved to config.yaml.");
    } catch {
      toast.show("Save failed — the local API rejected the change.");
    } finally {
      setSaving(false);
    }
  }, [form, toast]);

  const onToggleSource = useCallback(
    async (key: "agentur" | "inbox", next: boolean) => {
      setSavingSources(true);
      try {
        const settings = await saveSources({ [key]: next });
        const profile = profileFromSettings(settings);
        setProfiles([profile]);
        recordProfileSnapshot(profile, "saved");
        toast.show(`${key === "agentur" ? "Arbeitsagentur API" : "_inbox clips"} ${next ? "on" : "off"}.`);
      } catch {
        toast.show("Could not save the source toggle.");
      } finally {
        setSavingSources(false);
      }
    },
    [toast],
  );

  const onCopyPath = useCallback(
    (path: string) => {
      void copyToClipboard(path).then((copied) =>
        toast.show(copied ? `Copied — ${path}` : path),
      );
    },
    [toast],
  );

  return (
    <div className="profiles" aria-busy={loading || undefined}>
      {error ? (
        <Banner tone="warning" title="Profile not loaded">
          {error}
        </Banner>
      ) : null}

      <div className="profiles__columns">
        <div className="profiles__col">
          <ProfileList
            profiles={profiles}
            activeId={active?.id ?? null}
            onSelect={(id) => navigate(`${ROUTES.profiles}/${id}`)}
          />
          {active ? (
            <ProfileRequirements
              profile={active}
              onToggleSource={(key, next) => void onToggleSource(key, next)}
              savingSources={savingSources}
            />
          ) : null}
        </div>

        <div className="profiles__col">
          <ProfileSettings
            value={form}
            onChange={setForm}
            saving={saving}
            dirty={dirty}
            onSave={() => void onSave()}
            onRevert={() => setForm(saved)}
          />
          {active ? (
            <ProfileDocuments
              documents={documentsFor(active.health)}
              vaultPath={active.vaultPath}
              onCopyPath={onCopyPath}
            />
          ) : null}
          <p className="profiles__crosslink">
            Looking for what the copilot has already done?{" "}
            <Link to={`${ROUTES.memory}#applications`}>Open the application ledger</Link>.
          </p>
        </div>
      </div>

      <Toast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
