import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { ContactStatus } from "../types/fockis-mail.types";

import { useContact, useTags } from "../hooks/useAudience";

import {
  useAction,
  useMailchimp,
  useMarketingPath,
} from "../hooks/useMailchimp";

import { audienceApi } from "../services/audienceApi";

import {
  Avatar,
  Badge,
  TagChip,
} from "../components/ui/Badge";

import {
  Button,
  LinkButton,
} from "../components/ui/Button";

import { ActionMenu } from "../components/ui/Menu";

import {
  PageHeader,
  Panel,
  Stat,
  StatStrip,
} from "../components/ui/Layout";

import { Tabs } from "../components/ui/Tabs";

import {
  EmptyState,
  Skeleton,
} from "../components/ui/Feedback";

import { TextField } from "../components/ui/Field";

import { Icon } from "../components/ui/Icon";

import {
  CONTACT_SOURCE_LABELS,
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_TONES,
} from "../utils/labels";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  timeAgo,
} from "../utils/format";

type TabId =
  | "timeline"
  | "campaigns"
  | "purchases"
  | "website";

type ContactActivity = {
  id: string;
  kind: string;
  label: string;
  at: string;
};

type ContactPurchase = {
  id: string;
  product: string;
  at: string;
  amount: number;
};

type ContactTag = {
  id: string;
  name: string;
  color: string;
};

type ContactDetailsModel = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;

  /*
   * Keep source as a string rather than keyof typeof
   * CONTACT_SOURCE_LABELS because the labels object can
   * be inferred as an empty object by TypeScript.
   */
  source: string;

  status: ContactStatus;
  vip: boolean;
  revenue: number;
  orderCount: number;
  joinedAt: string;
  lastActivityAt: string;
  activity: ContactActivity[];
  purchases: ContactPurchase[];
  tagIds: string[];

  customFields: Record<
    string,
    string | number | boolean | null
  >;
};

type ContactPatch = Parameters<
  typeof audienceApi.updateContact
>[1];

type ContactTagPatch = ContactPatch & {
  tagIds?: string[];
};

type ContactCustomFieldsPatch = ContactPatch & {
  customFields?: Record<
    string,
    string | number | boolean | null
  >;
};

function getSourceLabel(source: string): string {
  const labels = CONTACT_SOURCE_LABELS as Record<
    string,
    string
  >;

  return labels[source] ?? source;
}

function getStatusLabel(status: ContactStatus): string {
  const labels = CONTACT_STATUS_LABELS as Record<
    string,
    string
  >;

  return (
    labels[String(status)] ??
    String(status)
  );
}

/*
 * Derive the tone directly from Badge so this page can never
 * invent a tone that Badge does not support.
 */
type ContactBadgeTone = React.ComponentProps<
  typeof Badge
>["tone"];

function getStatusTone(
  status: ContactStatus,
): ContactBadgeTone {
  const tones = CONTACT_STATUS_TONES as Record<
    string,
    string
  >;

  switch (tones[String(status)]) {
    case "success":
      return "success" as ContactBadgeTone;

    case "warning":
      return "warning" as ContactBadgeTone;

    case "danger":
      /*
       * Badge does not expose a danger tone in the current
       * component contract, so map danger to warning.
       */
      return "warning" as ContactBadgeTone;

    case "info":
      return "info" as ContactBadgeTone;

    default:
      return undefined;
  }
}

