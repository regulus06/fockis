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
    patch: Partial<ApplicationPayload>
  ) => void;

  submit: () => Promise<void>;

  resetFlow: (jobId: string) => void;
}

const lastStepIndex =
  APPLICATION_STEPS.length - 1;

const reviewStepIndex =
  APPLICATION_STEPS.indexOf("Review");

export const useApplicationFlow =
  create<ApplicationFlowState>((set, get) => ({
    currentStep: 0,

    payload: {},

    isSubmitting: false,

    submitError: null,

    submittedApplicationId: null,

    /*
     * ============================================================
     * NEXT
     * ============================================================
     */

    goNext: () => {
      const {
        currentStep,
        isSubmitting,
      } = get();

      /*
       * Prevent duplicate submissions.
       */

      if (isSubmitting) {
        return;
      }

      /*
       * Review -> Submit
       */

      if (
        currentStep ===
        reviewStepIndex
      ) {
        void get().submit();
        return;
      }

      /*
       * Move to next step.
       */

      if (
        currentStep <
        lastStepIndex
      ) {
        set({
          currentStep:
            currentStep + 1,
        });
      }
    },

    /*
     * ============================================================
     * BACK
     * ============================================================
     */

    goBack: () => {
      const {
        currentStep,
        isSubmitting,
      } = get();

      if (isSubmitting) {
        return;
      }

      if (currentStep > 0) {
        set({
          currentStep:
            currentStep - 1,
        });
      }
    },

    /*
     * ============================================================
     * UPDATE APPLICATION
     * ============================================================
     */

    updatePayload: (
      patch: Partial<ApplicationPayload>
    ) => {
      set((state) => ({
        payload: {
          ...state.payload,
          ...patch,
        },
      }));
    },

    /*
     * ============================================================
     * SUBMIT APPLICATION
     * ============================================================
     */

    submit: async () => {
      const {
        payload,
        isSubmitting,
      } = get();

      /*
       * Prevent duplicate requests.
       */

      if (isSubmitting) {
        return;
      }

      /*
       * Basic client-side validation.
       *
       * The backend DTO remains the final authority.
       */

      if (!payload.jobId) {
        set({
          submitError:
            "Job ID is missing.",
        });

        return;
      }

      if (!payload.fullName) {
        set({
          submitError:
            "Full name is required.",
        });

        return;
      }

      if (!payload.email) {
        set({
          submitError:
            "Email is required.",
        });

        return;
      }

      if (!payload.phone) {
        set({
          submitError:
            "Phone number is required.",
        });

        return;
      }

      if (!payload.location) {
        set({
          submitError:
            "Location is required.",
        });

        return;
      }

      if (!payload.education) {
        set({
          submitError:
            "Education information is required.",
        });

        return;
      }

      if (
        payload.workAuthorized ===
        undefined
      ) {
        set({
          submitError:
            "Please provide your work authorization status.",
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
            payload as ApplicationPayload
          );

        set({
          submittedApplicationId:
            application.id,

          currentStep:
            lastStepIndex,

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

    /*
     * ============================================================
     * RESET APPLICATION FLOW
     * ============================================================
     */

    resetFlow: (
      jobId: string
    ) => {
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
  }));