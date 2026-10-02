import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  JobCard,
  ResourceCard,
  CareersSearchBar,
} from '../components';

import { careersApi } from '../services';

import type {
  Job,
  CareerResource,
} from '../types';

import styles from '../styles/CareersHomePage.module.scss';

const QUICK_CHIPS = [
  'Internships',
  'Co-ops',
  'Entry Level',
  'Remote',
  'Technology',
  'Cybersecurity',
  'Healthcare',
  'Business',
  'Engineering',
] as const;

const RESOURCES: CareerResource[] = [
  {
    id: 'resume-builder',
    icon: '📄',
    title: 'Resume Builder',
    description:
      'Build an ATS-friendly resume in minutes.',
    href: '/careers/resources/resume-builder',
  },
  {
    id: 'interview-prep',
    icon: '🎤',
    title: 'Interview Preparation',
    description:
      'Practice with real behavioral prompts.',
    href: '/careers/resources/interview-prep',
  },
  {
    id: 'internship-guide',
    icon: '🎓',
    title: 'Internship Guide',
    description:
      'Everything to land your first internship.',
    href: '/careers/resources/internship-guide',
  },
  {
    id: 'coop-guide',
    icon: '🔁',
    title: 'Co-op Guide',
    description:
      'How co-op terms and credit typically work.',
    href: '/careers/resources/coop-guide',
  },
];

interface CareersSearchState {
  keyword?: string;
  location?: string;
}

interface SearchResult {
  items: Job[];
}

export function CareersHomePage() {
  const navigate = useNavigate();

  const [internships, setInternships] =
    useState<Job[]>([]);

  const [coops, setCoops] =
    useState<Job[]>([]);

  const [recommended, setRecommended] =
    useState<Job[]>([]);

  useEffect(() => {
    const loadCareers = async () => {
      try {
        const internshipResult =
          (await careersApi.searchInternships({
            pageSize: 3,
          })) as SearchResult;

        setInternships(
          Array.isArray(internshipResult?.items)
            ? internshipResult.items
            : [],
        );
      } catch {
        setInternships([]);
      }

      try {
        const coopResult =
          (await careersApi.searchCoops({
            pageSize: 3,
          })) as SearchResult;

        setCoops(
          Array.isArray(coopResult?.items)
            ? coopResult.items
            : [],
        );
      } catch {
        setCoops([]);
      }

      try {
        const recommendedJobs =
          await careersApi.getRecommendedJobs();

        setRecommended(
          Array.isArray(recommendedJobs)
            ? recommendedJobs
            : [],
        );
      } catch {
        setRecommended([]);
      }
    };

    void loadCareers();
  }, []);

  const openJob = (job: Job) => {
    navigate(`/careers/jobs/${job.id}`);
  };

  const easyApply = (job: Job) => {
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  const handleSearch = (
    search: CareersSearchState,
  ) => {
    navigate('/careers/search', {
      state: search,
    });
  };

  const handleResourceOpen = (
    resource: CareerResource,
  ) => {
    navigate(resource.href);
  };

  return (
    <div className={styles.page}>
      {/* ============================================================
          HERO
      ============================================================ */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          Fockis Careers
        </div>

        <h1 className={styles.h1}>
          Find your next <em>opportunity</em>
        </h1>

        <p className={styles.sub}>
          Search full-time roles, internships, and
          co-ops from companies building on Fockis —
          matched to your major, skills, and the term
          you're available.
        </p>

        <CareersSearchBar
          onSearch={handleSearch}
        />

        <div className={styles.chipRow}>
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={styles.chip}
              onClick={() => {
                if (chip === 'Internships') {
                  navigate('/careers/internships');
                  return;
                }

                if (chip === 'Co-ops') {
                  navigate('/careers/co-ops');
                  return;
                }

                navigate('/careers/search', {
                  state: {
                    keyword: chip,
                  },
                });
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================
          FEATURED INTERNSHIPS
      ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Featured internships</h2>

          <button
            type="button"
            onClick={() =>
              navigate('/careers/internships')
            }
          >
            Browse all internships →
          </button>
        </div>

        <div className={styles.rail}>
          {internships.map((job: Job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={openJob}
              onEasyApply={easyApply}
            />
          ))}
        </div>
      </section>

      {/* ============================================================
          CO-OPS
      ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Co-ops with real momentum</h2>

          <button
            type="button"
            onClick={() =>
              navigate('/careers/co-ops')
            }
          >
            Browse all co-ops →
          </button>
        </div>

        <div className={styles.rail}>
          {coops.map((job: Job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={openJob}
              onEasyApply={easyApply}
            />
          ))}
        </div>
      </section>

      {/* ============================================================
          RECOMMENDED
      ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Recommended for you</h2>

          <button
            type="button"
            onClick={() =>
              navigate('/careers/search')
            }
          >
            See all jobs →
          </button>
        </div>

        <div className={styles.rail}>
          {recommended.map((job: Job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={openJob}
              onEasyApply={easyApply}
            />
          ))}
        </div>
      </section>

      {/* ============================================================
          CAREER RESOURCES
      ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Career resources</h2>

          <button
            type="button"
            onClick={() =>
              navigate('/careers/resources')
            }
          >
            All resources →
          </button>
        </div>

        <div className={styles.railWide}>
          {RESOURCES.map(
            (resource: CareerResource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onOpen={handleResourceOpen}
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}