function normalizeContact(
  value: unknown,
): ContactDetailsModel {
  const raw = (value ?? {}) as Record<
    string,
    unknown
  >;

  const activity = Array.isArray(raw.activity)
    ? (raw.activity as ContactActivity[])
    : [];

  const purchases = Array.isArray(raw.purchases)
    ? (raw.purchases as ContactPurchase[])
    : [];

  const tagIds = Array.isArray(raw.tagIds)
    ? raw.tagIds.filter(
        (
          item,
        ): item is string =>
          typeof item === "string",
      )
    : [];

  const customFields =
    raw.customFields &&
    typeof raw.customFields === "object" &&
    !Array.isArray(raw.customFields)
      ? (raw.customFields as Record<
          string,
          string | number | boolean | null
        >)
      : {};

  return {
    id: String(
      raw.id ??
        raw._id ??
        "",
    ),

    firstName: String(
      raw.firstName ?? "",
    ),

    lastName: String(
      raw.lastName ?? "",
    ),

    email: String(
      raw.email ?? "",
    ),

    phone:
      raw.phone === null ||
      raw.phone === undefined
        ? null
        : String(raw.phone),

    location:
      raw.location === null ||
      raw.location === undefined
        ? null
        : String(raw.location),

    source: String(
      raw.source ?? "",
    ),

    status:
      raw.status &&
      typeof raw.status === "string"
        ? (raw.status as ContactStatus)
        : (Object.keys(
            CONTACT_STATUS_LABELS as Record<
              string,
              unknown
            >,
          )[0] as ContactStatus),

    vip: Boolean(raw.vip),

    revenue:
      typeof raw.revenue === "number"
        ? raw.revenue
        : Number(
            raw.revenue ?? 0,
          ),

    orderCount:
      typeof raw.orderCount === "number"
        ? raw.orderCount
        : Number(
            raw.orderCount ?? 0,
          ),

    joinedAt: String(
      raw.joinedAt ??
        raw.createdAt ??
        new Date().toISOString(),
    ),

    lastActivityAt: String(
      raw.lastActivityAt ??
        raw.updatedAt ??
        raw.joinedAt ??
        new Date().toISOString(),
    ),

    activity,
    purchases,
    tagIds,
    customFields,
  };
}

