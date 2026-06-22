export interface Team {
  id: string;
  name: string;
  sport: string;
  bio?: string;
  logoURL?: string;
  ownerId: string;
  players: string[];
  createdAt: number;
}

export interface TeamRequest {
  id: string;
  teamId: string;
  teamName: string;
  sport: string;
  from: string;
  to: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "team_invite" | "team_invite_response" | "payment_required" | "general";
  actionUrl?: string;
  read: boolean;
  createdAt: number;
  metadata?: any;
}
