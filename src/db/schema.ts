import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// User Profiles synced with Firebase Auth / Campus Directory
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('Student'),
  department: text('department'),
  semester: text('semester'),
  designation: text('designation'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Student Master Records
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').notNull().unique(),
  name: text('name').notNull(),
  department: text('department').notNull(),
  semester: text('semester').notNull().default('1'),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Attendance Tracking
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  recordId: text('record_id').notNull().unique(),
  studentId: text('student_id').notNull(),
  totalClasses: integer('total_classes').notNull(),
  classesAttended: integer('classes_attended').notNull(),
  attendancePercentage: numeric('attendance_percentage', { precision: 5, scale: 2 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Academic Marks
export const marks = pgTable('marks', {
  id: serial('id').primaryKey(),
  recordId: text('record_id').notNull().unique(),
  studentId: text('student_id').notNull(),
  subject: text('subject').notNull(),
  internalMarks: numeric('internal_marks', { precision: 5, scale: 2 }).notNull(),
  examMarks: numeric('exam_marks', { precision: 5, scale: 2 }).notNull(),
  totalMarks: numeric('total_marks', { precision: 5, scale: 2 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Feedback & Sentiment Logging
export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  feedbackId: text('feedback_id').notNull().unique(),
  studentId: text('student_id').notNull(),
  timestamp: text('timestamp').notNull(),
  feedbackText: text('feedback_text').notNull(),
  sentiment: text('sentiment').notNull(),
  category: text('category').notNull(),
  extractedKeywords: text('extracted_keywords').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Risk Analysis
export const riskAnalysis = pgTable('risk_analysis', {
  id: serial('id').primaryKey(),
  analysisId: text('analysis_id').notNull().unique(),
  studentId: text('student_id').notNull(),
  calculatedScore: numeric('calculated_score', { precision: 5, scale: 2 }).notNull(),
  riskLevel: text('risk_level').notNull(),
  dateEvaluated: text('date_evaluated').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Actionable Recommendations
export const recommendations = pgTable('recommendations', {
  id: serial('id').primaryKey(),
  recId: text('rec_id').notNull().unique(),
  studentId: text('student_id').notNull(),
  riskLevel: text('risk_level').notNull(),
  recommendedAction: text('recommended_action').notNull(),
  status: text('status').notNull().default('Pending'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
