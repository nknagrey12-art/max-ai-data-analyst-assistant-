export interface ColumnAnalysis {
  name: string;
  type: "numeric" | "text" | "date" | "category";
  sampleValues: string[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  uniqueCount: number;
  topValues: { value: string; count: number; percentage: number }[];
  missingCount: number;
}

export interface DatasetSummary {
  totalRows: number;
  totalCols: number;
  columns: ColumnAnalysis[];
  sampleRows: Record<string, any>[];
  hasDuplicates: boolean;
  duplicateCount: number;
  columnsWithMissing: { name: string; count: number }[];
  suspiciousColumns: { name: string; reason: string }[];
  dataQualityScore: number;
}

export interface AnalysisTask {
  id: number;
  label: string;
}

export interface RecommendedChart {
  id: number;
  type: string; // "bar" | "line" | "pie" | "scatter"
  title: string;
}

export interface AnalysisResult {
  insights: string[];
  tasks: AnalysisTask[];
  charts: RecommendedChart[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  chartPayload?: {
    type: string; // "bar" | "line" | "pie" | "dashboard"
    title: string;
    xAxisKey: string;
    yAxisKey: string;
    data: any[];
  };
}

export interface DatasetPreset {
  name: string;
  icon: string;
  description: string;
  csvData: string;
}

export const DATASET_PRESETS: DatasetPreset[] = [
  {
    name: "Q1 Global Tech Retail Sales",
    icon: "ShoppingBag",
    description: "Multi-regional sales metrics with revenue, units sold, products, and categories.",
    csvData: `Sale_ID,Category,Units_Sold,Revenue_USD,Store_Region,Product_Name,Date
1001,Electronics,12,14399.88,North America,MacBook Pro 14",2026-01-05
1002,Accessories,45,2250.00,North America,USB-C Hub,2026-01-06
1003,Audio,25,6225.00,Europe,Noise-Cancelling Headphones,2026-01-08
1004,Wearables,18,5382.00,Asia Pacific,Smartwatch Series 9,2026-01-10
1005,Electronics,8,15999.92,Europe,Pro Display XDR,2026-01-11
1006,Accessories,110,3850.00,Asia Pacific,Wireless Mouse,2026-01-15
1007,Audio,40,3996.00,North America,Wireless Earbuds,2026-01-18
1008,Wearables,35,8750.00,Europe,Fitness Tracker TrackerX,2026-01-20
1009,Electronics,15,14999.85,Asia Pacific,iPad Air,2026-01-22
1010,Accessories,85,5100.00,North America,Mechanical Keyboard,2026-01-25
1011,Audio,15,3735.00,Europe,Noise-Cancelling Headphones,2026-01-28
1012,Wearables,22,6578.00,North America,Smartwatch Series 9,2026-02-01
1013,Electronics,5,5499.95,North America,Pro Display XDR,2026-02-03
1014,Accessories,60,1200.00,Asia Pacific,USB-C Hub,2026-02-06
1015,Audio,50,4995.00,Asia Pacific,Wireless Earbuds,2026-02-10
1016,Electronics,14,16799.86,Europe,MacBook Pro 14",2026-02-14
1017,Accessories,5,3000.00,,Premium Leather Sleeve,2026-02-18
1018,Wearables,30,7500.00,Asia Pacific,Fitness Tracker TrackerX,2026-02-22
1019,Electronics,20,19999.80,North America,iPad Air,2026-02-25
1020,Accessories,90,5400.00,Europe,Mechanical Keyboard,2026-02-28
1021,Audio,32,7968.00,Asia Pacific,Noise-Cancelling Headphones,2026-03-01
1022,Wearables,33,9867.00,Europe,Smartwatch Series 9,2026-03-04
1023,Electronics,10,11999.90,North America,MacBook Pro 14",2026-03-08
1024,Accessories,150,5250.00,Europe,Wireless Mouse,2026-03-12
1025,Accessories,150,5250.00,Europe,Wireless Mouse,2026-03-12` // intentional duplicate rows
  },
  {
    name: "SaaS User Engagement Insights",
    icon: "Users",
    description: "Product adoption indices, subscription tiers, active hours context, and support tickets count.",
    csvData: `User_ID,Plan_Tier,Weekly_Active_Hours,Support_Inquiries,Monthly_Revenue,Last_Login_Date,Onboarding_Complete
2001,Enterprise,42.5,3,499.00,2026-04-01,Yes
2002,Growth,18.2,1,149.00,2026-04-02,Yes
2003,Starter,5.5,0,49.00,2026-04-02,No
2004,Growth,22.8,4,149.00,2026-04-03,Yes
2005,Enterprise,55.0,8,499.00,2026-04-04,Yes
2006,Starter,1.2,1,49.00,2026-04-05,No
2007,Growth,15.0,,149.00,2026-04-06,Yes
2008,Enterprise,38.4,2,499.00,2026-04-07,Yes
2009,Starter,8.7,0,49.00,2026-04-08,Yes
2010,Growth,19.5,2,149.00,2026-04-09,Yes
2011,Enterprise,61.2,12,499.00,2026-04-10,No
2012,Starter,3.4,0,49.00,,No
2013,Growth,24.5,1,149.00,2026-04-12,Yes
2014,Enterprise,48.0,5,499.00,2026-04-12,Yes
2015,Starter,6.8,1,49.00,2026-04-13,Yes
2016,Growth,20.1,2,149.00,2026-04-14,Yes
2017,Enterprise,39.0,3,499.00,2026-04-15,Yes
2018,Growth,17.4,1,149.00,2026-04-16,No
2019,Starter,0.0,-5,49.00,2026-04-17,No
2020,Enterprise,44.2,4,499.00,2026-04-18,Yes` // intentional missing and bad negative value
  },
  {
    name: "Patient Wellness & Experience Metrics",
    icon: "HeartPulse",
    description: "Clinical patient feedback detailing wait hours, ratings, department types, and patient ages.",
    csvData: `Patient_ID,Department,Age,Wait_Time_Minutes,Satisfaction_Score,Admission_Date,Is_Rehospitalized
3001,Emergency,45,120,4,2026-05-01,No
3002,Pediatrics,12,25,9,2026-05-01,No
3003,Cardiology,68,45,8,2026-05-02,Yes
3004,Emergency,33,180,3,2026-05-02,No
3005,Cardiology,72,50,9,2026-05-03,No
3006,General Medicine,51,65,7,2026-05-03,No
3007,Pediatrics,8,15,10,2026-05-04,No
3008,Emergency,29,145,5,2026-05-04,No
3009,Cardiology,55,35,8,2026-05-05,Yes
3010,General Medicine,61,85,6,2026-05-05,No
3011,Emergency,42,110,4,2026-05-06,No
3012,Pediatrics,15,,8,2026-05-06,No
3013,Cardiology,81,55,9,2026-05-07,No
3014,General Medicine,38,40,7,2026-05-07,Yes
3015,Emergency,48,210,2,2026-05-08,No
3016,Cardiology,63,30,8,2026-05-08,No
3017,General Medicine,54,55,6,,No
3018,Pediatrics,6,20,9,2026-05-09,No
3019,Emergency,52,240,1,2026-05-10,Yes
3020,Cardiology,59,40,9,2026-05-10,No`
  }
];
