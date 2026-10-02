/**
 * ChurchSettings.tsx
 * -----------------------------------------------------------------------------
 * Admin screen covering Organization settings, Communication management
 * (announcements), and Media management (sermons, videos, photos,
 * documents, resources) — plus a danger zone for archiving/deleting the
 * organization. Communication and Media have no dedicated *Api.ts module in
 * the fixed file list, so this screen calls the shared churchGet/churchPost/
 * churchPatch/churchDelete helpers from churchApi.ts directly.
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { churchDelete, churchGet, churchPatch, churchPost, toPaginated, withFallback } from '../api/churchApi';
import { archiveOrganization, getOrganization } from '../api/organizationsApi';
import {
  AnnouncementAudience,
  ChurchMediaType,
  CHURCH_MEDIA_TYPE_LABELS,
  OrganizationStatus,
  type Announcement,
  type ChurchMedia,
  type Organization,
  type PaginatedResult,
} from '../types/church.types';
import '../styles/ChurchAdmin.scss';

type Tab = 'general' | 'communication' | 'media' | 'danger';

export default function ChurchSettings(): React.JSX.Element {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const [tab, setTab] = useState<Tab>('general');
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getOrganization(organizationId, controller.signal)
      .then(setOrganization)
      .catch(() => undefined);
    return () => controller.abort();
  }, [organizationId]);

  return (
    <div className="church-admin-page">
      <header className="church-admin-header">
        <div>
          <span className="church-admin-eyebrow">Admin console</span>
          <h1>Settings</h1>
        </div>
      </header>

      <div className="church-admin-tab-group" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'general'}
          className={`church-admin-tab ${tab === 'general' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('general')}
        >
          General
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'communication'}
          className={`church-admin-tab ${tab === 'communication' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('communication')}
        >
          Communication
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'media'}
          className={`church-admin-tab ${tab === 'media' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('media')}
        >
          Media
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'danger'}
          className={`church-admin-tab ${tab === 'danger' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('danger')}
        >
          Danger zone
        </button>
      </div>

      {tab === 'general' && <GeneralTab organization={organization} />}
      {tab === 'communication' && <CommunicationTab organizationId={organizationId} />}
      {tab === 'media' && <MediaTab organizationId={organizationId} />}
      {tab === 'danger' && <DangerZoneTab organizationId={organizationId} organization={organization} />}
    </div>
  );
}

function GeneralTab({ organization }: { organization: Organization | null }): React.JSX.Element {
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organization) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await churchPatch(`/organizations/${organization.id}/settings`, { isDiscoverable, requireApproval });
      setMessage('Settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="church-admin-panel">
      <h2>General settings</h2>
      <dl className="church-admin-summary-list">
        <div>
          <dt>Status</dt>
          <dd>{organization?.status ?? '—'}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{organization ? new Date(organization.createdAt).toLocaleDateString() : '—'}</dd>
        </div>
      </dl>

      <form className="church-admin-form" onSubmit={handleSave}>
        <label className="church-admin-field church-admin-field--checkbox">
          <input type="checkbox" checked={isDiscoverable} onChange={(e) => setIsDiscoverable(e.target.checked)} />
          <span>Show this organization in public discovery</span>
        </label>
        <label className="church-admin-field church-admin-field--checkbox">
          <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
          <span>Require admin approval for new membership requests</span>
        </label>
        <div className="church-admin-form-actions">
          <button type="submit" className="church-admin-btn church-admin-btn--primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
        {message && <p className="church-admin-alert church-admin-alert--success">{message}</p>}
      </form>
    </section>
  );
}

function CommunicationTab({ organizationId }: { organizationId: string }): React.JSX.Element {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>(AnnouncementAudience.Everyone);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      try {
        const result = await withFallback(
          () =>
            churchGet<PaginatedResult<Announcement>>(
              `/organizations/${organizationId}/announcements`,
              { pageSize: 20 },
              controller.signal,
            ),
          () => toPaginated<Announcement>([]),
        );
        setAnnouncements(result.items);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unable to load announcements.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (organizationId) load();
    return () => controller.abort();
  }, [organizationId]);

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const created = await churchPost<Announcement>(`/organizations/${organizationId}/announcements`, {
        title,
        body,
        audience,
      });
      setAnnouncements((items) => [created, ...items]);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish this announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    try {
      await churchDelete(`/organizations/${organizationId}/announcements/${announcementId}`);
      setAnnouncements((items) => items.filter((item) => item.id !== announcementId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove this announcement.');
    }
  };

  return (
    <>
      {error && <div className="church-admin-alert church-admin-alert--error">{error}</div>}

      <section className="church-admin-panel">
        <h2>Publish an announcement</h2>
        <form className="church-admin-form" onSubmit={handlePublish}>
          <label className="church-admin-field">
            <span>Title</span>
            <input className="church-admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="church-admin-field">
            <span>Message</span>
            <textarea className="church-admin-textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
          </label>
          <label className="church-admin-field">
            <span>Audience</span>
            <select className="church-admin-select" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
              <option value={AnnouncementAudience.Everyone}>Everyone</option>
              <option value={AnnouncementAudience.Members}>Members</option>
              <option value={AnnouncementAudience.Leadership}>Leadership</option>
            </select>
          </label>
          <div className="church-admin-form-actions">
            <button type="submit" className="church-admin-btn church-admin-btn--primary" disabled={isSaving}>
              {isSaving ? 'Publishing…' : 'Publish announcement'}
            </button>
          </div>
        </form>
      </section>

      <section className="church-admin-panel">
        <h2>Published announcements</h2>
        {isLoading ? (
          <p className="church-admin-empty">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="church-admin-empty">No announcements published yet.</p>
        ) : (
          <ul className="church-admin-list">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="church-admin-list__item">
                <div>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.body}</p>
                </div>
                <button
                  type="button"
                  className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                  onClick={() => handleDelete(announcement.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function MediaTab({ organizationId }: { organizationId: string }): React.JSX.Element {
  const [media, setMedia] = useState<ChurchMedia[]>([]);
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<ChurchMediaType>(ChurchMediaType.Sermon);
  const [fileUrl, setFileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      try {
        const result = await withFallback(
          () =>
            churchGet<PaginatedResult<ChurchMedia>>(
              `/organizations/${organizationId}/media`,
              { pageSize: 50 },
              controller.signal,
            ),
          () => toPaginated<ChurchMedia>([]),
        );
        setMedia(result.items);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unable to load media.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (organizationId) load();
    return () => controller.abort();
  }, [organizationId]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const created = await churchPost<ChurchMedia>(`/organizations/${organizationId}/media`, {
        title,
        mediaType,
        fileUrl,
      });
      setMedia((items) => [created, ...items]);
      setTitle('');
      setFileUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add this media item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      await churchDelete(`/organizations/${organizationId}/media/${mediaId}`);
      setMedia((items) => items.filter((item) => item.id !== mediaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove this media item.');
    }
  };

  return (
    <>
      {error && <div className="church-admin-alert church-admin-alert--error">{error}</div>}

      <section className="church-admin-panel">
        <h2>Add media</h2>
        <form className="church-admin-form church-admin-form--inline" onSubmit={handleUpload}>
          <div className="church-admin-field-row">
            <label className="church-admin-field">
              <span>Title</span>
              <input className="church-admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="church-admin-field">
              <span>Type</span>
              <select className="church-admin-select" value={mediaType} onChange={(e) => setMediaType(e.target.value as ChurchMediaType)}>
                {Object.values(ChurchMediaType).map((value) => (
                  <option key={value} value={value}>
                    {CHURCH_MEDIA_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="church-admin-field">
            <span>File URL</span>
            <input
              className="church-admin-input"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
              required
            />
          </label>
          <div className="church-admin-form-actions">
            <button type="submit" className="church-admin-btn church-admin-btn--primary" disabled={isSaving}>
              {isSaving ? 'Adding…' : 'Add to library'}
            </button>
          </div>
        </form>
      </section>

      <section className="church-admin-panel">
        <h2>Media library</h2>
        {isLoading ? (
          <p className="church-admin-empty">Loading…</p>
        ) : media.length === 0 ? (
          <p className="church-admin-empty">Nothing published yet.</p>
        ) : (
          <ul className="church-admin-list">
            {media.map((item) => (
              <li key={item.id} className="church-admin-list__item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{CHURCH_MEDIA_TYPE_LABELS[item.mediaType]}</p>
                </div>
                <button
                  type="button"
                  className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                  onClick={() => handleDelete(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function DangerZoneTab({
  organizationId,
  organization,
}: {
  organizationId: string;
  organization: Organization | null;
}): React.JSX.Element {
  const navigate = useNavigate();
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    setIsArchiving(true);
    setError(null);
    try {
      await archiveOrganization(organizationId);
      navigate('/church/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive this organization.');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <section className="church-admin-panel church-admin-panel--danger">
      <h2>Danger zone</h2>
      {error && <div className="church-admin-alert church-admin-alert--error">{error}</div>}
      <p>
        Archiving <strong>{organization?.name ?? 'this organization'}</strong> hides it from discovery and
        deactivates member access. This can be reversed by an Owner from account support.
      </p>
      <button
        type="button"
        className="church-admin-btn church-admin-btn--danger"
        onClick={handleArchive}
        disabled={isArchiving || organization?.status === OrganizationStatus.Archived}
      >
        {isArchiving
          ? 'Archiving…'
          : organization?.status === OrganizationStatus.Archived
          ? 'Already archived'
          : 'Archive organization'}
      </button>
    </section>
  );
}
