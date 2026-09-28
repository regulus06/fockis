import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import producerApi, {
  ProducerProfile,
  ProducerStatus,
} from '../services/producerApi';

import '../styles/MusicProducer.scss';

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_PROFILE_IMAGE_SIZE =
  2 * 1024 * 1024;

const ALLOWED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_GENRES = 10;

const PRODUCER_GENRES = [
  {
    value: 'hip-hop',
    label: 'Hip-Hop',
  },
  {
    value: 'rnb',
    label: 'R&B',
  },
  {
    value: 'afrobeats',
    label: 'Afrobeats',
  },
  {
    value: 'amapiano',
    label: 'Amapiano',
  },
  {
    value: 'pop',
    label: 'Pop',
  },
  {
    value: 'rock',
    label: 'Rock',
  },
  {
    value: 'electronic',
    label: 'Electronic',
  },
  {
    value: 'gospel',
    label: 'Gospel',
  },
  {
    value: 'jazz',
    label: 'Jazz',
  },
  {
    value: 'latin',
    label: 'Latin',
  },
  {
    value: 'reggae',
    label: 'Reggae',
  },
  {
    value: 'dancehall',
    label: 'Dancehall',
  },
  {
    value: 'country',
    label: 'Country',
  },
  {
    value: 'folk',
    label: 'Folk',
  },
  {
    value: 'indie',
    label: 'Indie',
  },
  {
    value: 'alternative',
    label: 'Alternative',
  },
  {
    value: 'house',
    label: 'House',
  },
  {
    value: 'techno',
    label: 'Techno',
  },
  {
    value: 'trap',
    label: 'Trap',
  },
  {
    value: 'reggaeton',
    label: 'Reggaeton',
  },
  {
    value: 'soca',
    label: 'Soca',
  },
  {
    value: 'kompa',
    label: 'Kompa',
  },
  {
    value: 'other',
    label: 'Other',
  },
];

/* ============================================================
   HELPERS
============================================================ */

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusLabel(
  status: ProducerStatus,
) {
  switch (status) {
    case 'approved':
      return 'Approved';

    case 'pending':
      return 'Pending Review';

    case 'rejected':
      return 'Application Needs Changes';

    case 'suspended':
      return 'Suspended';

    default:
      return status;
  }
}

