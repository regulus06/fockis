import { useMemo, useState } from "react";



import { useNavigate, useSearchParams } from "react-router-dom";



import type {

  Audience,

  CampaignStatus,

  CampaignType,

} from "../types/fockis-mail.types";



import { useCampaigns } from "../hooks/useCampaigns";



import { useAudiences } from "../hooks/useAudience";



import { useAction, useMarketingPath } from "../hooks/useMailchimp";



import { useCampaignActions } from "../components/useCampaignActions";



import { CampaignTable } from "../components/CampaignTable";



import { CampaignCard } from "../components/CampaignCard";



import {



  Button,



  LinkButton,



  IconButton,



} from "../components/ui/Button";



import {



  PageHeader,



  Panel,



  Toolbar,



} from "../components/ui/Layout";



import { Tabs } from "../components/ui/Tabs";



import {



  FilterSelect,



  SearchInput,



  TextArea,



  TextField,



} from "../components/ui/Field";



import {



  EmptyState,



  ErrorState,



  SkeletonRows,



} from "../components/ui/Feedback";



import { Modal } from "../components/ui/Overlay";



import { CAMPAIGN_TYPE_LABELS } from "../utils/labels";



import {



  campaignsApi,



  openRate,



} from "../services/campaignsApi";







type CampaignAudience = Audience & {

  name: string;

};



type TabId = "all" | CampaignStatus;



type Perf = "all" | "high" | "average" | "low";







const TABS: Array<{



  id: TabId;



  label: string;



}> = [



  { id: "all", label: "All" },



  { id: "draft", label: "Drafts" },



  { id: "scheduled", label: "Scheduled" },



  { id: "sending", label: "Sending" },



  { id: "sent", label: "Sent" },



  { id: "paused", label: "Paused" },



  { id: "archived", label: "Archived" },



];







type DateFilter = "all" | "7" | "30" | "90";







