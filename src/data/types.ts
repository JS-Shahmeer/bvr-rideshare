export type Role = 'rider' | 'driver';

export type ServiceArea = 'Newcastle' | 'Medowie' | 'Maitland' | 'Nelson Bay';

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'enroute'
  | 'arrived'
  | 'inprogress'
  | 'completed'
  | 'cancelled'
  | 'declined';

export type PaymentMethod = 'cash' | 'card';

export type When = 'now' | 'scheduled';

export interface FareBreakdown {
  km: number;
  min: number;
  distance: number;
  time: number;
  nsw: number;
  ctp: number;
  admin: number;
  total: number;
}

export interface Booking {
  id: string;
  riderId: string | null;
  name: string;
  phone: string;
  pickup: ServiceArea;
  destination: ServiceArea;
  when: When;
  /** ISO timestamp for scheduled rides, null for "ride now". */
  scheduledAt: string | null;
  passengers: number;
  payment: PaymentMethod;
  status: BookingStatus;
  createdAt: string;
  completedAt?: string;
  fare: FareBreakdown;
  cancellationCharge: number;
  rating: number;
}

export interface AppNotification {
  id: string;
  role: Role;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface FareSettings {
  kmRate: number;
  minRate: number;
  cancellationEnabled: boolean;
  cancellationFee: number;
}

export interface Account {
  role: Role;
  name: string;
  email: string;
  phone: string;
}

export interface BookingDraft {
  pickup: ServiceArea;
  destination: ServiceArea;
  when: When;
  scheduledAt: string | null;
  passengers: number;
  payment: PaymentMethod;
  name: string;
  phone: string;
}
