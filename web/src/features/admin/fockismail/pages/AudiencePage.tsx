import { useMemo, useState } from "react";



import { useSearchParams } from "react-router-dom";



import type {



  Audience,



  Contact,



  ContactInput,



  ContactStatus,



  Tag,



} from "../types/fockis-mail.types";



import { useAudiences, useContacts, useTags } from "../hooks/useAudience";



import { useAction, useMailchimp } from "../hooks/useMailchimp";



import { useAsync } from "../hooks/useAsync";







import {



  audienceApi,



  type BulkContactAction,



  type ContactQuery,



} from "../services/audienceApi";







import { AudienceTable, type SortKey } from "../components/AudienceTable";



import { ContactDrawer } from "../components/ContactDrawer";







import { Button } from "../components/ui/Button";



import { PageHeader, Panel, Toolbar } from "../components/ui/Layout";



import {



  FilterSelect,



  SearchInput,



  SelectField,



  TextArea,



  TextField,



} from "../components/ui/Field";



import {



  EmptyState,



  ErrorState,



  Notice,



  Skeleton,



  SkeletonRows,



} from "../components/ui/Feedback";



import { ActionMenu } from "../components/ui/Menu";



import { Modal } from "../components/ui/Overlay";



import { DemoBadge } from "../components/ui/Badge";







import { CONTACT_STATUS_LABELS } from "../utils/labels";



import {



  cx,



  downloadText,



  formatCompact,



  formatNumber,



} from "../utils/format";







const PAGE_SIZE = 20;



type AudiencePageContact = Contact & {

  email: string;

  firstName: string;

  lastName: string;

  status: ContactStatus;

  location: string;

  revenue: number;

  joinedAt: string;

  lastActivityAt: string;

};



type AudiencePageAudience = Audience & {

  name: string;

};



type AudiencePageTag = Tag & {

  name: string;

};









const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;







const BLANK: ContactInput = {



  firstName: "",



  lastName: "",



  email: "",



  phone: "",



  location: "",



  status: "subscribed",



  tagIds: [],



};







