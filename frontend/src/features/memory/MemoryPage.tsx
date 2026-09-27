import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes";
import { Banner } from "../../shared/ui/Banner";
import { SampleDataBanner } from "../../shared/ui/SampleDataBanner";
import { Segmented } from "../../shared/ui/Segmented";
import { ApplicationLedger } from "./ApplicationLedger";
import { CompaniesLedger } from "./CompaniesLedger";
import { VersionHistory } from "./VersionHistory";
import { loadLedger, type LedgerSnapshot } from "./ledger";
import { clearVersionLedger, readVersionLedger, type ProfileVersion } from "./versionLedger";
import "./memory.css";

/** The three ledgers, addressable by URL hash from the PROFILE menu. */
const SECTIONS = [
  { value: "applications", label: "Applications" },
  { value: "companies", label: "Companies" },
  { value: "versions", label: "Versions" },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

const EMPTY: LedgerSnapshot = {
  entries: [],
  companies: [],
  totals: {},
  salaryTruncated: false,
  usingMock: false,
};

/**
 * Purpose: Memory — the copilot's career ledger. What you applied to, which
 *          companies you already hit, and how your profile has changed.
 * Does not: edit the profile (that is Profiles), show run logs (that is
 *           Activity), or render CV bodies.
 */
export function MemoryPage() {
  const { hash } = useLocation();
  const [snapshot, setSnapshot] = useState<LedgerSnapshot>(EMPTY);
  const [versions, setVersions] = useState<ProfileVersion[]>([]);
  const [section, setSection] = useState<Section>("applications");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AppFly · Memory";
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLedger()
      .then((next) => {
        if (!cancelled) setSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not reach the local API. The ledger needs the copilot running.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    setVersions(readVersionLedger());
    return () => {
      cancelled = true;
    };
  }, []);

  // The PROFILE menu deep-links with #applications / #companies / #versions.
  useEffect(() => {
    const target = hash.slice(1) as Section;
    if (SECTIONS.some((entry) => entry.value === target)) setSection(target);
  }, [hash]);

  const onClearVersions = useCallback(() => {
    clearVersionLedger();
    setVersions([]);
  }, []);

  const applied = snapshot.totals.applied ?? 0;
  const approved = snapshot.totals.approved ?? 0;
  const total = Object.values(snapshot.totals).reduce((sum, count) => sum + count, 0);

  return (
    <div className="memory" aria-busy={loading || undefined}>
      {error ? (
        <Banner tone="warning" title="Ledger not loaded">
          {error}
        </Banner>
      ) : null}
      {snapshot.usingMock ? <SampleDataBanner noun="ledger" /> : null}

      <header className="memory__head">
        <div className="memory__stats">
          <Stat label="Jobs in vault" value={total} />
          <Stat label="Approved" value={approved} />
          <Stat label="Applied" value={applied} />
          <Stat label="Companies" value={snapshot.companies.length} />
        </div>
        <Segmented
          options={SECTIONS}
          value={section}
          onChange={setSection}
          ariaLabel="Memory section"
        />
      </header>

      {section === "applications" ? (
        <ApplicationLedger
          entries={snapshot.entries}
          salaryTruncated={snapshot.salaryTruncated}
        />
      ) : null}
      {section === "companies" ? <CompaniesLedger companies={snapshot.companies} /> : null}
      {section === "versions" ? (
        <VersionHistory versions={versions} onClear={onClearVersions} />
      ) : null}

      <p className="memory__crosslink">
        Editing who you hunt as lives in <Link to={ROUTES.profiles}>Profiles</Link>. Run logs
        live in <Link to={ROUTES.activity}>Activity</Link>.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="memory-stat">
      <span className="memory-stat__label">{label}</span>
      <span className="memory-stat__value">{value.toLocaleString()}</span>
    </div>
  );
}
