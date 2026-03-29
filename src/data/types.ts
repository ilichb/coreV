export interface BitacoraEvent {
  id: string;
  type: string;
  data?: any;
  timestamp: string;
  userId?: string;
  result?: any;
  title?: string;
  description?: string;
  score?: number;
  metadata?: any;
  visible?: boolean;
  category?: string;
}

export type ProfileType = 'investor' | 'ally' | 'talent' | 'institution';

export interface Project {
  id: string;
  name: string;
  status: string;
  sector: string[];
  visible: boolean;
  maxScore?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  totalScore?: number;
  maxScore?: number;
  passed?: boolean;
  stageScores?: Record<number, number>;
  completedAt?: string;
}

export interface ValidationStage {
  name: string;
  completed: boolean;
  maxScore: number;
}

export interface Notification {
  id: string;
  message: string;
  title: string;
  type: string;
  date: string;
  visible: boolean;
}

export interface Gallery {
  id: string;
  images: string[];
  title: string;
  description: string;
  date: string;
  visible: boolean;
}

export interface Video {
  id: string;
  url: string;
}

export interface ProfileValidation {
  id: ProfileType;
  title: string;
  subtitle: string;
  steps: Array<{
    placeholder?: string;
    required: boolean;
  }>;
}
