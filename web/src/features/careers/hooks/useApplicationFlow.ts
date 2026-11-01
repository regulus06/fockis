
import { create } from "zustand";

import {
  APPLICATION_STEPS,
} from "../types";

import type {
  ApplicationPayload,
} from "../types";

import { applicationsApi } from "../services/applicationsApi";

interface ApplicationFlowState {
  currentStep: number;
  payload: Partial<ApplicationPayload>;
  isSubmitting: boolean;
  submitError: string | null;
  submittedApplicationId: string | null;

  goNext: () => void;
  goBack: () => void;

  updatePayload: (
    patch: Partial<ApplicationPayload>,
  ) => void;

  submit: () => Promise<void>;

  resetFlow: (jobId: string) => void;
}

interface ApplicationResponse {
  id?: string;
  _id?: string;
}

const lastStepIndex = Math.max(
  APPLICATION_STEPS.length - 1,
  0,
);

const reviewStepIndex = Math.max(
  APPLICATION_STEPS.length - 2,
  0,
);

export const useApplicationFlow = create<ApplicationFlowState>(
  (set, get) => ({
    currentStep: 0,

    payload: {},

    isSubmitting: false,

    submitError: null,

    submittedApplicationId: null,

    /* ======================================================
       NEXT STEP
    ====================================================== */

    goNext: () => {
      const {
        currentStep,
        isSubmitting,
        submittedApplicationId,
        submit,
      } = get();

      if (isSubmitting || submittedApplicationId) {
        return;
      }

      if (currentStep === reviewStepIndex) {
        void submit();
        return;
      }

      if (currentStep < lastStepIndex) {
        set({
          currentStep: currentStep + 1,
          submitError: null,
        });
      }
    },

    /* ======================================================
       PREVIOUS STEP
    ====================================================== */

    goBack: () => {
      const {
        currentStep,
        isSubmitting,
        submittedApplicationId,
      } = get();

      if (
        isSubmitting ||
        submittedApplicationId ||
        currentStep <= 0
      ) {
        return;
      }

      set({
        currentStep: currentStep - 1,
        submitError: null,
      });
    },

    /* ======================================================
       UPDATE APPLICATION DATA
    ====================================================== */

    updatePayload: (
      patch: Partial<ApplicationPayload>,
    ) => {
      if (get().isSubmitting || get().submittedApplicationId) {
        return;
      }

      set((state) => ({
        payload: {
          ...state.payload,
          ...patch,
        },
        submitError: null,
      }));
    },

    /* ======================================================
       SUBMIT APPLICATION

       POST /careers/applications
    ====================================================== */

    submit: async () => {
      const {
        payload,
        isSubmitting,
        submittedApplicationId,
      } = get();

      if (isSubmitting || submittedApplicationId) {
        return;
      }

      if (
        typeof payload.jobId !== "string" ||
        !payload.jobId.trim()
      ) {
        set({
          submitError: "A valid job is required before submitting.",
        });
        return;
      }

      set({
        isSubmitting: true,
        submitError: null,
      });

      try {
        const application =
          await applicationsApi.submitApplication(
            payload as ApplicationPayload,
          ) as ApplicationResponse;

        const applicationId =
          application?.id ??
          application?._id;

        if (!applicationId) {
          throw new Error(
            "The application was submitted, but the server did not return an application ID.",
          );
        }

        set({
          submittedApplicationId: applicationId,
          currentStep: lastStepIndex,
          isSubmitting: false,
          submitError: null,
        });
      } catch (err: unknown) {
        set({
          submitError:
            err instanceof Error
              ? err.message
              : "Could not submit application.",
          isSubmitting: false,
        });
      }
    },

    /* ======================================================
       RESET APPLICATION FLOW
    ====================================================== */

    resetFlow: (jobId: string) => {
      set({
        currentStep: 0,

        payload: {
          jobId,
        },

        isSubmitting: false,

        submitError: null,

        submittedApplicationId: null,
      });
    },
  }),
);