export default function CampaignsPage() {



  const to = useMarketingPath();



  const navigate = useNavigate();



  const run = useAction();



  const [params, setParams] = useSearchParams();







  const tab =



    (params.get("status") as TabId | null) ??



    "all";







  const [search, setSearch] = useState(



    params.get("search") ?? "",



  );







  const [type, setType] = useState<



    "all" | CampaignType



 >("all");







  const [audienceId, setAudienceId] =



    useState("all");







  const [performance, setPerformance] =



    useState<Perf>("all");







  const [dateFilter, setDateFilter] =



    useState<DateFilter>("all");







  const [view, setView] = useState<



    "table" | "cards"



 >("table");







  const [importOpen, setImportOpen] =



    useState(false);







  const [importName, setImportName] =



    useState("");







  const [importHtml, setImportHtml] =



    useState("");







  const all = useCampaigns({



    search,



    type,



    audienceId,



    performance,



  });







  const audiences = useAudiences();







  const actions = useCampaignActions(



    all.reload,



  );







  const counts = useMemo(() => {



    const map: Record<string, number> = {



      all: 0,



    };







    (all.data ?? []).forEach((campaign) => {



      map.all +=



        campaign.status === "archived"



          ? 0



          : 1;







      map[campaign.status] =



        (map[campaign.status] ?? 0) + 1;



    });







    return map;



  }, [all.data]);







  const visible = (



    all.data ?? []



  ).filter((campaign) => {



    if (



      tab === "all"



        ? campaign.status === "archived"



        : campaign.status !== tab



    ) {



      return false;



    }







    if (dateFilter !== "all") {



      const cutoff =



        Date.now() -



        Number(dateFilter) *



          86400000;







      const campaignDate =



        campaign.sentAt ??



        campaign.scheduledAt ??



        campaign.createdAt;







      if (



        new Date(campaignDate).getTime() <



        cutoff



      ) {



        return false;



      }



    }







    return true;



  });







  const filtersActive =



    Boolean(search) ||



    type !== "all" ||



    audienceId !== "all" ||



    performance !== "all" ||



    dateFilter !== "all";







  const clearFilters = () => {



    setSearch("");



    setType("all");



    setAudienceId("all");



    setPerformance("all");



    setDateFilter("all");



  };







  const campaignAudiences =

    (audiences.data ?? []) as CampaignAudience[];



  const audienceName = (id: string) =>

    campaignAudiences.find(

      (audience) => audience.id === id,

    )?.name ?? "—";







  return (



    <div className="fm-page">



      <PageHeader



        title="Campaigns"



        description="Plan, send, and measure every email you send to Fockis audiences."



        actions={



          <>



            <Button



              icon="upload"



              onClick={() =>



                setImportOpen(true)



              }



           >



              Import campaign



            </Button>







            <LinkButton



              to={to("compose")}



              variant="primary"



              icon="plus"



           >



              Create campaign



            </LinkButton>



          </>



        }



      />







      <Tabs



        label="Campaign status"



        items={TABS.map((item) => ({



          ...item,



          count: counts[item.id] ?? 0,



        }))}



        value={tab}



        onChange={(value) =>



          setParams(



            value === "all"



              ? {}



              : { status: value },



          )



        }



      />







      <Toolbar>



        <SearchInput



          value={search}



          onChange={setSearch}



          placeholder="Search by name or subject"



        />







        <FilterSelect



          label="Campaign type"



          value={type}



          onChange={(value) =>



            setType(



              value as



                | "all"



                | CampaignType,



            )



          }



          options={[



            {



              value: "all",



              label: "All types",



            },



            ...Object.entries(



              CAMPAIGN_TYPE_LABELS,



            ).map(



              ([value, label]) => ({



                value,



                label,



              }),



            ),



          ]}



        />







        <FilterSelect



          label="Audience"



          value={audienceId}



          onChange={setAudienceId}



          options={[



            {



              value: "all",



              label: "All audiences",



            },



            ...campaignAudiences.map(



              (audience) => ({



                value: audience.id,



                label: audience.name,



              }),



            ),



          ]}



        />







        <FilterSelect



          label="Date"



          value={dateFilter}



          onChange={(value) =>



            setDateFilter(



              value as DateFilter,



            )



          }



          options={[



            {



              value: "all",



              label: "Any date",



            },



            {



              value: "7",



              label: "Last 7 days",



            },



            {



              value: "30",



              label: "Last 30 days",



            },



            {



              value: "90",



              label: "Last 90 days",



            },



          ]}



        />







        <FilterSelect



          label="Performance"



          value={performance}



          onChange={(value) =>



            setPerformance(



              value as Perf,



            )



          }



          options={[



            {



              value: "all",



              label: "Any performance",



            },



            {



              value: "high",



              label: "High (40%+ opens)",



            },



            {



              value: "average",



              label: "Average (25–40%)",



            },



            {



              value: "low",



              label: "Low (under 25%)",



            },



          ]}



        />







        {filtersActive && (



          <Button



            variant="ghost"



            size="sm"



            onClick={clearFilters}



         >



            Clear filters



          </Button>



        )}







        <span className="fm-toolbar__spacer" />







        <div



          className="fm-viewtoggle"



          role="group"



          aria-label="View"



       >



          <IconButton



            icon="layout"



            label="Table view"



            active={view === "table"}



            onClick={() =>



              setView("table")



            }



          />







          <IconButton



            icon="grid"



            label="Card view"



            active={view === "cards"}



            onClick={() =>



              setView("cards")



            }



          />



        </div>



      </Toolbar>







      {all.error ? (



        <ErrorState



          message={all.error}



          onRetry={all.reload}



        />



      ) : all.loading ? (



        <Panel flush>



          <SkeletonRows



            rows={8}



            cols={8}



          />



        </Panel>



      ) : visible.length === 0 ? (



        <Panel>



          {filtersActive ? (



            <EmptyState



              icon="filter"



              title="No campaigns match these filters"



              body="Try a different search term or clear the filters."



              action={



                <Button



                  onClick={clearFilters}



               >



                  Clear filters



                </Button>



              }



            />



          ) : (



            <EmptyState



              icon="send"



              title={



                tab === "all"



                  ? "No campaigns yet"



                  : `No ${



                      TABS.find(



                        (item) =>



                          item.id === tab,



                      )?.label.toLowerCase()



                    } campaigns`



              }



              body="Campaigns you create will show up here."



              action={



                <LinkButton



                  to={to("compose")}



                  variant="primary"



                  icon="plus"



               >



                  Create campaign



                </LinkButton>



              }



            />



          )}



        </Panel>



      ) : view === "table" ? (



        <Panel flush>



          <CampaignTable



            campaigns={visible}



            audiences={



              audiences.data ?? []



            }



            actionsFor={actions.itemsFor}



          />







          <p className="fm-tablefoot">



            {visible.length} campaign



            {visible.length === 1



              ? ""



              : "s"} · average open rate{" "}



            {(



              visible



                .filter(



                  (campaign) =>



                    campaign.stats



                      .delivered,



                )



                .reduce(



                  (sum, campaign) =>



                    sum +



                    openRate(



                      campaign,



                    ),



                  0,



                ) /



              Math.max(



                1,



                visible.filter(



                  (campaign) =>



                    campaign.stats



                      .delivered,



                ).length,



              )



            ).toFixed(1)}



            %



          </p>



        </Panel>



      ) : (



        <div className="fm-grid fm-grid--cards">



          {visible.map((campaign) => (



            <CampaignCard



              key={campaign.id}



              campaign={campaign}



              audienceName={audienceName(



                campaign.audienceId,



              )}



              actions={actions.itemsFor(



                campaign,



              )}



            />



          ))}



        </div>



      )}







      {actions.scheduleModal}







      <Modal



        open={importOpen}



        title="Import campaign"



        description="Paste HTML from another tool. It's saved as a draft you can review."



        onClose={() =>



          setImportOpen(false)



        }



        size="lg"



        footer={



          <>



            <Button



              onClick={() =>



                setImportOpen(false)



              }



           >



              Cancel



            </Button>







            <Button



              variant="primary"



              disabled={



                !importName.trim() ||



                importHtml.trim()



                  .length < 20



              }



              onClick={async () => {



                const campaign =



                  await run(



                    () =>



                      campaignsApi.importFromHtml(



                        importName.trim(),



                        importHtml,



                      ),



                    "Imported as a draft.",



                  );







                if (campaign) {



                  setImportOpen(false);



                  setImportName("");



                  setImportHtml("");



                  navigate(



                    to(



                      `campaigns/${campaign.id}`,



                    ),



                  );



                }



              }}



           >



              Import as draft



            </Button>



          </>



        }



     >



        <TextField



          label="Campaign name"



          value={importName}



          onChange={(event) =>



            setImportName(



              event.target.value,



            )



          }



          placeholder="Holiday newsletter"



          data-autofocus



        />







        <TextArea



          label="Email HTML"



          value={importHtml}



          onChange={(event) =>



            setImportHtml(



              event.target.value,



            )



          }



          rows={10}



          placeholder="<html>…</html>"



          hint="Scripts are removed by the backend before sending."



        />







        <label className="fm-filedrop">



          <input



            type="file"



            accept=".html,.htm,text/html"



            onChange={async (event) => {



              const file =



                event.target.files?.[0];







              if (!file) {



                return;



              }







              setImportHtml(



                await file.text(),



              );







              if (!importName) {



                setImportName(



                  file.name.replace(



                    /\.(html?)$/i,



                    "",



                  ),



                );



              }



            }}



          />







          <span>



            Or choose an .html file



          </span>



        </label>



      </Modal>



    </div>



  );



}
