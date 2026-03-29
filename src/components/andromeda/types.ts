export type HudState = 'active' | 'seen' | 'pending';

export interface Panel {
  id: string;
  label: string;
  description?: string;
}