function getStatusMessage(
  status: ProducerStatus,
) {
  switch (status) {
    case 'approved':
      return 'Your creator account has been approved. You can now publish music, videos, movies, performances, series, educational content, lifestyle content, and other original creator releases.';

    case 'pending':
      return 'Your creator application has been submitted and is waiting for review.';

    case 'rejected':
      return 'Your application was not approved. Review the administrator note below, make your changes, and submit again.';

    case 'suspended':
      return 'Your creator privileges are currently suspended. Please contact Fockis support or an administrator.';

    default:
      return '';
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function MusicBecomeProducerPage() {
  const [profile, setProfile] =
    useState<ProducerProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [producerName, setProducerName] =
    useState('');

  const [bio, setBio] =
    useState('');

  const [genres, setGenres] =
    useState<string[]>([]);

  const [profileImage, setProfileImage] =
    useState('');

  const [profileImageName, setProfileImageName] =
    useState('');

  const [profileImageSize, setProfileImageSize] =
    useState(0);

  const [coverImage, setCoverImage] =
    useState('');

  const [website, setWebsite] =
    useState('');

  const [instagram, setInstagram] =
    useState('');

  const [youtube, setYoutube] =
    useState('');

  const [tiktok, setTiktok] =
    useState('');

  const [spotify, setSpotify] =
    useState('');

  /* ==========================================================
     SELECTED GENRE LABELS
  ========================================================== */

  const selectedGenreLabels = useMemo(
    () =>
      genres.map(
        (genre) =>
          PRODUCER_GENRES.find(
            (item) =>
              item.value === genre,
          )?.label ?? genre,
      ),
    [genres],
  );

  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError('');

    try {
      const response =
        await producerApi.getMe();

      const currentProfile =
        response.profile;

      setProfile(currentProfile);

      if (!currentProfile) {
        return;
      }

      setProducerName(
        currentProfile.producerName ?? '',
      );

      setBio(
        currentProfile.bio ?? '',
      );

      setGenres(
        Array.isArray(
          currentProfile.genres,
        )
          ? currentProfile.genres
          : [],
      );

      setProfileImage(
        currentProfile.profileImage ?? '',
      );

      setCoverImage(
        currentProfile.coverImage ?? '',
      );

      setWebsite(
        currentProfile.website ?? '',
      );

      setInstagram(
        currentProfile.instagram ?? '',
      );

      setYoutube(
        currentProfile.youtube ?? '',
      );

      setTiktok(
        currentProfile.tiktok ?? '',
      );

      setSpotify(
        currentProfile.spotify ?? '',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your creator profile.',
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     GENRE SELECTION
  ========================================================== */

  function toggleGenre(
    genre: string,
  ) {
    setError('');
    setSuccess('');

    setGenres((current) => {
      if (current.includes(genre)) {
        return current.filter(
          (item) => item !== genre,
        );
      }

      if (current.length >= MAX_GENRES) {
        setError(
          `You can select up to ${MAX_GENRES} genres.`,
        );

        return current;
      }

      return [
        ...current,
        genre,
      ];
    });
  }

  function clearGenres() {
    setGenres([]);
    setError('');
    setSuccess('');
  }

  /* ==========================================================
     PROFILE IMAGE
  ========================================================== */

  function handleProfileImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setSuccess('');

    if (
      !ALLOWED_PROFILE_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      setError(
        'Please choose a JPG, PNG, or WebP image.',
      );

      event.target.value = '';

      return;
    }

    if (
      file.size >
      MAX_PROFILE_IMAGE_SIZE
    ) {
      setError(
        'Profile photos must be 2 MB or smaller.',
      );

      event.target.value = '';

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      if (
        typeof result !==
        'string'
      ) {
        setError(
          'Unable to read the selected photo.',
        );

        return;
      }

      setProfileImage(result);

      setProfileImageName(
        file.name,
      );

      setProfileImageSize(
        file.size,
      );
    };

    reader.onerror = () => {
      setError(
        'Unable to read the selected photo.',
      );
    };

    reader.readAsDataURL(file);

    event.target.value = '';
  }

  function removeProfileImage() {
    setProfileImage('');
    setProfileImageName('');
    setProfileImageSize(0);
    setError('');
    setSuccess('');
  }

  /* ==========================================================
     VALIDATION
  ========================================================== */

  function validateForm() {
    const trimmedProducerName =
      producerName.trim();

    if (!trimmedProducerName) {
      return 'Please enter your creator name.';
    }

    if (
      trimmedProducerName.length < 2
    ) {
      return 'Creator name must contain at least 2 characters.';
    }

    if (
      trimmedProducerName.length >
      120
    ) {
      return 'Creator name must be 120 characters or fewer.';
    }

    if (genres.length === 0) {
      return 'Please select at least one genre or creative category.';
    }

    if (
      genres.length >
      MAX_GENRES
    ) {
      return `You can select up to ${MAX_GENRES} genres.`;
    }

    return '';
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError,
      );

      return;
    }

    const normalizedGenres =
      Array.from(
        new Set(
          genres
            .map(
              (genre) =>
                genre.trim().toLowerCase(),
            )
            .filter(Boolean),
        ),
      ).slice(0, MAX_GENRES);

    if (
      normalizedGenres.length === 0
    ) {
      setError(
        'Please select at least one genre or creative category.',
      );

      return;
    }

    setSaving(true);

    const payload = {
      producerName:
        producerName.trim(),

      bio:
        bio.trim(),

      genres:
        normalizedGenres,

      profileImage:
        profileImage.trim(),

      coverImage:
        coverImage.trim(),

      website:
        website.trim(),

      instagram:
        instagram.trim(),

      youtube:
        youtube.trim(),

      tiktok:
        tiktok.trim(),

      spotify:
        spotify.trim(),
    };

    try {
      let updatedProfile:
        ProducerProfile;

      /*
       * Rejected applications must use /apply.
       *
       * The backend converts the rejected
       * application back to pending.
       */
      if (
        profile?.status ===
        'rejected'
      ) {
        updatedProfile =
          await producerApi.apply(
            payload,
          );
      } else if (profile) {
        updatedProfile =
          await producerApi.updateMe(
            payload,
          );
      } else {
        updatedProfile =
          await producerApi.apply(
            payload,
          );
      }

      setProfile(
        updatedProfile,
      );

      setProducerName(
        updatedProfile.producerName ?? '',
      );

      setBio(
        updatedProfile.bio ?? '',
      );

      setGenres(
        Array.isArray(
          updatedProfile.genres,
        )
          ? updatedProfile.genres
          : [],
      );

      setProfileImage(
        updatedProfile.profileImage ?? '',
      );

      setCoverImage(
        updatedProfile.coverImage ?? '',
      );

      setWebsite(
        updatedProfile.website ?? '',
      );

      setInstagram(
        updatedProfile.instagram ?? '',
      );

      setYoutube(
        updatedProfile.youtube ?? '',
      );

      setTiktok(
        updatedProfile.tiktok ?? '',
      );

      setSpotify(
        updatedProfile.spotify ?? '',
      );

      setSuccess(
        updatedProfile.status ===
          'approved'
          ? 'Your creator profile has been updated successfully.'
          : 'Your creator application has been submitted successfully and is now ready for review.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save your creator application.',
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     STATUS CARD
  ========================================================== */

  function renderStatusCard() {
    if (!profile) {
      return null;
    }

    return (
      <section
        className={`producer-status-card producer-status-card--${profile.status}`}
      >
        <div className="producer-status-card__icon">
          {profile.status ===
            'approved' && '✓'}

          {profile.status ===
            'pending' && '…'}

          {profile.status ===
            'rejected' && '!'}

          {profile.status ===
            'suspended' && '×'}
        </div>

        <div className="producer-status-card__content">
          <div className="producer-status-card__eyebrow">
            CREATOR APPLICATION
          </div>

          <h2>
            {getStatusLabel(
              profile.status,
            )}
          </h2>

          <p>
            {getStatusMessage(
              profile.status,
            )}
          </p>

          {profile.adminNote && (
            <div className="producer-status-card__note">
              <strong>
                Administrator note
              </strong>

              <p>
                {profile.adminNote}
              </p>
            </div>
          )}

          {profile.status ===
            'approved' && (
            <div className="producer-status-card__actions">
              <Link
                to="/music/producer/dashboard"
                className="producer-primary-button"
              >
                Open Creator Studio →
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main className="music-producer-page">
        <div className="music-producer-loading">
          <div className="music-producer-loading__spinner" />

          <p>
            Loading creator profile…
          </p>
        </div>
      </main>
    );
  }

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <main className="music-producer-page">
      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="music-producer-hero">
        <div className="music-producer-hero__inner">
          <div>
            <div className="music-producer-hero__eyebrow">
              FOCKIS CREATOR PROGRAM
            </div>

            <h1>
              Become a Creator
            </h1>

            <p>
              Build your creator profile,
              publish original content,
              connect with your audience,
              monetize your work, and grow
              your creative brand through
              the Fockis Creator Studio.
            </p>
          </div>

          <div className="music-producer-hero__badge">
            <span>
              ✦
            </span>

            <strong>
              Creator Program
            </strong>
          </div>
        </div>
      </section>

      <div className="music-producer-shell">
        {/* ====================================================
            TOP NAVIGATION
        ==================================================== */}

        <div className="music-producer-top-navigation">
          <Link
            to="/music"
            className="music-producer-back-link"
          >
            ← Back to Music
          </Link>

          {profile?.status ===
            'approved' && (
            <Link
              to="/music/producer/dashboard"
              className="music-producer-studio-link"
            >
              Creator Studio →
            </Link>
          )}
        </div>

        {/* ====================================================
            STATUS
        ==================================================== */}

        {renderStatusCard()}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div
            className="music-producer-alert music-producer-alert--error"
            role="alert"
          >
            <strong>
              Unable to save
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {success && (
          <div
            className="music-producer-alert music-producer-alert--success"
            role="status"
          >
            <strong>
              Success
            </strong>

            <span>
              {success}
            </span>
          </div>
        )}

        <div className="music-producer-grid">
          {/* ==================================================
              MAIN
          ================================================== */}

          <div className="music-producer-main">
            <form
              onSubmit={
                handleSubmit
              }
            >
              {/* =================================================
                  SECTION 01
              ================================================= */}

              <section className="producer-form-card">
                <div className="producer-form-card__header">
                  <div>
                    <span className="producer-section-number">
                      01
                    </span>

                    <h2>
                      Creator Information
                    </h2>

                    <p>
                      Tell your audience
                      who you are, what you
                      create, and what makes
                      your work unique.
                    </p>
                  </div>
                </div>

                <div className="producer-form-card__body">
                  <div className="producer-form-field">
                    <label htmlFor="producerName">
                      Creator Name
                      <span>
                        *
                      </span>
                    </label>

                    <input
                      id="producerName"
                      type="text"
                      value={
                        producerName
                      }
                      onChange={(event) =>
                        setProducerName(
                          event.target.value,
                        )
                      }
                      placeholder="Your creator, artist, brand, or professional name"
                      maxLength={120}
                      required
                    />

                    <small>
                      This is the public
                      name your audience
                      will see on your
                      Fockis Creator
                      profile.
                    </small>
                  </div>

                  <div className="producer-form-field">
                    <label htmlFor="bio">
                      Creator Biography
                    </label>

                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(event) =>
                        setBio(
                          event.target.value,
                        )
                      }
                      placeholder="Tell your audience about yourself, your creative work, your experience, your story, your influences, and what you create."
                      rows={7}
                      maxLength={5000}
                    />

                    <small>
                      {bio.length}
                      {' '}
                      / 5000
                      {' '}
                      characters
                    </small>
                  </div>
                </div>
              </section>

              {/* =================================================
                  SECTION 02 — MULTI GENRE
              ================================================= */}

              <section className="producer-form-card">
                <div className="producer-form-card__header">
                  <div>
                    <span className="producer-section-number">
                      02
                    </span>

                    <h2>
                      Creative Categories
                    </h2>

                    <p>
                      Select the music genres
                      that best describe your
                      creative work and
                      audience.
                    </p>
                  </div>

                  <div className="producer-genre-count">
                    {genres.length}
                    {' '}
                    / {MAX_GENRES}
                  </div>
                </div>

                <div className="producer-form-card__body">
                  <div className="producer-genre-help">
                    <strong>
                      Select multiple genres
                    </strong>

                    <span>
                      Choose up to{' '}
                      {MAX_GENRES}{' '}
                      categories.
                    </span>
                  </div>

                  <div
                    className="producer-genre-grid"
                    role="group"
                    aria-label="Creative categories and music genres"
                  >
                    {PRODUCER_GENRES.map(
                      (genre) => {
                        const selected =
                          genres.includes(
                            genre.value,
                          );

                        const disabled =
                          !selected &&
                          genres.length >=
                            MAX_GENRES;

                        return (
                          <button
                            key={
                              genre.value
                            }
                            type="button"
                            className={
                              selected
                                ? 'producer-genre-option producer-genre-option--selected'
                                : 'producer-genre-option'
                            }
                            aria-pressed={
                              selected
                            }
                            aria-label={
                              selected
                                ? `Remove ${genre.label}`
                                : `Select ${genre.label}`
                            }
                            disabled={
                              disabled
                            }
                            onClick={() =>
                              toggleGenre(
                                genre.value,
                              )
                            }
                          >
                            <span className="producer-genre-option__check">
                              {selected
                                ? '✓'
                                : '+'}
                            </span>

                            <span>
                              {
                                genre.label
                              }
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>

                  {genres.length >
                    0 && (
                    <div className="producer-selected-genres">
                      <div className="producer-selected-genres__header">
                        <strong>
                          Selected categories
                        </strong>

                        <button
                          type="button"
                          onClick={
                            clearGenres
                          }
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="producer-selected-genres__list">
                        {selectedGenreLabels.map(
                          (
                            label,
                            index,
                          ) => (
                            <span
                              key={`${label}-${index}`}
                              className="producer-selected-genre"
                            >
                              {label}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* =================================================
                  SECTION 03 — PROFILE PHOTO
              ================================================= */}

              <section className="producer-form-card">
                <div className="producer-form-card__header">
                  <div>
                    <span className="producer-section-number">
                      03
                    </span>

                    <h2>
                      Creator Profile Photo
                    </h2>

                    <p>
                      Choose a professional
                      image that represents
                      your creator identity or
                      brand.
                    </p>
                  </div>
                </div>

                <div className="producer-form-card__body">
                  <div className="producer-profile-photo-picker">
                    <div className="producer-profile-photo-preview">
                      {profileImage ? (
                        <img
                          src={
                            profileImage
                          }
                          alt="Creator profile preview"
                        />
                      ) : (
                        <div className="producer-profile-photo-placeholder">
                          <span>
                            ✦
                          </span>

                          <small>
                            No photo
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="producer-profile-photo-controls">
                      <label
                        htmlFor="profileImageFile"
                        className="producer-photo-button"
                      >
                        <span>
                          📷
                        </span>

                        {profileImage
                          ? 'Change Photo'
                          : 'Choose Photo'}
                      </label>

                      <input
                        id="profileImageFile"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={
                          handleProfileImageChange
                        }
                        hidden
                      />

                      {profileImage && (
                        <button
                          type="button"
                          className="producer-photo-remove-button"
                          onClick={
                            removeProfileImage
                          }
                        >
                          Remove Photo
                        </button>
                      )}

                      <div className="producer-photo-help">
                        <strong>
                          JPG, PNG, or WebP
                        </strong>

                        <span>
                          Maximum size:
                          {' '}
                          2 MB
                        </span>

                        {profileImageName && (
                          <span>
                            {profileImageName}
                            {' '}
                            ·{' '}
                            {formatBytes(
                              profileImageSize,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  SECTION 04 — ONLINE PRESENCE
              ================================================= */}

              <section className="producer-form-card">
                <div className="producer-form-card__header">
                  <div>
                    <span className="producer-section-number">
                      04
                    </span>

                    <h2>
                      Online Presence
                    </h2>

                    <p>
                      Connect your audience
                      to your website,
                      streaming platforms,
                      social networks, and
                      other professional
                      profiles.
                    </p>
                  </div>
                </div>

                <div className="producer-form-card__body">
                  <div className="producer-form-two-column">
                    <div className="producer-form-field">
                      <label htmlFor="website">
                        Website
                      </label>

                      <input
                        id="website"
                        type="url"
                        value={
                          website
                        }
                        onChange={(event) =>
                          setWebsite(
                            event.target.value,
                          )
                        }
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    <div className="producer-form-field">
                      <label htmlFor="spotify">
                        Spotify
                      </label>

                      <input
                        id="spotify"
                        type="url"
                        value={
                          spotify
                        }
                        onChange={(event) =>
                          setSpotify(
                            event.target.value,
                          )
                        }
                        placeholder="Spotify profile URL"
                      />
                    </div>

                    <div className="producer-form-field">
                      <label htmlFor="instagram">
                        Instagram
                      </label>

                      <input
                        id="instagram"
                        type="text"
                        value={
                          instagram
                        }
                        onChange={(event) =>
                          setInstagram(
                            event.target.value,
                          )
                        }
                        placeholder="@yourusername"
                      />
                    </div>

                    <div className="producer-form-field">
                      <label htmlFor="youtube">
                        YouTube
                      </label>

                      <input
                        id="youtube"
                        type="url"
                        value={
                          youtube
                        }
                        onChange={(event) =>
                          setYoutube(
                            event.target.value,
                          )
                        }
                        placeholder="YouTube channel URL"
                      />
                    </div>

                    <div className="producer-form-field">
                      <label htmlFor="tiktok">
                        TikTok
                      </label>

                      <input
                        id="tiktok"
                        type="text"
                        value={
                          tiktok
                        }
                        onChange={(event) =>
                          setTiktok(
                            event.target.value,
                          )
                        }
                        placeholder="@yourusername"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  SUBMISSION
              ================================================= */}

              <section className="producer-form-card producer-form-card--submission">
                <div className="producer-submission-summary">
                  <div className="producer-submission-summary__icon">
                    ✓
                  </div>

                  <div>
                    <h2>
                      Ready to submit?
                    </h2>

                    <p>
                      Your creator profile
                      will be reviewed before
                      you can publish content
                      through the Fockis Creator
                      Studio. Once approved,
                      you can publish eligible
                      content, offer paid and
                      premium access, schedule
                      releases, and grow your
                      creator business.
                    </p>
                  </div>
                </div>

                <div className="producer-submission-actions">
                  <button
                    type="submit"
                    className="producer-primary-button"
                    disabled={
                      saving ||
                      profile?.status ===
                        'suspended'
                    }
                  >
                    {saving
                      ? 'Saving…'
                      : profile?.status ===
                          'rejected'
                        ? 'Resubmit Creator Application'
                        : profile
                          ? 'Save Creator Profile'
                          : 'Submit Creator Application'}
                  </button>

                  <Link
                    to="/music"
                    className="producer-secondary-button"
                  >
                    Cancel
                  </Link>
                </div>
              </section>
            </form>
          </div>

          {/* ====================================================
              SIDEBAR
          ==================================================== */}

          <aside className="music-producer-sidebar">
            <div className="producer-sidebar-card">
              <div className="producer-sidebar-card__top">
                <span>
                  FOCKIS
                </span>

                <strong>
                  Creator Program
                </strong>
              </div>

              <div className="producer-sidebar-card__body">
                <h3>
                  What you can do
                </h3>

                <p className="producer-sidebar-description">
                  The Fockis Creator Studio
                  gives approved creators the
                  tools to publish, manage,
                  monetize, and grow different
                  types of original content from
                  one professional creator
                  workspace.
                </p>

                <ul>
                  <li>
                    <span>✓</span>
                    Publish songs and singles
                  </li>

                  <li>
                    <span>✓</span>
                    Release albums and EPs
                  </li>

                  <li>
                    <span>✓</span>
                    Sell beats and instrumentals
                  </li>

                  <li>
                    <span>✓</span>
                    Publish music videos
                  </li>

                  <li>
                    <span>✓</span>
                    Publish movies and short films
                  </li>

                  <li>
                    <span>✓</span>
                    Share live performances and concerts
                  </li>

                  <li>
                    <span>✓</span>
                    Publish interviews and creator conversations
                  </li>

                  <li>
                    <span>✓</span>
                    Create behind-the-scenes content
                  </li>

                  <li>
                    <span>✓</span>
                    Create tutorials and educational content
                  </li>

                  <li>
                    <span>✓</span>
                    Publish exclusive creator content
                  </li>

                  <li>
                    <span>✓</span>
                    Publish fashion and creative lifestyle content
                  </li>

                  <li>
                    <span>✓</span>
                    Promote events and special releases
                  </li>

                  <li>
                    <span>✓</span>
                    Share announcements and creator updates
                  </li>

                  <li>
                    <span>✓</span>
                    Build multi-episode content series
                  </li>

                  <li>
                    <span>✓</span>
                    Schedule releases for specific dates
                  </li>

                  <li>
                    <span>✓</span>
                    Offer free, paid, premium, and exclusive content
                  </li>

                  <li>
                    <span>✓</span>
                    Sell content directly through Fockis
                  </li>

                  <li>
                    <span>✓</span>
                    Build your creator storefront
                  </li>

                  <li>
                    <span>✓</span>
                    Request featured placement across Fockis
                  </li>

                  <li>
                    <span>✓</span>
                    Track plays, views, purchases, and performance
                  </li>

                  <li>
                    <span>✓</span>
                    Grow your audience and creator brand
                  </li>
                </ul>
              </div>
            </div>

            <div className="producer-sidebar-info">
              <span className="producer-sidebar-info__number">
                01
              </span>

              <div>
                <strong>
                  Submit
                </strong>

                <p>
                  Complete your creator
                  profile and submit it
                  for review.
                </p>
              </div>
            </div>

            <div className="producer-sidebar-info">
              <span className="producer-sidebar-info__number">
                02
              </span>

              <div>
                <strong>
                  Review
                </strong>

                <p>
                  Fockis reviews your
                  application and creator
                  information before granting
                  Creator Studio publishing
                  access.
                </p>
              </div>
            </div>

            <div className="producer-sidebar-info">
              <span className="producer-sidebar-info__number">
                03
              </span>

              <div>
                <strong>
                  Create
                </strong>

                <p>
                  Once approved, access
                  your Creator Studio and
                  start building your content
                  catalog.
                </p>
              </div>
            </div>

            <div className="producer-sidebar-info">
              <span className="producer-sidebar-info__number">
                04
              </span>

              <div>
                <strong>
                  Grow
                </strong>

                <p>
                  Publish, monetize, track
                  performance, build your
                  audience, and grow your
                  creator business on Fockis.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}