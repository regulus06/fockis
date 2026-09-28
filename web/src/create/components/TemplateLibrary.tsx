import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import TemplateCard from './TemplateCard';

import templates, {
  categories,
} from '../data/templates';

import templatesApi from '../services/templatesApi';

import type {
  Template,
} from '../types/createTypes';

function normalizeTemplates(
  response: unknown,
): Template[] {
  if (Array.isArray(response)) {
    return response as Template[];
  }

  if (
    response &&
    typeof response === 'object'
  ) {
    const data = response as {
      items?: Template[];
      templates?: Template[];
      data?: Template[];
    };

    return (
      data.items ||
      data.templates ||
      data.data ||
      []
    );
  }

  return [];
}

export default function TemplateLibrary() {
  const [activeCat, setActiveCat] =
    useState<string>('all');

  const [
    backendTemplates,
    setBackendTemplates,
  ] = useState<Template[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await templatesApi.list({
            page: 1,
            limit: 100,
          });

        const result =
          normalizeTemplates(response);

        if (mounted) {
          setBackendTemplates(result);
        }
      } catch (err) {
        console.error(
          '[FOCKIS CREATE] Failed to load templates:',
          err,
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load templates.',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  const sourceTemplates =
    backendTemplates.length > 0
      ? backendTemplates
      : templates;

  const visible = useMemo(() => {
    if (activeCat === 'all') {
      return sourceTemplates;
    }

    return sourceTemplates.filter(
      (template: any) =>
        template.cat === activeCat ||
        template.category === activeCat ||
        template.categoryId === activeCat,
    );
  }, [
    activeCat,
    sourceTemplates,
  ]);

  return (
    <section
      className="alt"
      id="templates"
    >
      <div className="wrap">

        <div className="section-head reveal">
          <div>
            <span className="eyebrow">
              Template Library
            </span>

            <h2>
              Beautiful templates
            </h2>

            <p>
              Start with a professionally
              designed template and customize
              it for your needs.
            </p>
          </div>

          <a
            href="#templates"
            className="btn-ghost view-all"
          >
            View all →
          </a>
        </div>

        <div
          className="cat-tabs reveal"
          role="tablist"
          aria-label="Template categories"
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className="cat-tab"
              role="tab"
              aria-pressed={
                activeCat === cat.key
              }
              onClick={() =>
                setActiveCat(cat.key)
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && (
          <p
            style={{
              textAlign: 'center',
              padding: '30px 0',
            }}
          >
            Loading templates…
          </p>
        )}

        {error && (
          <div
            className="fs-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {!loading &&
          visible.length > 0 && (
            <div className="template-grid reveal">
              {visible.map(
                (template) => (
                  <TemplateCard
                    key={
                      (template as any).id ||
                      (template as any)._id ||
                      template.title
                    }
                    template={template}
                  />
                ),
              )}
            </div>
          )}

        {!loading &&
          visible.length === 0 && (
            <p
              style={{
                display: 'block',
                textAlign: 'center',
                color: 'var(--muted)',
                padding: '32px 0',
              }}
            >
              No templates in this
              category yet. Try another
              category or browse all
              templates.
            </p>
          )}

      </div>
    </section>
  );
}