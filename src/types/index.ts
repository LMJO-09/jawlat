export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  isBlocked: boolean;
  restrictedActions: string[];
  hasFlame?: boolean;
  createdAt: any;
}

export interface Round {
  id: string;
  name: string;
  duration: number; // in minutes
  breakAfter: number; // in minutes
  breakDuration: number; // in minutes
  startTime: any;
  status: 'active' | 'completed' | 'cancelled';
  creatorId: string;
  participants: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  senderRole: UserRole;
  timestamp: any;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  senderId: string;
  senderEmail: string;
  status: 'open' | 'resolved';
  timestamp: any;
}

export interface SharedContent {
  id: string;
  type: 'schedule' | 'expression';
  content: string;
  creatorId: string;
  creatorName: string;
  timestamp: any;
}
