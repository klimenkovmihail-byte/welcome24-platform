import { api } from './apiClient';

export type OnboardingStepKey = 'profile' | 'bot' | 'course' | 'request';
export type OnboardingStep = { key: OnboardingStepKey; done: boolean };
export type OnboardingState = {
  show: boolean;
  allDone: boolean;
  dismissed: boolean;
  name: string;
  steps: OnboardingStep[];
};

export const onboardingApi = {
  get: () => api.get<OnboardingState>('/api/onboarding/me'),
  dismiss: () => api.post<{ ok: boolean }>('/api/onboarding/dismiss'),
};