export default function ContactDetailsPage() {
  const { id } = useParams<{
    id: string;
  }>();

  const to = useMarketingPath();
  const navigate = useNavigate();

  const run = useAction();
  const { confirm } = useMailchimp();

  const contact = useContact(id);
  const tags = useTags();

  const [tab, setTab] =
    useState<TabId>("timeline");

  const [fieldKey, setFieldKey] =
    useState("");

  const [fieldValue, setFieldValue] =
    useState("");

  if (contact.error) {
    return (
      <div className="fm-page">
        <EmptyState
          icon="users"
          title="Contact not found"
          body={
            contact.error ||
            "The requested contact could not be found."
          }
          action={
            <LinkButton
              to={to("audience")}
            >
              Back to audience
            </LinkButton>
          }
        />
      </div>
    );
  }

  if (
    contact.loading ||
    !contact.data
  ) {
    return (
      <div className="fm-page">
        <Skeleton
          width={300}
          height={32}
        />

        <Skeleton
          height={100}
          className="fm-mt-16"
        />

        <Skeleton
          height={300}
          className="fm-mt-16"
        />
      </div>
    );
  }

  const c = normalizeContact(
    contact.data,
  );

  const save = async (
    patch: ContactPatch,
    msg: string,
  ) => {
    const res = await run(
      () =>
        audienceApi.updateContact(
          c.id,
          patch,
        ),
      msg,
    );

    if (res) {
      contact.setData(res);
    }
  };

  const campaignEvents =
    c.activity.filter(
      (
        activity: ContactActivity,
      ) =>
        activity.kind === "opened" ||
        activity.kind === "clicked",
    );

  const webEvents =
    c.activity.filter(
      (
        activity: ContactActivity,
      ) =>
        activity.kind === "visited" ||
        activity.kind === "posted" ||
        activity.kind === "followed",
    );

  const list =
    tab === "timeline"
      ? c.activity
      : tab === "campaigns"
        ? campaignEvents
        : tab === "website"
          ? webEvents
          : [];

  const availableTags =
    (tags.data ?? []) as unknown as ContactTag[];

  return (
    <div className="fm-page">
      <nav
        className="fm-breadcrumb"
        aria-label="Breadcrumb"
      >
        <Link to={to("audience")}>
          Audience
        </Link>

        <Icon
          name="chevronRight"
          size={14}
        />

        <span aria-current="page">
          {c.firstName} {c.lastName}
        </span>
      </nav>

      <PageHeader
        title={`${c.firstName} ${c.lastName}`}
        actions={
          <>
            <ActionMenu
              trigger="button"
              buttonLabel="Change status"
              items={(
                Object.keys(
                  CONTACT_STATUS_LABELS as Record<
                    string,
                    unknown
                  >,
                ) as ContactStatus[]
              ).map(
                (
                  status: ContactStatus,
                ) => ({
                  label:
                    getStatusLabel(
                      status,
                    ),

                  onSelect: () =>
                    save(
                      {
                        status,
                      } as ContactPatch,

                      `Status changed to ${getStatusLabel(
                        status,
                      ).toLowerCase()}.`,
                    ),
                }),
              )}
            />

            <Button
              variant="danger"
              icon="trash"
              onClick={async () => {
                const confirmed =
                  await confirm({
                    title: `Delete ${c.firstName}?`,
                    body:
                      "This permanently removes the contact and their history.",
                    confirmLabel:
                      "Delete contact",
                    danger: true,
                  });

                if (!confirmed) {
                  return;
                }

                const deleted =
                  await run(
                    () =>
                      audienceApi.bulk(
                        [c.id],
                        {
                          kind: "delete",
                        },
                      ),
                    "Contact deleted.",
                  );

                if (deleted) {
                  navigate(
                    to("audience"),
                  );
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="fm-contacthead is-inline">
          <Avatar
            name={`${c.firstName} ${c.lastName}`}
            size={44}
          />

          <div className="fm-row fm-row--wrap">
            <span>{c.email}</span>

            <Badge
              tone={getStatusTone(
                c.status,
              )}
              dot
            >
              {getStatusLabel(
                c.status,
              )}
            </Badge>

            {c.vip && (
              <span className="fm-vip">
                VIP
              </span>
            )}
          </div>
        </div>
      </PageHeader>

      <StatStrip>
        <Stat
          label="Lifetime revenue"
          value={formatCurrency(
            c.revenue,
          )}
        />

        <Stat
          label="Orders"
          value={c.orderCount}
        />

        <Stat
          label="Member since"
          value={formatDate(
            c.joinedAt,
          )}
        />

        <Stat
          label="Last active"
          value={timeAgo(
            c.lastActivityAt,
          )}
        />
      </StatStrip>

      <div className="fm-grid fm-grid--main">
        <div className="fm-stack fm-span-2">
          <Tabs
            label="Contact history"
            value={tab}
            onChange={setTab}
            items={[
              {
                id: "timeline",
                label: "Timeline",
                count:
                  c.activity.length,
              },
              {
                id: "campaigns",
                label:
                  "Campaign activity",
                count:
                  campaignEvents.length,
              },
              {
                id: "purchases",
                label: "Purchases",
                count:
                  c.purchases.length,
              },
              {
                id: "website",
                label:
                  "Fockis activity",
                count:
                  webEvents.length,
              },
            ]}
          />

          <Panel>
            {tab === "purchases" ? (
              c.purchases.length ? (
                <div className="fm-tablewrap">
                  <table className="fm-table">
                    <thead>
                      <tr>
                        <th scope="col">
                          Product
                        </th>

                        <th scope="col">
                          Date
                        </th>

                        <th
                          scope="col"
                          className="is-num"
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {c.purchases.map(
                        (
                          purchase: ContactPurchase,
                        ) => (
                          <tr
                            key={
                              purchase.id
                            }
                          >
                            <td>
                              {
                                purchase.product
                              }
                            </td>

                            <td>
                              {formatDate(
                                purchase.at,
                              )}
                            </td>

                            <td className="is-num">
                              {formatCurrency(
                                purchase.amount,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon="bag"
                  title="No purchases yet"
                  body="Marketplace orders appear here."
                />
              )
            ) : list.length ? (
              <ul className="fm-timeline">
                {list.map(
                  (
                    activity: ContactActivity,
                  ) => (
                    <li
                      key={
                        activity.id
                      }
                    >
                      <span
                        className={`fm-timeline__dot is-${activity.kind}`}
                      />

                      <p>
                        {
                          activity.label
                        }
                      </p>

                      <time
                        dateTime={
                          activity.at
                        }
                      >
                        {formatDateTime(
                          activity.at,
                        )}
                      </time>
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <EmptyState
                compact
                icon="clock"
                title="Nothing here yet"
                body="Activity appears as this contact engages."
              />
            )}
          </Panel>
        </div>

        <div className="fm-stack">
          <Panel title="Profile">
            <dl className="fm-deflist">
              <div>
                <dt>
                  <Icon
                    name="mail"
                    size={14}
                  />{" "}
                  Email
                </dt>

                <dd>{c.email}</dd>
              </div>

              <div>
                <dt>
                  <Icon
                    name="phone"
                    size={14}
                  />{" "}
                  Phone
                </dt>

                <dd>
                  {c.phone ?? "—"}
                </dd>
              </div>

              <div>
                <dt>
                  <Icon
                    name="pin"
                    size={14}
                  />{" "}
                  Location
                </dt>

                <dd>
                  {c.location || "—"}
                </dd>
              </div>

              <div>
                <dt>Source</dt>

                <dd>
                  {getSourceLabel(
                    c.source,
                  )}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel
            title="Tags"
            actions={
              <ActionMenu
                trigger="button"
                buttonLabel="Add"
                items={availableTags
                  .filter(
                    (
                      tag: ContactTag,
                    ) =>
                      !c.tagIds.includes(
                        tag.id,
                      ),
                  )
                  .map(
                    (
                      tag: ContactTag,
                    ) => ({
                      label:
                        tag.name,
                      icon: "tag",
                      onSelect: () =>
                        save(
                          {
                            tagIds: [
                              ...c.tagIds,
                              tag.id,
                            ],
                          } as ContactTagPatch,

                          `Added “${tag.name}”.`,
                        ),
                    }),
                  )}
              />
            }
          >
            <div className="fm-chipset">
              {c.tagIds.length ? (
                c.tagIds.map(
                  (tagId: string) => {
                    const tag =
                      availableTags.find(
                        (
                          item: ContactTag,
                        ) =>
                          item.id ===
                          tagId,
                      );

                    if (!tag) {
                      return null;
                    }

                    return (
                      <TagChip
                        key={tagId}
                        name={tag.name}
                        color={
                          tag.color ||
                          "#2563eb"
                        }
                        onRemove={() =>
                          save(
                            {
                              tagIds:
                                c.tagIds.filter(
                                  (
                                    value: string,
                                  ) =>
                                    value !==
                                    tagId,
                                ),
                            } as ContactTagPatch,

                            `Removed “${tag.name}”.`,
                          )
                        }
                      />
                    );
                  },
                )
              ) : (
                <span className="fm-muted">
                  No tags yet
                </span>
              )}
            </div>
          </Panel>

          <Panel title="Custom fields">
            <dl className="fm-deflist">
              {Object.entries(
                c.customFields,
              ).map(
                (
                  [
                    key,
                    value,
                  ]: [
                    string,
                    string | number | boolean | null,
                  ],
                ) => (
                  <div key={key}>
                    <dt>{key}</dt>

                    <dd>
                      {value === null
                        ? "—"
                        : String(
                            value,
                          )}
                    </dd>
                  </div>
                ),
              )}
            </dl>

            <form
              className="fm-inlineform"
              onSubmit={(event) => {
                event.preventDefault();

                if (
                  !fieldKey.trim()
                ) {
                  return;
                }

                const customFields = {
                  ...c.customFields,
                  [fieldKey.trim()]:
                    fieldValue,
                };

                void save(
                  {
                    customFields,
                  } as ContactCustomFieldsPatch,

                  "Field saved.",
                );

                setFieldKey("");
                setFieldValue("");
              }}
            >
              <TextField
                label="Field"
                value={fieldKey}
                onChange={(event) =>
                  setFieldKey(
                    event.target.value,
                  )
                }
                placeholder="Shoe size"
              />

              <TextField
                label="Value"
                value={fieldValue}
                onChange={(event) =>
                  setFieldValue(
                    event.target.value,
                  )
                }
              />

              <Button
                type="submit"
                size="sm"
                icon="plus"
                disabled={
                  !fieldKey.trim()
                }
              >
                Add field
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}