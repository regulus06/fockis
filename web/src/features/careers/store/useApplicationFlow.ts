
import { create } from 'zustand';

import { APPLICATION_STEPS } from '../types';

import type { ApplicationPayload } from '../types';

import { applicationsApi } from '../services/applicationsApi';

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

const lastStepIndex = Math.max(0, APPLICATION_STEPS.length - 1);

const reviewStepIndex = APPLICATION_STEPS.indexOf('Review');

function validateApplication(
  payload: Partial<ApplicationPayload>,
): string | null {
  if (!payload.jobId?.trim()) {
    return 'Job ID is missing.';
  }

  if (!payload.fullName?.trim()) {
    return 'Full name is required.';
  }

  if (!payload.email?.trim()) {
    return 'Email address is required.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(payload.email.trim())) {
    return 'Please enter a valid email address.';
  }

  if (!payload.phone?.trim()) {
    return 'Phone number is required.';
  }

  if (!payload.location?.trim()) {
    return 'Location is required.';
  }

  if (!payload.education) {
    return 'Education information is required.';
  }

  if (!payload.education.school?.trim()) {
    return 'Please provide your school or institution.';
  }

  if (!payload.education.major?.trim()) {
    return 'Please provide your major or field of study.';
  }

  if (!payload.education.graduationDate?.trim()) {
    return 'Please provide your graduation date.';
  }

  if (payload.workAuthorized === undefined) {
    return 'Please provide your work authorization status.';
  }

  return null;
}

function getApplicationId(
  response: unknown,
): string | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const application = response as ApplicationResponse;

  return application.id || application._id || null;
}

export const useApplicationFlow = create<ApplicationFlowState>(
  (set, get) => ({
    currentStep: 0,

    payload: {},

    isSubmitting: false,

    submitError: null,

    submittedApplicationId: null,

    /*
     * ============================================================
     * NEXT STEP
     * ============================================================
     */

    goNext: () => {
      const {
        currentStep,
        isSubmitting,
        submittedApplicationId,
      } = get();

      if (isSubmitting || submittedApplicationId) {
        return;
      }

      if (currentStep === reviewStepIndex) {
        void get().submit();
        return;
      }

      if (currentStep < lastStepIndex) {
        set({
          currentStep: currentStep + 1,
          submitError: null,
        });
      }
    },

    /*
     * ============================================================
     * PREVIOUS STEP
     * ============================================================
     */

    goBack: () => {
      const {
        currentStep,
        isSubmitting,
        submittedApplicationId,
      } = get();

      if (isSubmitting || submittedApplicationId) {
        return;
      }

      if (currentStep > 0) {
        set({
          currentStep: currentStep - 1,
          submitError: null,
        });
      }
    },

    /*
     * ============================================================
     * UPDATE APPLICATION DATA
     * ============================================================
     */

    updatePayload: (patch) => {
      set((state) => {
        if (state.isSubmitting || state.submittedApplicationId) {
          return state;
        }

        return {
          payload: {
            ...state.payload,
            ...patch,
          },
          submitError: null,
        };
      });
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
        submittedApplicationId,
      } = get();

      if (isSubmitting || submittedApplicationId) {
        return;
      }

      const validationError = validateApplication(payload);

      if (validationError) {
        set({
          submitError: validationError,
        });

        return;
      }

      set({
        isSubmitting: true,
        submitError: null,
      });

      try {
        const response = await applicationsApi.submitApplication(
          payload as ApplicationPayload,
        );

        const applicationId = getApplicationId(response);

        if (!applicationId) {
          throw new Error(
            'The application was submitted, but the server did not return an application ID. Please check your applications before submitting again.',
          );
        }

        set({
          submittedApplicationId: applicationId,
          currentStep: lastStepIndex,
          isSubmitting: false,
          submitError: null,
        });
      } catch (error: unknown) {
        set({
          submitError:
            error instanceof Error
              ? error.message
              : 'Could not submit your application. Please try again.',
          isSubmitting: false,
        });
      }
    },

    /*
     * ============================================================
     * RESET APPLICATION
     * ============================================================
     */

    resetFlow: (jobId) => {
      if (get().isSubmitting) {
        return;
      }

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
