export type DeskTodayCheckin = {
  id: string;
  timestamp: string;
  member: { fullName: string; phone: string };
};

export type DeskExpiringMember = {
  id: string;
  fullName: string;
  phone: string;
  subscriptionEnd: string;
};

export type DeskTodaySummary = {
  todayCheckins: number;
  expiringSoon: number;
  expired: number;
  checkins: DeskTodayCheckin[];
  expiringMembers: DeskExpiringMember[];
};
