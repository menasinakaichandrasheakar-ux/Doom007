"""
analytics.py
AI Multi-Factor Risk Engine, Intelligent Recommendation System & Campus Analytics
Unit 5: Data Science Libraries (Pandas, NumPy) & AI Risk Modeling
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

try:
    import pandas as pd
    import numpy as np
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

from models import (
    CSVStorageHandler, StudentManager, AttendanceMonitor, AcademicAnalyzer,
    RiskAnalysisRecord, RecommendationRecord
)
from nlp_engine import FeedbackProcessor


# =====================================================================
# AI-BASED MULTI-FACTOR STUDENT RISK ENGINE
# =====================================================================

class StudentRiskEngine:
    """
    Computes a composite multi-factor student risk score (0 to 100):
    - Attendance Weight (35%): Attendance < 75% adds severe penalty.
    - Academic Performance Weight (35%): Failing marks / low averages add risk penalty.
    - Feedback Sentiment Weight (20%): Negative sentiment polarity adds risk points.
    - Concern Frequency Weight (10%): Repeated grievance logs escalate penalty.
    """

    def __init__(self, storage: Optional[CSVStorageHandler] = None):
        self.storage = storage or CSVStorageHandler()
        self.filename = "risk_analysis.csv"
        self.student_mgr = StudentManager(self.storage)
        self.attendance_monitor = AttendanceMonitor(self.storage)
        self.academic_analyzer = AcademicAnalyzer(self.storage)

    def calculate_attendance_penalty(self, student_id: str) -> Tuple[float, Optional[float]]:
        """
        Attendance factor (Max 35 points):
        - Attendance >= 75%: Minimal penalty (0 to 5 points).
        - Attendance < 75%: Escalated penalty (15 to 35 points proportional to deficit).
        """
        att_record = self.attendance_monitor.get_record_by_student(student_id)
        if not att_record:
            # Neutral default if no attendance logged yet
            return 10.0, None

        pct = att_record.percentage
        if pct >= 85.0:
            penalty = 0.0
        elif pct >= 75.0:
            penalty = round(((85.0 - pct) / 10.0) * 5.0, 2)
        else:
            # Below 75% threshold: starts at 15.0 pts, up to 35.0 pts
            deficit = 75.0 - pct
            penalty = round(15.0 + min((deficit / 75.0) * 20.0, 20.0), 2)

        return min(penalty, 35.0), pct

    def calculate_academic_penalty(self, student_id: str) -> Tuple[float, float, int]:
        """
        Academic performance factor (Max 35 points):
        - Based on average marks (out of 100) and failing subjects (< 40%).
        """
        summary = self.academic_analyzer.get_student_academic_summary(student_id)
        if summary["total_subjects"] == 0:
            return 12.0, 0.0, 0

        avg = summary["average_marks"]
        failing_count = len(summary["failing_subjects"])

        if avg >= 75.0:
            base_penalty = 0.0
        elif avg >= 60.0:
            base_penalty = ((75.0 - avg) / 15.0) * 10.0
        elif avg >= 40.0:
            base_penalty = 10.0 + ((60.0 - avg) / 20.0) * 15.0
        else:
            base_penalty = 25.0 + min(((40.0 - avg) / 40.0) * 10.0, 10.0)

        # Additional failure surcharge: 5 points per failing subject
        fail_surcharge = failing_count * 5.0
        total_academic_penalty = round(min(base_penalty + fail_surcharge, 35.0), 2)

        return total_academic_penalty, avg, failing_count

    def calculate_sentiment_penalty(self, student_id: str) -> Tuple[float, float, int]:
        """
        Feedback Sentiment factor (Max 20 points) & Concern Frequency (Max 10 points):
        - Analyzes past student feedback logs from feedback.csv.
        """
        all_feedback = self.storage.read_csv("feedback.csv")
        student_feedback = [f for f in all_feedback if f.get("StudentID", "").strip().upper() == student_id.strip().upper()]

        if not student_feedback:
            return 0.0, 0.0, 0

        neg_count = 0
        sentiment_scores = []
        processor = FeedbackProcessor()

        for fb in student_feedback:
            text = fb.get("FeedbackText", "")
            sent = fb.get("Sentiment", "")
            if sent == "Negative":
                neg_count += 1
            polarity = processor.calculate_polarity_score(text)
            sentiment_scores.append(polarity)

        avg_polarity = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.0

        # Sentiment penalty (Max 20 pts): negative polarity converts to penalty
        if avg_polarity < 0:
            sentiment_penalty = min(abs(avg_polarity) * 20.0, 20.0)
        else:
            sentiment_penalty = 0.0

        # Concern frequency penalty (Max 10 pts):
        # 1 neg: 3 pts, 2 negs: 6 pts, 3+ negs: 10 pts
        if neg_count == 0:
            freq_penalty = 0.0
        elif neg_count == 1:
            freq_penalty = 3.5
        elif neg_count == 2:
            freq_penalty = 7.0
        else:
            freq_penalty = 10.0

        return round(sentiment_penalty, 2), round(freq_penalty, 2), neg_count

    def evaluate_student_risk(self, student_id: str) -> Dict[str, Any]:
        """
        Computes composite risk score and risk stratification level.
        """
        att_penalty, att_pct = self.calculate_attendance_penalty(student_id)
        acad_penalty, avg_marks, fail_count = self.calculate_academic_penalty(student_id)
        sentiment_penalty, freq_penalty, neg_count = self.calculate_sentiment_penalty(student_id)

        # Composite score (0 - 100)
        total_score = round(min(att_penalty + acad_penalty + sentiment_penalty + freq_penalty, 100.0), 2)

        # Stratification:
        # Low Risk: < 30
        # Moderate Risk: 30 <= Score < 60
        # High Risk: 60 <= Score < 80
        # Support Required: Score >= 80
        if total_score < 30.0:
            risk_level = "Low Risk"
        elif total_score < 60.0:
            risk_level = "Moderate Risk"
        elif total_score < 80.0:
            risk_level = "High Risk"
        else:
            risk_level = "Support Required"

        date_evaluated = datetime.now().strftime("%Y-%m-%d %H:%M")

        return {
            "StudentID": student_id,
            "AttendancePenalty": att_penalty,
            "AttendancePercentage": att_pct,
            "AcademicPenalty": acad_penalty,
            "AverageMarks": avg_marks,
            "FailingSubjectsCount": fail_count,
            "SentimentPenalty": sentiment_penalty,
            "FrequencyPenalty": freq_penalty,
            "NegativeFeedbackCount": neg_count,
            "CalculatedScore": total_score,
            "RiskLevel": risk_level,
            "DateEvaluated": date_evaluated
        }

    def evaluate_and_persist_all(self) -> List[RiskAnalysisRecord]:
        """Evaluates all registered students and saves to risk_analysis.csv."""
        students = self.student_mgr.get_all_students()
        results = []
        rows_to_save = []

        for idx, s in enumerate(students):
            eval_res = self.evaluate_student_risk(s.student_id)
            analysis_id = f"RSK{idx + 101}"
            record = RiskAnalysisRecord(
                analysis_id=analysis_id,
                student_id=s.student_id,
                calculated_score=eval_res["CalculatedScore"],
                risk_level=eval_res["RiskLevel"],
                date_evaluated=eval_res["DateEvaluated"]
            )
            results.append(record)
            rows_to_save.append(record.to_dict())

        self.storage.write_csv(self.filename, rows_to_save)
        return results

    def get_persisted_evaluations(self) -> List[RiskAnalysisRecord]:
        rows = self.storage.read_csv(self.filename)
        evals = []
        for r in rows:
            try:
                evals.append(RiskAnalysisRecord(
                    analysis_id=r["AnalysisID"],
                    student_id=r["StudentID"],
                    calculated_score=float(r["CalculatedScore"]),
                    risk_level=r["RiskLevel"],
                    date_evaluated=r["DateEvaluated"]
                ))
            except (KeyError, ValueError):
                continue
        return evals


# =====================================================================
# INTELLIGENT RECOMMENDATION SYSTEM
# =====================================================================

class RecommendationEngine:
    """
    Maps student risk triggers to automated institutional intervention actions:
    - High Risk / Poor Marks -> "Assign Subject-Specific Faculty Mentor"
    - Attendance < 75% -> "Trigger Attendance Counseling & Guardian Notification"
    - Negative Campus Feedback -> "Escalate to Campus Infrastructure/Support Cell"
    - Moderate Risk -> "Schedule Academic Peer Tutoring"
    - Support Required -> "Initiate Emergency Academic Intervention & Multi-departmental Support Plan"
    """

    def __init__(self, storage: Optional[CSVStorageHandler] = None):
        self.storage = storage or CSVStorageHandler()
        self.filename = "recommendations.csv"
        self.risk_engine = StudentRiskEngine(self.storage)

    def generate_recommendations_for_student(self, student_id: str) -> List[str]:
        """Determines automated institutional actions based on student risk profile."""
        eval_res = self.risk_engine.evaluate_student_risk(student_id)
        risk_level = eval_res["RiskLevel"]
        att_pct = eval_res["AttendancePercentage"]
        fail_count = eval_res["FailingSubjectsCount"]
        neg_fb = eval_res["NegativeFeedbackCount"]

        actions: List[str] = []

        # 1. Attendance Triggers
        if att_pct is not None and att_pct < 75.0:
            actions.append("Trigger Attendance Counseling & Guardian Notification (Attendance < 75%)")

        # 2. Academic / High Risk Triggers
        if fail_count > 0 or eval_res["AverageMarks"] < 45.0 or risk_level in ("High Risk", "Support Required"):
            actions.append("Assign Subject-Specific Faculty Mentor for Remedial Support")

        # 3. Grievance / Infrastructure Triggers
        if neg_fb > 0:
            actions.append("Escalate Grievance to Campus Infrastructure/Student Welfare Cell")

        # 4. Moderate Risk Triggers
        if risk_level == "Moderate Risk" and not actions:
            actions.append("Schedule Academic Peer Tutoring & Bi-weekly Progress Monitoring")

        # 5. Critical Support Required
        if risk_level == "Support Required":
            actions.append("Initiate Emergency Academic Intervention & Dean's Committee Review")

        # 6. Low Risk positive action
        if not actions and risk_level == "Low Risk":
            actions.append("Eligible for Honors Research Program & Peer Mentorship Leadership")

        return actions

    def refresh_all_recommendations(self) -> List[RecommendationRecord]:
        """Generates and updates recommendations in recommendations.csv."""
        students = self.risk_engine.student_mgr.get_all_students()
        rec_records = []
        rec_counter = 101

        for s in students:
            eval_res = self.risk_engine.evaluate_student_risk(s.student_id)
            actions = self.generate_recommendations_for_student(s.student_id)
            for action in actions:
                rec_id = f"REC{rec_counter}"
                rec_counter += 1
                rec_records.append(RecommendationRecord(
                    rec_id=rec_id,
                    student_id=s.student_id,
                    risk_level=eval_res["RiskLevel"],
                    recommended_action=action,
                    status="Pending"
                ))

        self.storage.write_csv(self.filename, [r.to_dict() for r in rec_records])
        return rec_records

    def get_all_recommendations(self) -> List[RecommendationRecord]:
        rows = self.storage.read_csv(self.filename)
        recs = []
        for r in rows:
            try:
                recs.append(RecommendationRecord(
                    rec_id=r["RecID"],
                    student_id=r["StudentID"],
                    risk_level=r["RiskLevel"],
                    recommended_action=r["RecommendedAction"],
                    status=r.get("Status", "Pending")
                ))
            except KeyError:
                continue
        return recs

    def update_status(self, rec_id: str, new_status: str) -> None:
        """Updates status of a recommendation (e.g., 'Pending', 'In Progress', 'Resolved')."""
        recs = self.get_all_recommendations()
        updated_rows = []
        for r in recs:
            if r.rec_id.upper() == rec_id.strip().upper():
                r.status = new_status
            updated_rows.append(r.to_dict())
        self.storage.write_csv(self.filename, updated_rows)


# =====================================================================
# CAMPUS ANALYTICS & AGGREGATIONS (Unit 5: Pandas, NumPy)
# =====================================================================

class CampusAnalytics:
    """
    Computes institutional campus-wide statistics using Pandas and NumPy:
    - Department-wide average attendance.
    - Grade distribution and percentage of students below threshold.
    - Sentiment breakdown ratio (Positive vs Negative vs Neutral).
    - Top 5 recurring campus complaints.
    """

    def __init__(self, storage: Optional[CSVStorageHandler] = None):
        self.storage = storage or CSVStorageHandler()

    def get_department_attendance_summary(self) -> Dict[str, Any]:
        """
        Merges students.csv and attendance.csv to calculate
        department-wide average attendance and student counts.
        """
        students_rows = self.storage.read_csv("students.csv")
        attendance_rows = self.storage.read_csv("attendance.csv")

        if not students_rows or not attendance_rows:
            return {"departments": [], "overall_avg": 0.0}

        if PANDAS_AVAILABLE:
            df_students = pd.DataFrame(students_rows)
            df_attendance = pd.DataFrame(attendance_rows)

            if "AttendancePercentage" in df_attendance.columns:
                df_attendance["AttendancePercentage"] = pd.to_numeric(df_attendance["AttendancePercentage"], errors="coerce").fillna(0.0)
            
            merged = pd.merge(df_students, df_attendance, on="StudentID", how="inner")
            if merged.empty:
                return {"departments": [], "overall_avg": 0.0}

            dept_stats = merged.groupby("Department")["AttendancePercentage"].agg(["mean", "count"]).reset_index()
            dept_stats["mean"] = dept_stats["mean"].round(2)
            overall_avg = round(float(merged["AttendancePercentage"].mean()), 2)

            dept_list = []
            for _, row in dept_stats.iterrows():
                dept_list.append({
                    "Department": row["Department"],
                    "AverageAttendance": float(row["mean"]),
                    "StudentCount": int(row["count"])
                })

            return {"departments": dept_list, "overall_avg": overall_avg}
        else:
            # Pure Python fallback
            dept_map: Dict[str, List[float]] = {}
            att_map = {r["StudentID"]: float(r.get("AttendancePercentage", 0)) for r in attendance_rows}
            for s in students_rows:
                sid = s.get("StudentID")
                dept = s.get("Department", "Unknown")
                if sid in att_map:
                    dept_map.setdefault(dept, []).append(att_map[sid])

            dept_list = []
            all_vals = []
            for d, vals in dept_map.items():
                m = sum(vals) / len(vals) if vals else 0.0
                all_vals.extend(vals)
                dept_list.append({
                    "Department": d,
                    "AverageAttendance": round(m, 2),
                    "StudentCount": len(vals)
                })

            overall = sum(all_vals) / len(all_vals) if all_vals else 0.0
            return {"departments": dept_list, "overall_avg": round(overall, 2)}

    def get_grade_distribution(self) -> Dict[str, Any]:
        """
        Aggregates student marks, calculates percentage below 40% threshold,
        and computes distribution across grade bands.
        """
        marks_rows = self.storage.read_csv("marks.csv")
        if not marks_rows:
            return {"total_records": 0, "failing_percentage": 0.0, "distribution": {}}

        totals = []
        for r in marks_rows:
            try:
                totals.append(float(r.get("TotalMarks", 0)))
            except ValueError:
                continue

        if not totals:
            return {"total_records": 0, "failing_percentage": 0.0, "distribution": {}}

        if PANDAS_AVAILABLE:
            s_totals = pd.Series(totals)
            failing_pct = round(float((s_totals < 40.0).mean() * 100.0), 2)
            avg_mark = round(float(s_totals.mean()), 2)

            bins = [0, 40, 55, 70, 85, 100]
            labels = ["Fail (<40)", "Pass (40-54)", "Good (55-69)", "Distinction (70-84)", "Exemplary (85-100)"]
            cats = pd.cut(s_totals, bins=bins, labels=labels, include_lowest=True)
            dist_dict = cats.value_counts(sort=False).to_dict()

            return {
                "total_records": len(totals),
                "failing_percentage": failing_pct,
                "average_mark": avg_mark,
                "distribution": {str(k): int(v) for k, v in dist_dict.items()}
            }
        else:
            fail_count = sum(1 for t in totals if t < 40.0)
            failing_pct = round((fail_count / len(totals)) * 100.0, 2)
            dist = {
                "Fail (<40)": fail_count,
                "Pass (40-54)": sum(1 for t in totals if 40 <= t < 55),
                "Good (55-69)": sum(1 for t in totals if 55 <= t < 70),
                "Distinction (70-84)": sum(1 for t in totals if 70 <= t < 85),
                "Exemplary (85-100)": sum(1 for t in totals if t >= 85)
            }
            return {
                "total_records": len(totals),
                "failing_percentage": failing_pct,
                "average_mark": round(sum(totals) / len(totals), 2),
                "distribution": dist
            }

    def get_sentiment_breakdown(self) -> Dict[str, Any]:
        """Computes breakdown ratio of Positive vs Negative vs Neutral feedback."""
        feedback_rows = self.storage.read_csv("feedback.csv")
        if not feedback_rows:
            return {"Positive": 0, "Neutral": 0, "Negative": 0, "Total": 0, "NegativeRatio": 0.0}

        counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
        for f in feedback_rows:
            sent = f.get("Sentiment", "Neutral").capitalize()
            if sent in counts:
                counts[sent] += 1
            else:
                counts["Neutral"] += 1

        total = sum(counts.values())
        neg_ratio = round((counts["Negative"] / total * 100.0), 2) if total > 0 else 0.0

        return {
            "Positive": counts["Positive"],
            "Neutral": counts["Neutral"],
            "Negative": counts["Negative"],
            "Total": total,
            "NegativeRatio": neg_ratio
        }

    def get_top_recurring_complaints(self, top_n: int = 5) -> List[Dict[str, Any]]:
        """Extracts top recurring campus complaints and grievance keywords."""
        feedback_rows = self.storage.read_csv("feedback.csv")
        neg_feedback = [f for f in feedback_rows if f.get("Sentiment") == "Negative" or f.get("Category") in ("Campus/Infrastructure", "Support")]

        keyword_freq: Dict[str, int] = {}
        for f in neg_feedback:
            kws = f.get("ExtractedKeywords", "").split(",")
            for k in kws:
                cleaned = k.strip().lower()
                if cleaned and cleaned != "general_feedback":
                    keyword_freq[cleaned] = keyword_freq.get(cleaned, 0) + 1

        sorted_kws = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        return [{"keyword": k, "frequency": count} for k, count in sorted_kws[:top_n]]
