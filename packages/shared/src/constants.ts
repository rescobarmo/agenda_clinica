export const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CLINIC_ADMIN: "CLINIC_ADMIN",
  BRANCH_ADMIN: "BRANCH_ADMIN",
  RECEPTIONIST: "RECEPTIONIST",
  DOCTOR: "DOCTOR",
  PATIENT: "PATIENT",
  WHATSAPP_BOT: "WHATSAPP_BOT",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const AppointmentStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
  ATTENDED: "ATTENDED",
  NO_SHOW: "NO_SHOW",
} as const;

export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const QUEUE_NAMES = {
  WHATSAPP_MESSAGES: "whatsapp:messages",
  NOTIFICATIONS: "notifications",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
