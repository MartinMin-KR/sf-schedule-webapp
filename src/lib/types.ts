export type TravelerProfile = {
  id: string;
  rowNumber: number;
  name: string;
  groupNumber: number;
  groupLabel: string;
  vehicle: string;
};

export type PlannerFilters = {
  name: string;
};

export type ScheduleSegment = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  width: number;
};

export type CompanyProfile = {
  slug: string;
  placeLabel: string;
  officialName: string;
  category: string;
  summary: string;
  keywords: string[];
  whyItMatters: string;
  whatToWatch: string[];
};

export type ScheduleEntry = {
  id: string;
  slotKey: string;
  slotLabel: string;
  rawLabel: string;
  displayLabel: string;
  isCompanyVisit: boolean;
  company?: CompanyProfile;
};

export type ScheduleImageConfig = {
  src: string;
  width: number;
  height: number;
  headerTop: number;
  headerHeight: number;
  rowTop: number;
  rowHeight: number;
};
