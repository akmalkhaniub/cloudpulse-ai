/**
 * Open a remediation pull request from a unified diff.
 * Without GITHUB_TOKEN this returns a dry-run payload and does not call GitHub.
 */
export interface PullRequestDraft {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  patch: string;
}

export interface PullRequestResult {
  mode: 'live' | 'dry-run';
  url: string | null;
  draft: PullRequestDraft;
}

export function buildRemediationDraft(patch: string, opts: Partial<PullRequestDraft> = {}): PullRequestDraft {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'local/cloudpulse-sample').split('/');
  return {
    owner: opts.owner || owner,
    repo: opts.repo || repo,
    title: opts.title || 'CloudPulse: remediate Well-Architected findings',
    body: opts.body || 'Automated patch from the local rule engine. Review before merge.\n\n```diff\n' + patch + '\n```',
    head: opts.head || 'cloudpulse/remediation',
    base: opts.base || 'main',
    patch
  };
}

export async function openRemediationPr(patch: string, fetchImpl: typeof fetch = fetch): Promise<PullRequestResult> {
  const draft = buildRemediationDraft(patch);
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { mode: 'dry-run', url: null, draft };

  const resp = await fetchImpl(`https://api.github.com/repos/${draft.owner}/${draft.repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: draft.title, head: draft.head, base: draft.base, body: draft.body })
  });
  const data = await resp.json().catch(() => ({})) as { html_url?: string; message?: string };
  if (!resp.ok) throw new Error(data.message || `GitHub PR failed (${resp.status})`);
  return { mode: 'live', url: data.html_url || null, draft };
}
