export type SourceEntry = {
  inlineCitation: string;
  studio: string;
  volume: string;
  journal: string;
  year: string;
  publisher: string;
  type: string;
  id: string;
  url: string;
  author?: string;
  title: string;
  website: string;
  dateAccessed: string;
};

type BuildSourceEntryOptions = {
  id?: string;
  now?: Date;
};

function formatDate(now: Date) {
  return now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function guessWebsiteName(hostname: string) {
  const domainParts = hostname.replace(/^www\./, '').split('.');
  const rawSite = domainParts[domainParts.length - 2] || 'Source';

  return rawSite.charAt(0).toUpperCase() + rawSite.slice(1);
}

function guessTitleFromPath(pathname: string) {
  const pathParts = pathname.split('/').filter(Boolean);

  if (pathParts.length === 0) {
    return 'Untitled Page';
  }

  const lastPart = pathParts[pathParts.length - 1];
  const guessedTitle = decodeURIComponent(lastPart).replace(/[-_]/g, ' ');

  return guessedTitle.charAt(0).toUpperCase() + guessedTitle.slice(1);
}

export function buildSourceEntryFromUrl(
  url: string,
  options: BuildSourceEntryOptions = {},
): SourceEntry {
  let title = 'Untitled Page';
  let website = 'Unknown Source';

  try {
    const urlObject = new URL(url);
    website = guessWebsiteName(urlObject.hostname);
    title = guessTitleFromPath(urlObject.pathname);
  } catch {
    // Leave the defaults when the URL cannot be parsed.
  }

  return {
    id: options.id ?? Math.random().toString(36).slice(2, 11),
    url,
    title,
    website,
    author: '',
    dateAccessed: formatDate(options.now ?? new Date()),
    inlineCitation: '',
    studio: '',
    volume: '',
    journal: '',
    year: '',
    publisher: '',
    type: '',
  };
}

export function formatMlaCitation(source: SourceEntry): string {
  const authorPart = source.author ? `${source.author}. ` : '';
  const titlePart = source.type === 'book' ? `${source.title}. ` : `"${source.title}." `;
  const websitePart = source.website ? source.website : '';
  const publisherPart = source.publisher ? ` ${source.publisher}, ` : '';
  const yearPart = source.year ? ` ${source.year}. ` : '';
  const urlPart = source.url ? ` ${source.url}. ` : '';
  const accessPart = source.type === 'interview' ? 'Personal interview. ' : 'Accessed ';
  const inlineCitation = source.inlineCitation
    ? ` (${source.inlineCitation})`
    : source.author
      ? ` (${source.author.split(',')[0]}${source.year ? `, ${source.year}` : ''})`
      : ' (Author, Year)';

  return (
    `${authorPart}${titlePart}` +
    `${websitePart}${publisherPart}${yearPart}${urlPart}${accessPart}${source.dateAccessed}.${inlineCitation}`
  );
}