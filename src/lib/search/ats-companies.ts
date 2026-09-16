// Curated, versioned registry of companies that publish internships on a
// public (keyless) ATS API. Adding a company is one line here — the token is
// the URL segment of its careers page, e.g. job-boards.greenhouse.io/<token>,
// jobs.lever.co/<token>, jobs.ashbyhq.com/<token>. Verified reachable at the
// time of writing; a dead token simply yields no results.

export type AtsProvider = "greenhouse" | "lever" | "ashby";

export type AtsCompany = {
  name: string;
  provider: AtsProvider;
  token: string;
  sectors: string[];
  countries: string[];
};

export const ATS_COMPANIES: AtsCompany[] = [
  // Greenhouse
  { name: "GitLab", provider: "greenhouse", token: "gitlab", sectors: ["tech"], countries: ["Remote", "NL", "US"] },
  { name: "Stripe", provider: "greenhouse", token: "stripe", sectors: ["fintech"], countries: ["US", "UK", "FR", "SG"] },
  { name: "Datadog", provider: "greenhouse", token: "datadog", sectors: ["tech", "data"], countries: ["US", "FR", "UK"] },
  { name: "Figma", provider: "greenhouse", token: "figma", sectors: ["tech", "design"], countries: ["US", "UK", "FR"] },
  { name: "Reddit", provider: "greenhouse", token: "reddit", sectors: ["tech", "social"], countries: ["US", "UK", "NL"] },
  { name: "Robinhood", provider: "greenhouse", token: "robinhood", sectors: ["fintech"], countries: ["US", "UK"] },
  { name: "Coinbase", provider: "greenhouse", token: "coinbase", sectors: ["fintech", "crypto"], countries: ["US", "UK", "Remote"] },
  { name: "Airbnb", provider: "greenhouse", token: "airbnb", sectors: ["tech", "travel"], countries: ["US", "UK", "FR"] },
  { name: "Cloudflare", provider: "greenhouse", token: "cloudflare", sectors: ["tech", "infra"], countries: ["US", "UK", "DE", "Remote"] },
  { name: "Databricks", provider: "greenhouse", token: "databricks", sectors: ["tech", "data", "ai"], countries: ["US", "UK", "FR", "DE", "NL"] },
  { name: "Monzo", provider: "greenhouse", token: "monzo", sectors: ["fintech"], countries: ["UK"] },
  { name: "Wise", provider: "greenhouse", token: "wise", sectors: ["fintech"], countries: ["UK", "SG"] },
  // Lever
  { name: "Palantir", provider: "lever", token: "palantir", sectors: ["tech", "data", "defense"], countries: ["US", "UK", "FR", "DE"] },
  { name: "Spotify", provider: "lever", token: "spotify", sectors: ["tech", "media"], countries: ["SE", "UK", "DE", "US"] },
  { name: "Qonto", provider: "lever", token: "qonto", sectors: ["fintech"], countries: ["FR", "DE", "ES", "IT"] },
  { name: "Swile", provider: "lever", token: "swile", sectors: ["fintech"], countries: ["FR"] },
  { name: "Mistral AI", provider: "lever", token: "mistral", sectors: ["ai"], countries: ["FR", "UK", "US"] },
  // Ashby
  { name: "OpenAI", provider: "ashby", token: "openai", sectors: ["ai"], countries: ["US", "UK", "FR"] },
  { name: "Ramp", provider: "ashby", token: "ramp", sectors: ["fintech"], countries: ["US", "UK"] },
  { name: "Vanta", provider: "ashby", token: "vanta", sectors: ["tech", "security"], countries: ["US", "UK", "Remote"] },
  { name: "Linear", provider: "ashby", token: "linear", sectors: ["tech", "productivity"], countries: ["Remote", "US"] },
];
