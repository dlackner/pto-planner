export interface User {
  id: number;
  name: string;
  created_at: string;
}

export interface UserSettings {
  user_id: number;
  accrual_rate: number;
  current_hours: number;
  sick_days: number;
  buffer_days: number;
  hours_per_day: number;
  max_accrual: number;
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
}

export interface PtoDay {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  type: 'pto' | 'sick';
}

export interface Recommendation {
  key: string;
  label: string;
  description: string;
  dates: string[]; // YYYY-MM-DD
}
