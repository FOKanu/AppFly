import type { JobRecord } from "./types";

/**
 * Sample queue used when GET /jobs is down.
 * Includes every status and source, plus a deny-listed listing that must not be fetched.
 */
export const MOCK_JOBS: JobRecord[] = [
  {
    source_id: "agentur-ref-88112",
    source: "agentur",
    title: "Staff Platform Engineer",
    company: "Nordlicht Systems",
    url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/agentur-ref-88112",
    location: "Hamburg (hybrid)",
    description:
      "Own CI, internal developer portals, and golden paths for 40 engineers. Python and TypeScript. Works council in place.",
    status: "draft",
    score: 0.86,
    letter_excerpt:
      "Subject: Staff Platform Engineer at Nordlicht Systems\n\nI build internal platforms that shorten the path from idea to production. At my last role I replaced a patchwork of Jenkins jobs with a paved-road pipeline that cut lead time by a third, and I would like to do the same for Nordlicht's 40 engineers.",
    crawl_allowed: true,
    lang: "en",
    salary: "€95k–€115k",
    posted: "2026-09-12",
  },
  {
    source_id: "inbox-clip-linkedin-4f2a",
    source: "inbox",
    title: "Engineering Manager, Search",
    company: "Atlas Search GmbH",
    url: "https://www.linkedin.com/jobs/view/1234567890",
    location: "Berlin",
    description:
      "Lead a search ranking team. Listing was clipped into _inbox/ after you opened it. Copilot must not HTTP-GET this URL.",
    status: "shortlist",
    score: 0.74,
    letter_excerpt: "",
    crawl_allowed: false,
    lang: "en",
    salary: "",
    posted: "2026-09-10",
  },
  {
    source_id: "rss-https://jobs.example.org/feed#42",
    source: "rss",
    title: "Backend Engineer (Rust)",
    company: "Kieferwerk",
    url: "https://jobs.example.org/backend-rust",
    location: "Munich",
    description: "Rewrite a billing worker in Rust. RSS ingest; listing host is not deny-listed.",
    status: "inbox",
    score: null,
    letter_excerpt: "",
    crawl_allowed: true,
    lang: "en",
    salary: "",
    posted: "2026-09-16",
  },
  {
    source_id: "apify-impressum-brightpath",
    source: "apify",
    title: "Principal SRE",
    company: "Brightpath Health",
    url: "https://careers.brightpath.example/impressum",
    location: "Remote (DE)",
    description:
      "Public career / Impressum page only. Apify must never be pointed at LinkedIn or Indeed.",
    status: "approved",
    score: 0.81,
    letter_excerpt:
      "Subject: Principal SRE — Brightpath Health\n\nYour Impressum lists a small SRE group running FHIR workloads on Kubernetes. I have spent the last four years on similar stacks and can start with an on-call and SLI review in the first month.",
    crawl_allowed: true,
    lang: "de",
    salary: "",
    posted: "2026-09-08",
  },
  {
    source_id: "agentur-ref-22091",
    source: "agentur",
    title: "Data Engineer",
    company: "Hafenstadt Analytics",
    url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/agentur-ref-22091",
    location: "Bremen",
    description: "Warehouse rebuild on dbt + BigQuery for a public-sector analytics team.",
    status: "applied",
    score: 0.69,
    letter_excerpt:
      "Subject: Data Engineer at Hafenstadt Analytics\n\nThank you for considering my application. I submitted it in my browser on 16 September.",
    crawl_allowed: true,
    lang: "de",
    salary: "€72k",
    posted: "2026-09-02",
  },
  {
    source_id: "inbox-clip-indeed-9aa0",
    source: "inbox",
    title: "Frontend Lead",
    company: "Glassline Studio",
    url: "https://de.indeed.com/viewjob?jk=deniedhost",
    location: "Cologne",
    description: "Inbox clip of an Indeed listing. Status skipped after a culture mismatch.",
    status: "skipped",
    score: 0.41,
    letter_excerpt: "",
    crawl_allowed: false,
    lang: "de",
    salary: "",
    posted: "2026-09-05",
  },
  {
    source_id: "agentur-ref-77401",
    source: "agentur",
    title: "ML Platform Engineer",
    company: "Elbwerk",
    url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/agentur-ref-77401",
    location: "Hamburg",
    description: "Feature store and model registry for a 12-person applied ML group.",
    status: "shortlist",
    score: 0.91,
    letter_excerpt: "",
    crawl_allowed: true,
    lang: "en",
    salary: "€90k–€110k",
    posted: "2026-09-14",
  },
];

/** Deep-enough copy so mock PATCH mutations do not leak across tests. */
export function cloneJob(job: JobRecord): JobRecord {
  return { ...job };
}
