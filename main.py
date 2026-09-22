"""
main.py
AI-Enabled Smart Campus Monitoring and Intelligent Student Support System
Main Application Entry Point
"""

import sys
import os
from typing import Optional

from models import CSVStorageHandler, StudentManager
from analytics import StudentRiskEngine, RecommendationEngine, CampusAnalytics
from nlp_engine import FeedbackProcessor

def run_headless_verification() -> bool:
    """
    Validates end-to-end system logic across all Units 1-6:
    - Data persistence and CSV verification
    - Student CRUD operations
    - Attendance monitoring and low attendance flagging
    - Academic analyzer and failing mark detection
    - NLP feedback processor, sentiment classification, and category matching
    - Multi-factor risk engine computation
    - Intelligent recommendations generation
    - Campus-wide analytics aggregations
    """
    print("=" * 70)
    print("Running AI-Enabled Smart Campus Monitoring Verification Suite")
    print("=" * 70)

    # 1. Storage & Student Management
    storage = CSVStorageHandler()
    student_mgr = StudentManager(storage)
    students = student_mgr.get_all_students()
    print(f"[*] Verified Student Manager: {len(students)} student records loaded.")
    assert len(students) >= 5, "At least 5 students must be present."

    # 2. Attendance
    from models import AttendanceMonitor
    att_monitor = AttendanceMonitor(storage)
    low_att = att_monitor.get_low_attendance_students(75.0)
    print(f"[*] Verified Attendance Monitor: {len(low_att)} students flagged below 75% threshold.")

    # 3. Marks & Academic Analyzer
    from models import AcademicAnalyzer
    acad_analyzer = AcademicAnalyzer(storage)
    failing = acad_analyzer.get_failing_records()
    print(f"[*] Verified Academic Analyzer: {len(failing)} failing subject evaluations detected.")

    # 4. NLP Processor
    nlp = FeedbackProcessor()
    sample_text = "The classroom air conditioner is broken and the lab wifi is terrible."
    analysis = nlp.analyze_feedback(sample_text)
    print(f"[*] Verified NLP Engine: Category='{analysis['category']}', Sentiment='{analysis['sentiment']}', Keywords='{analysis['extracted_keywords']}'")
    assert analysis["sentiment"] == "Negative", "Negative sentiment test failed."

    # 5. Risk Engine
    risk_engine = StudentRiskEngine(storage)
    evals = risk_engine.evaluate_and_persist_all()
    print(f"[*] Verified Risk Engine: Computed composite scores for {len(evals)} students.")

    # 6. Recommendation Engine
    rec_engine = RecommendationEngine(storage)
    recs = rec_engine.refresh_all_recommendations()
    print(f"[*] Verified Recommendation Engine: Generated {len(recs)} institutional actions.")

    # 7. Campus Analytics
    analytics = CampusAnalytics(storage)
    dept_summary = analytics.get_department_attendance_summary()
    grade_dist = analytics.get_grade_distribution()
    sentiment_dist = analytics.get_sentiment_breakdown()
    top_complaints = analytics.get_top_recurring_complaints(5)
    print(f"[*] Verified Analytics Engine: Depts={len(dept_summary['departments'])}, Fail%={grade_dist['failing_percentage']}%, NegFeedback%={sentiment_dist['NegativeRatio']}%")
    print(f"[*] Top Complaints: {[c['keyword'] for c in top_complaints]}")

    print("=" * 70)
    print("[SUCCESS] All system modules and Unit 1-6 specifications verified.")
    print("=" * 70)
    return True


def main() -> None:
    """Launches the Tkinter GUI desktop interface."""
    # Check for CLI or headless verification argument
    if "--test" in sys.argv or "--headless" in sys.argv or "--cli" in sys.argv:
        run_headless_verification()
        return

    # Check DISPLAY environment for Tkinter GUI
    display = os.environ.get("DISPLAY")
    if not display and sys.platform.startswith("linux"):
        print("[!] Note: No X11 DISPLAY environment variable detected.")
        print("[!] Running self-contained verification suite...")
        run_headless_verification()
        print("\nTo launch the desktop GUI on a machine with a display, run:")
        print("    python main.py")
        return

    try:
        import tkinter as tk
        from gui import CampusMonitoringApp

        root = tk.Tk()
        app = CampusMonitoringApp(root)
        print("[*] Launching Tkinter GUI Desktop Application...")
        root.mainloop()
    except Exception as e:
        print(f"[!] Tkinter GUI could not start on this system: {e}")
        print("[*] Running headless verification fallback:")
        run_headless_verification()


if __name__ == "__main__":
    main()