function toCsv(rows: AudiencePageContact[]): string {



  const head =



    "email,first_name,last_name,status,location,revenue,joined";







  const esc = (value: string): string => {



    return /[",\n]/.test(value)



      ? `"${value.replace(/"/g, '""')}"`



      : value;



  };







  return [



    head,



    ...rows.map((contact) =>



      [



        contact.email,



        contact.firstName,



        contact.lastName,



        contact.status,



        contact.location,



        String(contact.revenue),



        contact.joinedAt,



      ]



        .map(esc)



        .join(","),



    ),



  ].join("\n");



}







export default function AudiencePage() {



  const run = useAction();



  const { confirm, isMock } = useMailchimp();



  const [params] = useSearchParams();







  const [query, setQuery] = useState<ContactQuery>({



    status: "all",



    audienceId: "all",



    tagId: params.get("tag") ?? undefined,



  });







  const [search, setSearch] = useState("");







  const contacts = useContacts({



    ...query,



    search,



  });







  const stats = useAsync(



    () => audienceApi.stats(),



    [contacts.data?.length],



  );







  const audiences = useAudiences();



  const tags = useTags();







  const [selected, setSelected] = useState<Set<string>>(



    new Set(),



  );







  const [sort, setSort] = useState<{



    key: SortKey;



    dir: "asc" | "desc";



  }>({



    key: "joinedAt",



    dir: "desc",



  });







  const [page, setPage] = useState(0);



  const [quick, setQuick] = useState<AudiencePageContact | null>(null);







  const [addOpen, setAddOpen] = useState(false);



  const [form, setForm] = useState<ContactInput>(BLANK);



  const [formTouched, setFormTouched] = useState(false);







  const [importOpen, setImportOpen] = useState(false);



  const [csv, setCsv] = useState(



    "email,first_name,last_name\n",



  );







  const sorted = useMemo(() => {
  const list: AudiencePageContact[] = (contacts.data ?? []).map((contact) => ({
    ...contact,
    lastActivityAt: contact.joinedAt,
  }));

const direction = sort.dir === "asc" ? 1 : -1;



  list.sort((a, b) => {

    if (sort.key === "name") {

      return (

        direction *

        `${a.firstName}${a.lastName}`.localeCompare(

          `${b.firstName}${b.lastName}`,

        )

      );

    }



    if (sort.key === "revenue") {

      return direction * (a.revenue - b.revenue);

    }



    const aDate =

      sort.key === "joinedAt" ? a.joinedAt : a.lastActivityAt;

    const bDate =

      sort.key === "joinedAt" ? b.joinedAt : b.lastActivityAt;



    return (

      direction *

      (new Date(aDate).getTime() - new Date(bDate).getTime())

    );

  });



  return list;

}, [contacts.data, sort]);



const pages = Math.max(



    1,



    Math.ceil(sorted.length / PAGE_SIZE),



  );







  const pageRows = sorted.slice(



    page * PAGE_SIZE,



    page * PAGE_SIZE + PAGE_SIZE,



  );







  const ids = Array.from(selected);







  const setFilter = (patch: Partial<ContactQuery>) => {



    setQuery((current) => ({



      ...current,



      ...patch,



    }));







    setPage(0);



    setSelected(new Set());



  };







  const bulk = async (



    action: BulkContactAction,



    message: string,



  ) => {



    if (action.kind === "delete") {



      const ok = await confirm({



        title: `Delete ${ids.length} contact${



          ids.length === 1 ? "" : "s"



        }?`,



        body:



          "They'll be permanently removed from every audience. This can't be undone.",



        confirmLabel: "Delete contacts",



        danger: true,



      });







      if (!ok) {



        return;



      }



    }







    const result = await run(



      () => audienceApi.bulk(ids, action),



      message,



    );







    if (result) {



      setSelected(new Set());



      contacts.reload();



    }



  };







  const formErrors = {



    email: !EMAIL_RE.test(form.email)



      ? "Enter a valid email address."



      : undefined,







    firstName: !form.firstName.trim()



      ? "Enter a first name."



      : undefined,



  };







  const statCards: Array<{



    key: ContactQuery["status"];



    label: string;



    value?: number;



  }> = [



    {



      key: "all",



      label: "Total contacts",



      value: stats.data?.total,



    },



    {



      key: "subscribed",



      label: "Subscribed",



      value: stats.data?.subscribed,



    },



    {



      key: "unsubscribed",



      label: "Unsubscribed",



      value: stats.data?.unsubscribed,



    },



    {



      key: "cleaned",



      label: "Cleaned",



      value: stats.data?.cleaned,



    },



    {



      key: "pending",



      label: "Pending",



      value: stats.data?.pending,



    },



    {



      key: "vip",



      label: "VIP",



      value: stats.data?.vip,



    },



  ];







  return (



    <div className="fm-page">



      <PageHeader



        title="Audience"



        description="Everyone who can hear from you on Fockis, with their tags, activity, and value."



        actions={



          <>



            <Button



              icon="download"



              onClick={() =>



                downloadText(



                  "fockis-contacts.csv",



                  toCsv(sorted),



                  "text/csv",



                )



              }



              disabled={!sorted.length}



            >



              Export



            </Button>







            <Button



              icon="upload"



              onClick={() => setImportOpen(true)}



            >



              Import contacts



            </Button>







            <Button



              variant="primary"



              icon="plus"



              onClick={() => {



                setForm({ ...BLANK });



                setFormTouched(false);



                setAddOpen(true);



              }}



            >



              Add contact



            </Button>



          </>



        }



      />







      <div



        className="fm-statfilters"



        role="group"



        aria-label="Filter by status"



      >



        {statCards.map(



          (



            stat: {



              key: ContactQuery["status"];



              label: string;



              value?: number;



            },



          ) => (



            <button



              key={stat.label}



              type="button"



              className={cx(



                "fm-statfilter",



                query.status === stat.key && "is-active",



              )}



              aria-pressed={query.status === stat.key}



              onClick={() =>



                setFilter({



                  status: stat.key,



                })



              }



            >



              <span>{stat.label}</span>







              <strong>



                {stat.value === undefined ? (



                  <Skeleton width={60} height={20} />



                ) : (



                  formatCompact(stat.value)



                )}



              </strong>



            </button>



          ),



        )}







        <div className="fm-statfilter is-static">



          <span>



            New this month{" "}



            {isMock && <DemoBadge label="Demo" />}



          </span>







          <strong>



            {stats.data ? (



              `+${formatCompact(stats.data.newThisMonth)}`



            ) : (



              <Skeleton width={60} height={20} />



            )}



          </strong>



        </div>



      </div>







      <Toolbar>



        <SearchInput



          value={search}



          onChange={(value) => {



            setSearch(value);



            setPage(0);



          }}



          placeholder="Search name, email, or location"



        />







        <FilterSelect



          label="Audience"



          value={query.audienceId ?? "all"}



          onChange={(value) =>



            setFilter({



              audienceId: value,



            })



          }



          options={[



            {



              value: "all",



              label: "All audiences",



            },



            ...((audiences.data ?? []) as AudiencePageAudience[]).map(

              (audience) => ({



                value: audience.id,



                label: audience.name,



              }),



            ),



          ]}



        />







        <FilterSelect



          label="Tag"



          value={query.tagId ?? ""}



          onChange={(value) =>



            setFilter({



              tagId: value || undefined,



            })



          }



          options={[



            {



              value: "",



              label: "Any tag",



            },



            ...((tags.data ?? []) as AudiencePageTag[]).map(

              (tag) => ({



                value: tag.id,



                label: tag.name,



              }),



            ),



          ]}



        />







        <span className="fm-toolbar__spacer" />







        <span className="fm-muted fm-small">



          {contacts.data



            ? `${formatNumber(sorted.length)} shown`



            : ""}



        </span>



      </Toolbar>







      {selected.size > 0 && (



        <div



          className="fm-bulkbar"



          role="region"



          aria-label="Bulk actions"



        >



          <strong>{selected.size} selected</strong>







          <ActionMenu



            trigger="button"



            buttonLabel="Add tag"



            items={((tags.data ?? []) as AudiencePageTag[]).map(



              (tag) => ({



                label: tag.name,



                icon: "tag",



                onSelect: () =>



                  bulk(



                    {



                      kind: "tag",



                      tagId: tag.id,



                    },



                    `Tagged ${ids.length} contacts “${tag.name}”.`,



                  ),



              }),



            )}



          />







          <ActionMenu



            trigger="button"



            buttonLabel="Remove tag"



            items={((tags.data ?? []) as AudiencePageTag[]).map(



              (tag) => ({



                label: tag.name,



                icon: "x",



                onSelect: () =>



                  bulk(



                    {



                      kind: "untag",



                      tagId: tag.id,



                    },



                    `Removed “${tag.name}” from ${ids.length} contacts.`,



                  ),



              }),



            )}



          />







          <Button



            size="sm"



            onClick={() =>



              bulk(



                {



                  kind: "status",



                  status: "subscribed",



                },



                `Subscribed ${ids.length} contacts.`,



              )



            }



          >



            Subscribe



          </Button>







          <Button



            size="sm"



            onClick={() =>



              bulk(



                {



                  kind: "status",



                  status: "unsubscribed",



                },



                `Unsubscribed ${ids.length} contacts.`,



              )



            }



          >



            Unsubscribe



          </Button>







          <Button



            size="sm"



            icon="download"



            onClick={() =>



              downloadText(



                "fockis-selected-contacts.csv",



                toCsv(



                  sorted.filter((contact: AudiencePageContact) =>



                    selected.has(contact.id),



                  ),



                ),



                "text/csv",



              )



            }



          >



            Export



          </Button>







          <Button



            size="sm"



            variant="danger"



            icon="trash"



            onClick={() =>



              bulk(



                {



                  kind: "delete",



                },



                `Deleted ${ids.length} contacts.`,



              )



            }



          >



            Delete



          </Button>







          <span className="fm-toolbar__spacer" />







          <Button



            size="sm"



            variant="ghost"



            onClick={() => setSelected(new Set())}



          >



            Clear selection



          </Button>



        </div>



      )}







      <Panel flush>



        {contacts.error ? (



          <ErrorState



            message={contacts.error}



            onRetry={contacts.reload}



          />



        ) : contacts.loading ? (



          <SkeletonRows rows={10} cols={7} />



        ) : sorted.length === 0 ? (



          <EmptyState



            icon="users"



            title="No contacts match"



            body="Try another filter, or add contacts by hand or from a CSV file."



            action={



              <Button



                icon="upload"



                onClick={() => setImportOpen(true)}



              >



                Import contacts



              </Button>



            }



          />



        ) : (



          <>



            <AudienceTable



              contacts={pageRows}



              tags={tags.data ?? []}



              selected={selected}



              onToggle={(id: string) =>



                setSelected((current) => {



                  const next = new Set(current);







                  if (next.has(id)) {



                    next.delete(id);



                  } else {



                    next.add(id);



                  }







                  return next;



                })



              }



              onToggleAll={(on: boolean) =>



                setSelected((current) => {



                  const next = new Set(current);







                  pageRows.forEach((contact: Contact) => {



                    if (on) {



                      next.add(contact.id);



                    } else {



                      next.delete(contact.id);



                    }



                  });







                  return next;



                })



              }



              onQuickView={setQuick}



              sort={sort}



              onSort={(key: SortKey) =>



                setSort((current) => ({



                  key,



                  dir:



                    current.key === key &&



                    current.dir === "desc"



                      ? "asc"



                      : "desc",



                }))



              }



            />







            <div className="fm-pager">



              <span>



                Page {page + 1} of {pages}



              </span>







              <Button



                size="sm"



                icon="chevronLeft"



                disabled={page === 0}



                onClick={() =>



                  setPage((current) => current - 1)



                }



              >



                Previous



              </Button>







              <Button



                size="sm"



                iconRight="chevronRight"



                disabled={page >= pages - 1}



                onClick={() =>



                  setPage((current) => current + 1)



                }



              >



                Next



              </Button>



            </div>



          </>



        )}



      </Panel>







      <ContactDrawer



        contact={quick}



        tags={tags.data ?? []}



        onClose={() => setQuick(null)}



      />







      <Modal



        open={addOpen}



        title="Add contact"



        description="Only add people who agreed to hear from you."



        onClose={() => setAddOpen(false)}



        footer={



          <>



            <Button onClick={() => setAddOpen(false)}>



              Cancel



            </Button>







            <Button



              variant="primary"



              onClick={async () => {



                setFormTouched(true);







                if (



                  formErrors.email ||



                  formErrors.firstName



                ) {



                  return;



                }







                const contact = await run(



                  () => audienceApi.addContact(form),



                  `Added ${form.email}.`,



                );







                if (contact) {



                  setAddOpen(false);



                  contacts.reload();



                }



              }}



            >



              Add contact



            </Button>



          </>



        }



      >



        <div className="fm-formgrid">



          <TextField



            label="First name"



            value={form.firstName}



            onChange={(event) =>



              setForm({



                ...form,



                firstName: event.target.value,



              })



            }



            error={



              formTouched



                ? formErrors.firstName



                : undefined



            }



            data-autofocus



          />







          <TextField



            label="Last name"



            optional



            value={form.lastName}



            onChange={(event) =>



              setForm({



                ...form,



                lastName: event.target.value,



              })



            }



          />







          <TextField



            className="fm-span-full"



            label="Email"



            type="email"



            value={form.email}



            onChange={(event) =>



              setForm({



                ...form,



                email: event.target.value,



              })



            }



            error={



              formTouched



                ? formErrors.email



                : undefined



            }



          />







          <TextField



            label="Phone"



            optional



            type="tel"



            value={form.phone}



            onChange={(event) =>



              setForm({



                ...form,



                phone: event.target.value,



              })



            }



          />







          <TextField



            label="Location"



            optional



            value={form.location}



            onChange={(event) =>



              setForm({



                ...form,



                location: event.target.value,



              })



            }



          />







          <SelectField



            className="fm-span-full"



            label="Status"



            value={form.status}



            onChange={(event) =>



              setForm({



                ...form,



                status: event.target.value as ContactStatus,



              })



            }



            options={(



              Object.keys(



                CONTACT_STATUS_LABELS,



              ) as ContactStatus[]



            )



              .filter((status) => status !== "cleaned")



              .map((status) => ({



                value: status,



                label: CONTACT_STATUS_LABELS[status],



              }))}



            hint='“Pending” sends a confirmation email when double opt-in is on.'



          />



        </div>



      </Modal>







      <Modal



        open={importOpen}



        title="Import contacts"



        description="Upload a CSV with an email column. First and last name columns are optional."



        onClose={() => setImportOpen(false)}



        size="lg"



        footer={



          <>



            <Button



              onClick={() => setImportOpen(false)}



            >



              Cancel



            </Button>







            <Button



              variant="primary"



              icon="upload"



              disabled={



                csv.trim().split(/\n/).length < 2



              }



              onClick={async () => {



                const result = await run(



                  () => audienceApi.importCsv(csv),



                );







                if (result) {



                  setImportOpen(false);



                  contacts.reload();







                  run(



                    async () => result,



                    `Imported ${result.imported} contacts. Skipped ${result.skipped} (invalid or duplicate).`,



                  );



                }



              }}



            >



              Import



            </Button>



          </>



        }



      >



        <label className="fm-filedrop">



          <input



            type="file"



            accept=".csv,text/csv"



            onChange={async (event) => {



              const file = event.target.files?.[0];







              if (file) {



                setCsv(await file.text());



              }



            }}



          />







          <span>Choose a CSV file</span>



        </label>







        <TextArea



          label="Or paste CSV"



          rows={8}



          value={csv}



          onChange={(event) =>



            setCsv(event.target.value)



          }



          className="fm-mono"



        />







        <Notice tone="warning">



          Importing confirms that every contact gave



          permission to receive email from Fockis.



        </Notice>



      </Modal>



    </div>



  );



}