export type UserRole = 'admin' | 'moderator' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  isBlocked: boolean;
  timeoutUntil?: any;
  timeoutReason?: string;
  restrictedSections?: string[];
  restrictedActions: string[];
  hasFlame?: boolean;
  generation?: '2008' | '2009' | '2010';
  createdAt: any;
  lastLogin?: any;
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
  senderRole: string; // Keep as string for flexibility
  senderGeneration?: string;
  timestamp: any;
}

export interface SupportTicket {
  id: string;
  subject?: string;
  message: string;
  senderId: string;
  senderEmail: string;
  status: 'open' | 'resolved';
  timestamp: any;
}

export interface SharedContent {
  id: string;
  type: 'schedule' | 'expression' | 'community';
  content: string;
  images?: string[];
  videos?: string[];
  pdfs?: string[];
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  creatorGeneration?: string;
  timestamp: any;
  likes?: string[]; // IDs of users who liked
  expiresAt?: any; // For controlled duration
  commentCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  creatorGeneration?: string;
  timestamp: any;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  creatorGeneration?: string;
  timestamp: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'like' | 'round_start' | 'round_end' | 'break_start' | 'break_end' | 'profile_update' | 'warning';
  read: boolean;
  timestamp: any;
  link?: string;
}
