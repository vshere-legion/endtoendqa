#!/usr/bin/env python3
"""
RCA Report Generator
Merges batch JSON results into a single Excel report with RCA Data + Pareto Chart.

Usage:
    python3 generate_report.py --input rca_results/ --output RCA_Summer_2025_report.xlsx
    python3 generate_report.py --input rca_results/ --output report.xlsx --title "Summer 2025 - Platform"
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from openpyxl import Workbook
    from openpyxl.chart import BarChart, LineChart, Reference
    from openpyxl.chart.label import DataLabelList
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    print("ERROR: openpyxl is required. Install it with: pip3 install openpyxl")
    sys.exit(1)


def load_batch_results(input_dir: str) -> list[dict]:
    """Load and merge all batch JSON files from the input directory."""
    results = []
    input_path = Path(input_dir)

    if not input_path.exists():
        print(f"ERROR: Input directory '{input_dir}' does not exist.")
        sys.exit(1)

    json_files = sorted(input_path.glob("batch_*.json"))
    if not json_files:
        single = input_path / "results.json"
        if single.exists():
            json_files = [single]
        else:
            print(f"ERROR: No batch_*.json or results.json files found in '{input_dir}'.")
            sys.exit(1)

    for f in json_files:
        with open(f) as fp:
            data = json.load(fp)
            if isinstance(data, list):
                results.extend(data)
            elif isinstance(data, dict) and "defects" in data:
                results.extend(data["defects"])
            else:
                print(f"WARNING: Unexpected format in {f.name}, skipping.")

    print(f"Loaded {len(results)} defects from {len(json_files)} batch file(s).")
    return results


def sort_results(results: list[dict]) -> list[dict]:
    """Sort by Project, then Severity (S1 before S2), then Defect ID."""
    severity_order = {"S1 - Urgent": 0, "S2 - High": 1}
    return sorted(results, key=lambda d: (
        d.get("project", ""),
        severity_order.get(d.get("severity", ""), 99),
        d.get("defect_id", ""),
    ))


def get_max_pr_count(results: list[dict]) -> int:
    """Find the maximum number of linked PRs across all defects."""
    return max((len(d.get("linked_prs", [])) for d in results), default=0)


def create_data_sheet(wb: Workbook, results: list[dict]) -> None:
    """Create the 'RCA Data' tab with all defect analysis."""
    ws = wb.active
    ws.title = "RCA Data"

    max_prs = max(get_max_pr_count(results), 1)

    # Build header row — new column structure
    headers = ["Defect ID", "Environment Leaked", "Defect Summary", "Linked Jira Tickets", "Linked Ticket Description"]
    for i in range(1, max_prs + 1):
        headers.append(f"PR {i}")
    headers.extend([
        "Defect Description",
        "PR Description",
        "Code Description",
        "Why QA missed",
        "QA Recommendation",
        "Why Dev missed",
        "Dev Recommendation",
        "5 Whys",
        "Ishikawa Category",
        "Causal Classification",
        "Evidence Grade",
        "Counterfactual",
        "RCA Confidence",
    ])

    # Style: header
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # Freeze header row
    ws.freeze_panes = "A2"

    # Write data rows
    for row_idx, defect in enumerate(results, 2):
        prs = defect.get("linked_prs", [])
        pr_summaries = defect.get("pr_summaries", [])

        # Format linked Jira tickets
        linked_tickets = defect.get("linked_jira_tickets", [])
        linked_str = "\n".join(
            f'{t.get("key", "")} ({t.get("relationship", "")})'
            for t in linked_tickets
        ) if linked_tickets else ""

        row_data = [
            defect.get("defect_id", ""),
            defect.get("environment_leaked", ""),
            defect.get("summary", ""),
            linked_str,
            defect.get("linked_ticket_description", ""),
        ]
        # PR columns: URL + 2-line summary
        for i in range(max_prs):
            if i < len(prs):
                url = prs[i]
                summary = pr_summaries[i] if i < len(pr_summaries) else ""
                cell_value = f"{url}\n{summary}" if summary else url
                row_data.append(cell_value)
            else:
                row_data.append("")

        row_data.extend([
            defect.get("defect_description", ""),
            defect.get("pr_description", ""),
            defect.get("code_description", ""),
            defect.get("why_qa_missed", ""),
            defect.get("qa_recommendation", ""),
            defect.get("why_dev_missed", ""),
            defect.get("dev_recommendation", ""),
            defect.get("five_whys", ""),
            defect.get("ishikawa_category", ""),
            defect.get("causal_classification", ""),
            defect.get("evidence_grade", ""),
            defect.get("counterfactual", ""),
            defect.get("rca_confidence", ""),
        ])

        for col_idx, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="top", wrap_text=True)

    # Auto-fit column widths
    col_widths = {
        "Defect ID": 16,
        "Environment Leaked": 18,
        "Defect Summary": 50,
        "Linked Jira Tickets": 35,
        "Linked Ticket Description": 60,
        "Defect Description": 60,
        "PR Description": 60,
        "Code Description": 60,
        "Why QA missed": 18,
        "QA Recommendation": 55,
        "Why Dev missed": 18,
        "Dev Recommendation": 55,
        "5 Whys": 55,
        "Ishikawa Category": 20,
        "Causal Classification": 55,
        "Evidence Grade": 16,
        "Counterfactual": 55,
        "RCA Confidence": 22,
    }
    for col_idx, header in enumerate(headers, 1):
        width = col_widths.get(header, 35)
        ws.column_dimensions[get_column_letter(col_idx)].width = width


def create_pareto_chart_tab(wb: Workbook, results: list[dict], tab_name: str,
                           field_key: str, chart_title: str) -> None:
    """Create a Pareto Chart tab for any reason field (QA or Dev)."""
    ws = wb.create_sheet(tab_name)

    # Count frequencies
    reason_counts: dict[str, int] = {}
    for defect in results:
        reason = defect.get(field_key, "Unknown")
        reason_counts[reason] = reason_counts.get(reason, 0) + 1

    # Sort descending by count
    sorted_reasons = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)

    total = sum(count for _, count in sorted_reasons)

    # Write data table
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    table_headers = ["Reason", "Count", "Percentage", "Cumulative %"]
    for col_idx, header in enumerate(table_headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border

    pct_format = '0.0"%"'
    center_align = Alignment(horizontal="center", vertical="center")
    cumulative = 0
    cutoff_index = None  # 0-based index where cumulative first reaches 80%
    max_count = max((c for _, c in sorted_reasons), default=1)
    for row_idx, (reason, count) in enumerate(sorted_reasons, 2):
        pct = (count / total * 100) if total > 0 else 0
        cumulative += pct

        ws.cell(row=row_idx, column=1, value=reason).border = thin_border
        count_cell = ws.cell(row=row_idx, column=2, value=count)
        count_cell.border = thin_border
        count_cell.alignment = center_align
        pct_cell = ws.cell(row=row_idx, column=3, value=round(pct, 1))
        pct_cell.border = thin_border
        pct_cell.number_format = pct_format
        pct_cell.alignment = center_align
        cum_cell = ws.cell(row=row_idx, column=4, value=round(cumulative, 1))
        cum_cell.border = thin_border
        cum_cell.number_format = pct_format
        cum_cell.alignment = center_align

        if cutoff_index is None and cumulative >= 80:
            cutoff_index = row_idx - 2  # 0-based

    data_end_row = len(sorted_reasons) + 1

    # Mark the 80% Pareto cutoff row in data table
    cutoff_row = (cutoff_index + 2) if cutoff_index is not None else None
    if cutoff_row:
        note = ws.cell(row=cutoff_row, column=5, value="← 80% Pareto cutoff")
        note.font = Font(bold=True, size=10)

    # Center-align header row and numeric columns
    for col_idx in range(1, 6):
        ws.cell(row=1, column=col_idx).alignment = center_align

    # Column widths
    ws.column_dimensions["A"].width = 16
    ws.column_dimensions["B"].width = 8
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 22

    # Place chart below data table — leave 2 empty rows, minimum row 10
    chart_row = max(data_end_row + 2, 10)

    # Simple Pareto bar chart
    chart = BarChart()
    chart.type = "col"
    chart.title = chart_title
    chart.y_axis.title = "Count"
    chart.x_axis.title = "Reason Category"
    chart.style = 10
    chart.width = 26
    chart.height = 14

    bar_data = Reference(ws, min_col=2, min_row=1, max_row=data_end_row)
    bar_cats = Reference(ws, min_col=1, min_row=2, max_row=data_end_row)
    chart.add_data(bar_data, titles_from_data=True)
    chart.set_categories(bar_cats)
    chart.shape = 4

    # Smaller, angled x-axis labels to fit all categories
    from openpyxl.chart.text import RichText
    from openpyxl.drawing.text import Paragraph, ParagraphProperties, CharacterProperties, Font as DrawingFont
    small_label = RichText(
        p=[Paragraph(
            pPr=ParagraphProperties(
                defRPr=CharacterProperties(sz=700)
            ),
            endParaRPr=CharacterProperties(sz=700)
        )]
    )
    # X-axis: 45° angle, 9pt font (Numbers uses vert+rot together)
    from openpyxl.drawing.text import RichTextProperties
    x_label = RichText(
        bodyPr=RichTextProperties(rot=-2700000, vert="horz"),
        p=[Paragraph(
            pPr=ParagraphProperties(
                defRPr=CharacterProperties(sz=900, b=True)
            ),
            endParaRPr=CharacterProperties(sz=900, b=True)
        )]
    )
    chart.x_axis.txPr = x_label
    chart.x_axis.tickLblPos = "low"
    chart.x_axis.tickLblSkip = 1
    chart.x_axis.tickMarkSkip = 1
    chart.x_axis.delete = False
    # Y-axis: 45° angle, 9pt font
    y_label = RichText(
        bodyPr=RichTextProperties(rot=-2700000, vert="horz"),
        p=[Paragraph(
            pPr=ParagraphProperties(
                defRPr=CharacterProperties(sz=900, b=True)
            ),
            endParaRPr=CharacterProperties(sz=900, b=True)
        )]
    )
    chart.y_axis.txPr = y_label
    chart.legend.txPr = small_label

    # Add data labels on bars showing the count value
    from openpyxl.chart.label import DataLabelList
    if chart.series:
        chart.series[0].dLbls = DataLabelList()
        chart.series[0].dLbls.showVal = True
        chart.series[0].dLbls.numFmt = '0'
        chart.series[0].dLbls.txPr = small_label

    # Ensure axis titles are visible
    chart.x_axis.title = "Reason Category"
    chart.y_axis.title = "Count"

    chart.y_axis.crosses = "min"
    ws.add_chart(chart, f"A{chart_row}")


def create_legends_sheet(wb: Workbook) -> None:
    """Create the 'Legends' tab with QA and Dev glossary tables."""
    ws = wb.create_sheet("Legends")

    section_font = Font(bold=True, size=12, color="2F5496")
    term_font = Font(bold=True, size=10)
    col_header_font = Font(bold=True, size=10, color="FFFFFF")
    col_header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    is_font = Font(size=10)
    is_not_font = Font(size=10)
    desc_alignment = Alignment(vertical="top", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    def write_glossary(start_row, title, terms):
        ws.cell(row=start_row, column=1, value=title).font = section_font
        for col_idx, header in enumerate(["Term", "What this IS", "What this is NOT"], 1):
            cell = ws.cell(row=start_row + 1, column=col_idx, value=header)
            cell.font = col_header_font
            cell.fill = col_header_fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center", vertical="center")
        for i, (term, is_desc, is_not_desc) in enumerate(terms, 1):
            row = start_row + 1 + i
            c1 = ws.cell(row=row, column=1, value=term)
            c1.font = term_font
            c1.border = thin_border
            c1.alignment = desc_alignment
            c2 = ws.cell(row=row, column=2, value=is_desc)
            c2.font = is_font
            c2.border = thin_border
            c2.alignment = desc_alignment
            c3 = ws.cell(row=row, column=3, value=is_not_desc)
            c3.font = is_not_font
            c3.border = thin_border
            c3.alignment = desc_alignment
        return start_row + len(terms) + 3

    # QA glossary
    next_row = write_glossary(1, "Why QA Missed — Term Definitions", _get_qa_glossary_terms())
    # Dev glossary
    write_glossary(next_row, "Why Dev Missed — Term Definitions", _get_dev_glossary_terms())

    # Column widths
    ws.column_dimensions["A"].width = 16
    ws.column_dimensions["B"].width = 60
    ws.column_dimensions["C"].width = 60
    ws.freeze_panes = "A2"


def _get_qa_glossary_terms() -> list[tuple[str, str, str]]:
    """Return QA Missed glossary terms."""
    return [
        ("Oversight",
         "QA had test coverage for the affected area but missed a specific scenario or condition that would have caught the defect.",
         "Not a gap in test planning — tests existed but didn't cover this particular path. Don't use when no test existed at all (that's Coverage)."),
        ("Coverage",
         "No test existed for the affected feature, flow, or component — it was simply not part of the test plan.",
         "Not a missed scenario within existing tests (that's Oversight). Don't use when tests existed but were insufficient."),
        ("Environment",
         "Defect only reproduces in a specific environment configuration — production infra, env-specific settings, or deployment topology that differs from test environments.",
         "Not a test design issue — QA could not have caught this in their test environment. Don't use when the defect is reproducible in UAT/staging."),
        ("Data",
         "Defect requires specific data conditions to trigger — unusual formats, edge values, customer-specific data feeds, or production-scale data volumes.",
         "Not a logic error in code — the code works with 'normal' data. Don't use when the defect occurs with standard test data."),
        ("Timing",
         "Race condition, timing-dependent behavior, or order-of-operations issue that is difficult to reproduce consistently in test execution.",
         "Not a deterministic bug — this is inherently non-deterministic. Don't use for bugs that reliably reproduce in sequence."),
        ("Complexity",
         "Interaction between multiple components, subsystems, or configuration combinations made the defect hard to predict or test in isolation.",
         "Not a single-component bug — the defect emerges from the combination, not from any one part. Don't use for bugs within a single module."),
        ("Regression",
         "A code change broke previously working functionality; the affected path was working before and should have been caught by regression tests.",
         "Not a new feature gap — this worked before and broke. Don't use for features that never worked or were never tested."),
        ("Integration",
         "Cross-service, cross-API, or cross-system contract issue — the defect occurs at the boundary between two systems or services.",
         "Not an issue within a single service — both sides work independently but fail together. Don't use for bugs inside one component."),
        ("Edge-case",
         "Unusual input, boundary condition, or rare user workflow that was not anticipated during test design.",
         "Not a common scenario — this is a rare condition most users won't hit. Don't use when the scenario is part of normal user behavior."),
        ("Requirement",
         "The requirement was unclear, missing, or ambiguous — QA could not have known what to test because the expected behavior was not defined.",
         "Not a QA planning failure — even a thorough test plan couldn't have covered this without clearer requirements. Don't use when requirements were clear but tests were missing."),
    ]


def _get_dev_glossary_terms() -> list[tuple[str, str, str]]:
    """Return Dev Missed glossary terms."""
    return [
        ("Oversight",
         "Simple mistake in otherwise understood code — the developer knew the expected behavior but missed implementing it correctly.",
         "Not a knowledge gap — the developer understood the requirement. Don't use when the spec was wrong or unclear (that's Requirement)."),
        ("Refactor",
         "Broke existing functionality during code restructuring or cleanup that was not the primary intent of the change.",
         "Not a feature bug — the breakage was a side effect of reorganizing code, not of building something new. Don't use for bugs in new feature code."),
        ("Merge",
         "Conflict resolution during merge introduced the bug — the merged code compiled but was semantically incorrect.",
         "Not a logic error in original code — both branches were correct independently but the merge combined them incorrectly. Don't use for pre-merge bugs."),
        ("Logic",
         "Incorrect algorithm, conditional expression, or business logic — the code does not implement the intended behavior.",
         "Not an environmental or data issue — the code is deterministically wrong. Don't use when the logic is correct but the inputs are unexpected (that's Assumption)."),
        ("Dependency",
         "An upstream library, service, or API changed behavior, and the consuming code was not updated accordingly.",
         "Not the developer's own code — the bug is caused by an external change they didn't control. Don't use for bugs in first-party code."),
        ("Assumption",
         "Developer made a wrong assumption about input format, system state, or data shape that did not hold in production.",
         "Not a logic error — the code correctly implements the developer's mental model, but that model was wrong. Don't use when the algorithm itself is flawed (that's Logic)."),
        ("Edge-case",
         "Developer did not consider boundary conditions, unusual inputs, or rare state combinations that occur in production.",
         "Not a common path bug — the main flow works correctly. Don't use when the bug affects the primary happy path."),
        ("Concurrency",
         "Thread safety, shared mutable state, or async timing issue that only manifests under concurrent load or specific execution order.",
         "Not a single-threaded logic error — the code works correctly in isolation. Don't use when the bug reproduces in single-user testing."),
        ("Migration",
         "Data migration, schema migration, or configuration migration introduced inconsistency, data loss, or unexpected state.",
         "Not a runtime code bug — the issue is in the migration script or process, not in the application logic. Don't use for bugs unrelated to migration."),
        ("Requirement",
         "Developer built to an ambiguous, incomplete, or incorrect specification — the code matches the spec but the spec was wrong.",
         "Not a coding mistake — the developer implemented exactly what was asked. Don't use when the spec was clear but the implementation was wrong (that's Logic or Oversight)."),
    ]


def main():
    parser = argparse.ArgumentParser(description="Generate RCA Excel report from batch results.")
    parser.add_argument("--input", required=True, help="Directory containing batch JSON files")
    parser.add_argument("--output", required=True, help="Output .xlsx file path")
    parser.add_argument("--title", default="Pareto — QA Missed Reasons", help="Chart title")
    args = parser.parse_args()

    results = load_batch_results(args.input)
    results = sort_results(results)

    wb = Workbook()
    create_data_sheet(wb, results)

    qa_title = args.title if "QA" in args.title else f"Pareto — QA Missed Reasons — {args.title.replace('Pareto — ', '')}"
    dev_title = qa_title.replace("QA Missed", "Dev Missed")

    create_pareto_chart_tab(wb, results, "QA-Pareto", "why_qa_missed", qa_title)
    create_pareto_chart_tab(wb, results, "Dev-Pareto", "why_dev_missed", dev_title)
    create_legends_sheet(wb)

    wb.save(args.output)
    print(f"Report saved to: {args.output}")
    print(f"  - Tab 1: 'RCA Data' ({len(results)} defects)")
    print(f"  - Tab 2: 'QA-Pareto' (Why QA Missed frequency + chart)")
    print(f"  - Tab 3: 'Dev-Pareto' (Why Dev Missed frequency + chart)")
    print(f"  - Tab 4: 'Legends' (Term definitions — What this IS / is NOT)")


if __name__ == "__main__":
    main()
