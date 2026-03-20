export interface GitHubUser {
	id: number;
	login: string;
	name: string | null;
	avatar_url: string;
	email: string | null;
}

export function buildGitHubAuthURL(state: string): string {
	const params = new URLSearchParams({
		client_id: process.env.GITHUB_CLIENT_ID!,
		redirect_uri: process.env.GITHUB_CALLBACK_URL!,
		scope: 'read:user user:email',
		state,
	});
	return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGitHubCode(code: string): Promise<string> {
	const res = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: process.env.GITHUB_CLIENT_ID,
			client_secret: process.env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: process.env.GITHUB_CALLBACK_URL,
		}),
	});
	if (!res.ok) throw new Error('GitHub token exchange failed');
	const data = await res.json();
	if (!data.access_token) throw new Error('No access token in GitHub response');
	return data.access_token;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
	const res = await fetch('https://api.github.com/user', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/vnd.github+json',
		},
	});
	if (!res.ok) throw new Error('GitHub user fetch failed');
	return res.json();
}

export async function fetchGitHubPrimaryEmail(accessToken: string): Promise<string | null> {
	const res = await fetch('https://api.github.com/user/emails', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/vnd.github+json',
		},
	});
	if (!res.ok) return null;
	const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await res.json();
	return emails.find((e) => e.primary && e.verified)?.email ?? null;
}
