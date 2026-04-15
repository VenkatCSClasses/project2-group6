import { useState } from 'react';

type PublishStatus = 'draft' | 'publish' | 'pending' | 'private';

type PublishResult = {
	id: number;
	link: string;
	status: string;
};

function normalizeSiteUrl(value: string): string {
	return value.trim().replace(/\/$/, '');
}

export default function PublishToWordPress() {
	const [siteUrl, setSiteUrl] = useState('');
	const [username, setUsername] = useState('');
	const [appPassword, setAppPassword] = useState('');
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [excerpt, setExcerpt] = useState('');
	const [status, setStatus] = useState<PublishStatus>('draft');

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState<PublishResult | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError('');
		setResult(null);

		const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
		if (!normalizedSiteUrl || !username || !appPassword || !title || !content) {
			setError('Please fill out site URL, username, app password, title, and content.');
			return;
		}

		setIsSubmitting(true);

		try {
			const endpoint = `${normalizedSiteUrl}/wp-json/wp/v2/posts`;
			const credentials = btoa(`${username}:${appPassword}`);

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${credentials}`,
				},
				body: JSON.stringify({
					title,
					content,
					excerpt,
					status,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				const message = data?.message ?? 'Failed to publish to WordPress.';
				throw new Error(message);
			}

			setResult({
				id: data.id,
				link: data.link,
				status: data.status,
			});
		} catch (submitError) {
			const message = submitError instanceof Error ? submitError.message : 'Unexpected error while publishing.';
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<section style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
			<h2>Publish Story to WordPress</h2>
			<p>Use a WordPress Application Password for authentication.</p>

			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
				<label>
					Site URL
					<input
						type="url"
						placeholder="https://example.com"
						value={siteUrl}
						onChange={(event) => setSiteUrl(event.target.value)}
						required
					/>
				</label>

				<label>
					Username
					<input
						type="text"
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						required
					/>
				</label>

				<label>
					Application Password
					<input
						type="password"
						value={appPassword}
						onChange={(event) => setAppPassword(event.target.value)}
						required
					/>
				</label>

				<label>
					Title
					<input
						type="text"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						required
					/>
				</label>

				<label>
					Excerpt
					<textarea
						rows={3}
						value={excerpt}
						onChange={(event) => setExcerpt(event.target.value)}
					/>
				</label>

				<label>
					Content
					<textarea
						rows={10}
						value={content}
						onChange={(event) => setContent(event.target.value)}
						required
					/>
				</label>

				<label>
					Status
					<select
						value={status}
						onChange={(event) => setStatus(event.target.value as PublishStatus)}>
						<option value="draft">Draft</option>
						<option value="publish">Publish</option>
						<option value="pending">Pending Review</option>
						<option value="private">Private</option>
					</select>
				</label>

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Publishing...' : 'Publish Story'}
				</button>
			</form>

			{error && (
				<p role="alert" style={{ color: '#b42318', marginTop: '1rem' }}>
					{error}
				</p>
			)}

			{result && (
				<div style={{ marginTop: '1rem' }}>
					<p>Post sent successfully.</p>
					<p>Post ID: {result.id}</p>
					<p>Status: {result.status}</p>
					<p>
						Link:{' '}
						<a href={result.link} target="_blank" rel="noreferrer">
							{result.link}
						</a>
					</p>
				</div>
			)}
		</section>
	);
}
