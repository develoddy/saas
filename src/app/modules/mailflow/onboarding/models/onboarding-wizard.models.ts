export type BusinessType = 'ecommerce' | 'saas' | 'services' | 'education' | 'other';

export type OnboardingGoal = 'first-purchase' | 'trial-conversion' | 'engagement' | 'onboarding';

export type EmailTone = 'friendly' | 'professional' | 'casual';

export type ContactSourceType = 'csv' | 'manual' | 'existing';

export interface WizardStep {
  step: number;
  title: string;
  description: string;
  valid: boolean;
}

export interface ContactSource {
  type: ContactSourceType;
  data?: File | Contact[];
}

export interface Contact {
  email: string;
  name?: string;
  verified?: boolean;
}

export interface BrandInfo {
  name: string;
  tone: EmailTone;
}

export interface GenerateSequenceRequest {
  businessType: BusinessType;
  goal: OnboardingGoal;
  contactSource: ContactSource;
  brandInfo: BrandInfo;
}

export interface SequenceEmail {
  order: number;
  delayHours: number;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  editable: boolean;
}

export interface GeneratedSequence {
  sequenceId: string;
  name: string;
  emails: SequenceEmail[];
  estimatedContacts: number;
  status: 'draft' | 'active' | 'paused';
}

export interface SequenceStatus {
  sent: number;
  pending: number;
  failed: number;
  openRate?: number;
}
