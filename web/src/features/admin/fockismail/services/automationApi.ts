import type {
  Automation,
  AutomationStatus,
  Journey,
} from "../types/fockis-mail.types";

import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";

import type {
  AutomationTemplate,
} from "../data/templateMockData";

/**
 * The shared Fockis Mail domain types are intentionally kept compatible
 * with the rest of the application. These local API shapes add the fields
 * used by the Automations UI and returned by the Fockis Mail backend.
 */
type FockisAutomation = Automation & {
  businessId: string;
  status: AutomationStatus;
  contacts: number;
  emails: number;
  conversionRate: number;
  revenue: number;
  updatedAt: string;
  journeyId?: string;
  enrolled?: number;
  nodes?: any[];
  edges?: any[];
};

type FockisJourney = Journey & {
  businessId: string;
  name: string;
  status: Journey["status"] | "draft" | "active" | "paused";
  entered: number;
  completed: number;
  updatedAt: string;
  participants?: number;
  nodes?: any[];
  edges?: any[];
};

interface CreateAutomationResponse {
  automation: FockisAutomation;
  journey?: FockisJourney;
}

interface CreateAutomationPayload {
  name: string;
  trigger: string;
  templateId?: string;
  steps?: any[];
  nodes?: any[];
  edges?: any[];
}

interface CreateJourneyPayload {
  name: string;
}

function normalizeAutomation(
  automation: FockisAutomation,
): FockisAutomation {
  return {
    ...automation,

    id: String(
      automation.id,
    ),

    businessId:
      automation.businessId ??
      "",

    status:
      String(
        automation.status ??
          "draft",
      ).toLowerCase() as AutomationStatus,

    contacts:
      Number(
        automation.contacts ??
          automation.enrolled ??
          0,
      ),

    emails:
      Number(
        automation.emails ??
          0,
      ),

    conversionRate:
      Number(
        automation.conversionRate ??
          0,
      ),

    revenue:
      Number(
        automation.revenue ??
          0,
      ),

    updatedAt:
      automation.updatedAt ??
      new Date().toISOString(),
  };
}

function normalizeJourney(
  journey: FockisJourney,
): FockisJourney {
  return {
    ...journey,

    id: String(
      journey.id,
    ),

    businessId:
      journey.businessId ??
      "",

    status:
      String(
        journey.status ??
          "draft",
      ).toLowerCase() as FockisJourney["status"],

    entered:
      Number(
        journey.entered ??
          journey.participants ??
          0,
      ),

    completed:
      Number(
        journey.completed ??
          0,
      ),

    updatedAt:
      journey.updatedAt ??
      new Date().toISOString(),
  };
}

export const automationApi = {
  list: () =>
    call<FockisAutomation[]>(
      () => [],
      ENDPOINTS.automations,
    ).then(
      (items) =>
        items.map(
          normalizeAutomation,
        ),
    ),

  create: (
    name: string,
    trigger: string,
  ) =>
    call<FockisAutomation>(
      () => ({
        id: "",
        businessId: "",
        name,
        trigger,
        status: "draft" as AutomationStatus,
        contacts: 0,
        emails: 0,
        conversionRate: 0,
        revenue: 0,
        updatedAt:
          new Date().toISOString(),
      }),
      ENDPOINTS.automations,
      {
        method: "POST",
        body: {
          name,
          trigger,
        },
      },
    ).then(
      normalizeAutomation,
    ),

  createFromTemplate: (
    template: AutomationTemplate,
    name: string,
  ) => {
    const steps =
      structuredClone(
        template.steps,
      );

    return call<CreateAutomationResponse>(
      () => {
        const now =
          new Date().toISOString();

        const journey: FockisJourney = {
          id: "",
          businessId: "",
          name,
          status: "draft",
          entered: 0,
          completed: 0,
          updatedAt: now,
          nodes: structuredClone(
            steps,
          ).map(
            (node: any) => ({
              ...node,
              id:
                node.id ??
                crypto.randomUUID(),
            }),
          ),
        };

        const automation: FockisAutomation =
          {
            id: "",
            businessId: "",
            name,
            trigger:
              template.trigger,
            status: "draft" as AutomationStatus,
            contacts: 0,
            emails:
              steps.filter(
                (node: any) =>
                  String(
                    node?.kind ??
                      node?.type ??
                      "",
                  ).toLowerCase() ===
                  "email",
              ).length,
            conversionRate: 0,
            revenue: 0,
            updatedAt: now,
            journeyId:
              journey.id,
          };

        return {
          automation,
          journey,
        };
      },

      `${ENDPOINTS.automations}/from-template`,

      {
        method: "POST",

        body:
          {
            templateId:
              template.id,

            name,

            trigger:
              template.trigger,

            steps,
          } satisfies CreateAutomationPayload,
      },
    ).then(
      (response) => ({
        automation:
          normalizeAutomation(
            response.automation,
          ),

        journey:
          response.journey
            ? normalizeJourney(
                response.journey,
              )
            : undefined,
      }),
    );
  },

  setStatus: (
    id: string,
    status: AutomationStatus,
  ) =>
    call<FockisAutomation>(
      () => {
        throw new Error(
          "Automation status mock is unavailable.",
        );
      },

      ENDPOINTS.automation(
        id,
      ),

      {
        method: "PATCH",

        body: {
          status,
        },
      },
    ).then(
      normalizeAutomation,
    ),

  duplicate: (
    id: string,
  ) =>
    call<CreateAutomationResponse>(
      () => {
        throw new Error(
          "Automation duplicate mock is unavailable.",
        );
      },

      `${ENDPOINTS.automation(
        id,
      )}/duplicate`,

      {
        method: "POST",
      },
    ).then(
      (response) => ({
        automation:
          normalizeAutomation(
            response.automation,
          ),

        journey:
          response.journey
            ? normalizeJourney(
                response.journey,
              )
            : undefined,
      }),
    ),

  remove: (
    id: string,
  ) =>
    call<void>(
      () => undefined,
      ENDPOINTS.automation(
        id,
      ),
      {
        method: "DELETE",
      },
    ),

  journeys: () =>
    call<FockisJourney[]>(
      () => [],
      ENDPOINTS.journeys,
    ).then(
      (items) =>
        items.map(
          normalizeJourney,
        ),
    ),

  saveJourney: (
    journey: FockisJourney,
  ) =>
    call<FockisJourney>(
      () => ({
        ...journey,
        id: journey.id,
        updatedAt:
          new Date().toISOString(),
      }),

      ENDPOINTS.journey(
        journey.id,
      ),

      {
        method: "PUT",

        body: {
          name:
            journey.name,

          status:
            journey.status,

          nodes:
            journey.nodes ??
            [],

          edges:
            journey.edges ??
            [],
        },
      },
    ).then(
      normalizeJourney,
    ),

  createJourney: (
    name: string,
  ) =>
    call<FockisJourney>(
      () => ({
        id: "",
        businessId: "",
        name,
        status: "draft",
        entered: 0,
        completed: 0,
        updatedAt:
          new Date().toISOString(),
        nodes: [],
      }),

      ENDPOINTS.journeys,

      {
        method: "POST",

        body: {
          name,
        } satisfies CreateJourneyPayload,
      },
    ).then(
      normalizeJourney,
    ),
};
