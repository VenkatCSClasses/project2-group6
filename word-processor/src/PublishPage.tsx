import { useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  deriveStoryFields,
  getPublishDraftStorageKey,
  normalizeSiteUrl,
  type PublishStatus,
  type SourceValue,
} from "./publish";
import "./PublishPage.css";

type PublishResult = {
  id: number;
  link: string;
  status: string;
};

export default function PublishPage() {
  const { id } = useParams();
  const documentId = id ?? "";
  const navigate = useNavigate();
  const location = useLocation();

  const initialSource = useMemo<SourceValue>(() => {
    if (!documentId) {
      return "";
    }

    try {
      const key = getPublishDraftStorageKey(documentId);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : "";
    } catch {
      return "";
    }
  }, [documentId]);

  const story = useMemo(() => deriveStoryFields(initialSource), [initialSource]);

  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [status, setStatus] = useState<PublishStatus>("publish");
  const [title, setTitle] = useState(story.title);
  const [content, setContent] = useState(story.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  const returnPath = useMemo(() => {
    const from = new URLSearchParams(location.search).get("from")?.trim();
    if (from) {
      return from;
    }

    return documentId ? `/editor/${documentId}` : "/dashboard";
  }, [documentId, location.search]);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(returnPath);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
    const activeUsername = username.trim();
    const activeAppPassword = appPassword.replace(/\s+/g, "");

    if (!normalizedSiteUrl || !activeUsername || !activeAppPassword || !title.trim() || !content.trim()) {
      setError("Please fill out site URL, username, app password, title, and content.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = `${normalizedSiteUrl}/wp-json/wp/v2/posts`;
      const credentials = btoa(`${activeUsername}:${activeAppPassword}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          title,
          content,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof (data as { message?: unknown }).message === "string"
            ? (data as { message: string }).message
            : "Failed to publish to WordPress.";
        throw new Error(message);
      }

      setResult({
        id: data.id,
        link: data.link,
        status: data.status,
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unexpected error while publishing.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="publish-page">
      <section className="publish-hero">
        <div>
          <p className="publish-kicker">WordPress Publishing</p>
          <h1>Publish Your Document</h1>
          <p>
            Review your title and content, choose post status, and publish directly to your
            WordPress site.
          </p>
        </div>
        <button className="publish-back" onClick={handleBack} type="button">
          Back to editor
        </button>
      </section>

      <section className="publish-grid">
        <form className="publish-form" onSubmit={handleSubmit}>
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
            WordPress App Password
            <input
              type="password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              required
            />
          </label>

          <label>
            Post status
            <select value={status} onChange={(event) => setStatus(event.target.value as PublishStatus)}>
              <option value="draft">Draft</option>
              <option value="publish">Publish</option>
              <option value="pending">Pending Review</option>
              <option value="private">Private</option>
            </select>
          </label>

          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            Content
            <textarea value={content} onChange={(event) => setContent(event.target.value)} required />
          </label>

          <button className="publish-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing..." : "Publish to WordPress"}
          </button>

          {error ? <p className="publish-error">{error}</p> : null}
          {result ? (
            <p className="publish-success">
              Published as {result.status} with id {result.id}.{" "}
              <a href={result.link} target="_blank" rel="noreferrer">
                View post
              </a>
            </p>
          ) : null}
        </form>

        <aside className="publish-preview">
          <h2>Preview Snapshot</h2>
          <p className="preview-label">Document id</p>
          <p className="preview-code">{documentId || "Missing document id"}</p>
          <p className="preview-label">Draft title</p>
          <p>{title || "No title detected from the current draft."}</p>
          <p className="preview-label">Draft content</p>
          <p className="preview-content">{content || "No content available. Open publish from the toolbar to prefill draft content."}</p>
        </aside>
      </section>
    </main>
  );
}
