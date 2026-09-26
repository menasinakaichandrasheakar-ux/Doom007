export interface Student {
  StudentID: string;
  Name: string;
  Department: string;
  Semester: string;
  Email: string;
}

export interface AttendanceRecord {
  RecordID: string;
  StudentID: string;
  TotalClasses: string;
  ClassesAttended: string;
  AttendancePercentage: string;
}

export interface MarksRecord {
  RecordID: string;
  StudentID: string;
  Subject: string;
  InternalMarks: string;
  ExamMarks: string;
  TotalMarks: string;
}

export interface FeedbackRecord {
  FeedbackID: string;
  StudentID: string;
  Timestamp: string;
  FeedbackText: string;
  Sentiment: 'Positive' | 'Neutral' | 'Negative' | string;
  Category: 'Academic' | 'Support' | 'Campus/Infrastructure' | 'General' | string;
  ExtractedKeywords: string;
}

export interface RiskAnalysisRecord {
  AnalysisID: string;
  StudentID: string;
  CalculatedScore: string;
  RiskLevel: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Support Required' | string;
  DateEvaluated: string;
}

export interface RecommendationRecord {
  RecID: string;
  StudentID: string;
  RiskLevel: string;
  RecommendedAction: string;
  Status: 'Pending' | 'In Progress' | 'Completed' | string;
}

export interface CampusDataState {
  students: Student[];
  attendance: AttendanceRecord[];
  marks: MarksRecord[];
  feedback: FeedbackRecord[];
  riskAnalysis: RiskAnalysisRecord[];
  recommendations: RecommendationRecord[];
}

export interface VisitorProfile {
  id: string;
  name: string;
  role: "Student" | "Faculty" | "Visitor" | "Admin";
  department?: string;
  semester?: string;
  designation?: string;
  email?: string;
  facultyId?: string;
  courseName?: string;
  courseDescription?: string;
}
