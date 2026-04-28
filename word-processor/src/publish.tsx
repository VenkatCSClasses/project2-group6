import { useState, type FormEvent } from 'react';

export type SourceValue = unknown;

type PublishResult = {
	id: number;
	link: string;
	status: string;
};

export type PublishStatus = 'draft' | 'publish' | 'pending' | 'private';

export function normalizeSiteUrl(value: string): string {
	const trimmed = value.trim().replace(/\/$/, '');

	if (!trimmed) {
		return '';
	}

	try {
		const normalized = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);

		if (normalized.protocol === 'http:' && normalized.hostname !== 'localhost' && normalized.hostname !== '127.0.0.1') {
			normalized.protocol = 'https:';
		}

		normalized.pathname = '';
		normalized.search = '';
		normalized.hash = '';

		return normalized.origin;
	} catch {
		return trimmed;
	}
}

function extractTextFromSource(source: SourceValue): string {
	if (source == null) {
		return '';
	}

	if (typeof source === 'string') {
		return source;
	}

	if (Array.isArray(source)) {
		return source.map(extractTextFromSource).filter(Boolean).join('\n');
	}

	if (typeof source === 'object') {
		const record = source as Record<string, unknown>;

		if (typeof record.text === 'string') {
			return record.text;
		}

		if (Array.isArray(record.children)) {
			return record.children.map(extractTextFromSource).filter(Boolean).join('');
		}

		if (Array.isArray(record.value)) {
			return record.value.map(extractTextFromSource).filter(Boolean).join('\n');
		}

		return Object.values(record)
			.map(extractTextFromSource)
			.filter(Boolean)
			.join('\n');
	}

	return '';
}

export function deriveStoryFields(source: SourceValue): { title: string; content: string } {
	const plainText = extractTextFromSource(source)
		.replace(/\r\n/g, '\n')
		.trim();

	if (!plainText) {
		return { title: '', content: '' };
	}

	const [headline = '', ...rest] = plainText.split('\n');

	return {
		title: headline.trim(),
		content: rest.join('\n').trim(),
	};
}

export function getPublishDraftStorageKey(documentId: string): string {
	return `wp-publish-draft:${documentId}`;
}

type PublishToWordPressProps = {
	getSourceValue: () => SourceValue;
};

export default function PublishToWordPress({ getSourceValue }: PublishToWordPressProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [siteUrl, setSiteUrl] = useState('');
	const [username, setUsername] = useState('');
	const [appPassword, setAppPassword] = useState('');
	const [status, setStatus] = useState<PublishStatus>('publish');
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState<PublishResult | null>(null);

	function loadStoryFromEditor() {
		const derivedFields = deriveStoryFields(getSourceValue());
		setTitle(derivedFields.title);
		setContent(derivedFields.content);
	}

	function openForm() {
		loadStoryFromEditor();
		setError('');
		setResult(null);
		setStatus('publish');
		setIsOpen(true);
	}

	function closeForm() {
		setIsOpen(false);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError('');
		setResult(null);

		const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
		const activeUsername = username.trim();
		const activeAppPassword = appPassword.replace(/\s+/g, '');
		const story = deriveStoryFields(getSourceValue());
		const titleToPublish = story.title || title;
		const contentToPublish = story.content || content;

		if (!normalizedSiteUrl || !activeUsername || !activeAppPassword || !titleToPublish || !contentToPublish) {
			setError('Please fill out site URL, username, and app password.');
			return;
		}

		setIsSubmitting(true);

		try {
			const endpoint = `${normalizedSiteUrl}/wp-json/wp/v2/posts`;
			const credentials = btoa(`${activeUsername}:${activeAppPassword}`);

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${credentials}`,
				},
				body: JSON.stringify({
					title: titleToPublish,
					content: contentToPublish,
					status,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				const message =
					typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
						? (data as { message: string }).message
						: 'Failed to publish to WordPress.';
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
		<div style={{ marginTop: '1rem', width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
				<button
					type="button"
					onClick={isOpen ? closeForm : openForm}
					style={{
						border: '1px solid #0f172a',
						borderRadius: 999,
						background: isOpen ? '#0f172a' : '#ffffff',
						color: isOpen ? '#ffffff' : '#0f172a',
						padding: '0.45rem 0.8rem',
						fontSize: '0.8rem',
						fontWeight: 600,
						cursor: 'pointer',
					}}
				>
					{isOpen ? 'Close publish' : 'Publish'}
				</button>
			</div>

			{isOpen && (
				<form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
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
						WordPress Password
						<input
							type="password"
							value={appPassword}
							onChange={(event) => setAppPassword(event.target.value)}
							required
						/>
					</label>

					<label>
						Status
						<select value={status} onChange={(event) => setStatus(event.target.value as PublishStatus)}>
							<option value="draft">Draft</option>
							<option value="publish">Publish</option>
							<option value="pending">Pending</option>
							<option value="private">Private</option>
						</select>
					</label>

					<button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Publishing...' : 'Publish'}
					</button>

					{error && <p role="alert">{error}</p>}

					{result && (
						<p>
							Published: <a href={result.link} target="_blank" rel="noreferrer">{result.link}</a>
						</p>
					)}
				</form>
			)}
		</div>
	);
}
