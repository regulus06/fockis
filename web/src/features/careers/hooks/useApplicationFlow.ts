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
  APPLICATION_STEPS.length - 2;

export const useApplicationFlow =
  create<ApplicationFlowState>((set, get) => ({
    currentStep: 0,

    payload: {},

    isSubmitting: false,

    submitError: null,

    submittedApplicationId: null,

    goNext: () => {
      const { currentStep } = get();

      if (currentStep === reviewStepIndex) {
        void get().submit();
        return;
      }

      if (currentStep < lastStepIndex) {
        set({
          currentStep: currentStep + 1,
        });
      }
    },

    goBack: () => {
      const { currentStep } = get();

      if (currentStep > 0) {
        set({
          currentStep: currentStep - 1,
        });
      }
    },

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

    submit: async () => {
      const { payload } = get();

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
              : "Could not submit application",

          isSubmitting: false,
        });
      }
    },

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
  }));