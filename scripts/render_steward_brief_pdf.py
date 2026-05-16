from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

try:
    from pypdf import PdfReader
    from reportlab.lib.colors import Color, HexColor, white
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Missing optional PDF rendering dependency. Install pypdf and reportlab "
        "before running scripts/render_steward_brief_pdf.py."
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "v2" / "steward-brief-one-page.md"
OUTPUT = ROOT / "output" / "pdf" / "greenpill-v2-steward-brief.pdf"


DARK_GREEN = HexColor("#254D32")
MID_GREEN = HexColor("#4FB477")
LIME = HexColor("#C2E812")
GOLD = HexColor("#FFD972")
INK = HexColor("#143124")
MUTED = HexColor("#456251")
PANEL = HexColor("#F5F8EF")
PANEL_ALT = HexColor("#EEF5DD")
BORDER = HexColor("#D8E5B4")


def parse_markdown(path: Path) -> tuple[str, str, dict[str, list[tuple[str, str]]]]:
    title = ""
    subtitle = ""
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if raw_line.startswith("# "):
            title = raw_line[2:].strip()
            continue
        if raw_line.startswith("## "):
            current = raw_line[3:].strip()
            sections[current] = []
            continue
        if not line:
            if current and sections[current] and sections[current][-1] != "":
                sections[current].append("")
            continue
        if current is None and not subtitle:
            subtitle = line
            continue
        if current:
            sections[current].append(line)

    parsed_sections: dict[str, list[tuple[str, str]]] = {}
    for name, lines in sections.items():
        blocks: list[tuple[str, str]] = []
        paragraph_parts: list[str] = []
        for line in lines:
            if not line:
                if paragraph_parts:
                    blocks.append(("paragraph", " ".join(paragraph_parts)))
                    paragraph_parts = []
                continue
            if line.startswith("- "):
                if paragraph_parts:
                    blocks.append(("paragraph", " ".join(paragraph_parts)))
                    paragraph_parts = []
                blocks.append(("bullet", line[2:].strip()))
            else:
                paragraph_parts.append(line)
        if paragraph_parts:
            blocks.append(("paragraph", " ".join(paragraph_parts)))
        parsed_sections[name] = blocks

    return title, subtitle, parsed_sections


def inline_markup(text: str) -> str:
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r'<font face="Courier">\1</font>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text


def paragraph_height(text: str, style: ParagraphStyle, width: float) -> float:
    para = Paragraph(text, style)
    _, height = para.wrap(width, 10_000)
    return height


def section_height(
    heading: str,
    blocks: list[tuple[str, str]],
    width: float,
    heading_style: ParagraphStyle,
    body_style: ParagraphStyle,
    bullet_style: ParagraphStyle,
) -> float:
    inner_width = width - 28
    total = 18
    total += paragraph_height(heading, heading_style, inner_width)
    total += 10
    for kind, text in blocks:
        style = bullet_style if kind == "bullet" else body_style
        content = f"&#8226;&nbsp;{inline_markup(text)}" if kind == "bullet" else inline_markup(text)
        total += paragraph_height(content, style, inner_width)
        total += 6
    total += 12
    return total


def draw_section(
    pdf: canvas.Canvas,
    x: float,
    top_y: float,
    width: float,
    height: float,
    title: str,
    blocks: list[tuple[str, str]],
    fill: Color,
    heading_style: ParagraphStyle,
    body_style: ParagraphStyle,
    bullet_style: ParagraphStyle,
) -> float:
    pad = 14
    bottom_y = top_y - height

    pdf.setFillColor(fill)
    pdf.roundRect(x, bottom_y, width, height, 12, stroke=0, fill=1)
    pdf.setStrokeColor(BORDER)
    pdf.setLineWidth(1)
    pdf.roundRect(x, bottom_y, width, height, 12, stroke=1, fill=0)
    pdf.setFillColor(LIME)
    pdf.roundRect(x + 12, top_y - 11, 42, 4, 2, stroke=0, fill=1)

    cursor_y = top_y - pad
    heading = Paragraph(title, heading_style)
    _, heading_h = heading.wrap(width - 2 * pad, 10_000)
    heading.drawOn(pdf, x + pad, cursor_y - heading_h)
    cursor_y -= heading_h + 10

    for kind, text in blocks:
        style = bullet_style if kind == "bullet" else body_style
        content = f"&#8226;&nbsp;{inline_markup(text)}" if kind == "bullet" else inline_markup(text)
        para = Paragraph(content, style)
        _, para_h = para.wrap(width - 2 * pad, 10_000)
        para.drawOn(pdf, x + pad, cursor_y - para_h)
        cursor_y -= para_h + 6

    return bottom_y


def draw_footer(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    sections: dict[str, list[tuple[str, str]]],
    headings: tuple[str, ...],
    heading_style: ParagraphStyle,
    body_style: ParagraphStyle,
) -> None:
    pdf.setFillColor(Color(1, 1, 1, alpha=0.92))
    pdf.roundRect(x, y, width, height, 12, stroke=0, fill=1)
    pdf.setStrokeColor(BORDER)
    pdf.roundRect(x, y, width, height, 12, stroke=1, fill=0)

    left_pad = 16
    cursor_x = x + left_pad
    cursor_y = y + height - 14

    for heading in headings:
        title_para = Paragraph(heading, heading_style)
        _, title_h = title_para.wrap(width - 2 * left_pad, 10_000)
        title_para.drawOn(pdf, cursor_x, cursor_y - title_h)
        cursor_y -= title_h + 7
        body_text = " ".join(text for _, text in sections[heading])
        body_para = Paragraph(inline_markup(body_text), body_style)
        _, body_h = body_para.wrap(width - 2 * left_pad, 10_000)
        body_para.drawOn(pdf, cursor_x, cursor_y - body_h)
        cursor_y -= body_h + 10


def main() -> None:
    title, subtitle, sections = parse_markdown(SOURCE)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(str(OUTPUT), pagesize=letter)
    page_width, page_height = letter
    margin = 0.45 * inch
    gutter = 0.28 * inch
    header_h = 1.78 * inch

    title_style = ParagraphStyle(
        "title",
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=25,
        textColor=white,
    )
    subtitle_style = ParagraphStyle(
        "subtitle",
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=Color(1, 1, 1, alpha=0.84),
    )
    strapline_style = ParagraphStyle(
        "strapline",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=12,
        textColor=GOLD,
    )
    section_heading = ParagraphStyle(
        "section_heading",
        fontName="Helvetica-Bold",
        fontSize=11.3,
        leading=13,
        textColor=DARK_GREEN,
    )
    body_style = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=9.15,
        leading=12,
        textColor=INK,
    )
    bullet_style = ParagraphStyle(
        "bullet",
        parent=body_style,
        leftIndent=0,
        firstLineIndent=0,
    )
    footer_heading = ParagraphStyle(
        "footer_heading",
        fontName="Helvetica-Bold",
        fontSize=10.3,
        leading=12,
        textColor=DARK_GREEN,
    )
    footer_body = ParagraphStyle(
        "footer_body",
        fontName="Helvetica",
        fontSize=9.0,
        leading=11.5,
        textColor=INK,
    )

    pdf.setTitle(title)
    pdf.setAuthor("Codex")
    pdf.setSubject("Steward-facing synthesis brief for Greenpill V2")

    pdf.setFillColor(DARK_GREEN)
    pdf.rect(0, page_height - header_h, page_width, header_h, stroke=0, fill=1)
    pdf.setFillColor(MID_GREEN)
    pdf.rect(0, page_height - header_h, page_width, 6, stroke=0, fill=1)

    pdf.setFillColor(GOLD)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(margin, page_height - 34, "GREENPILL NETWORK")

    title_para = Paragraph(title, title_style)
    title_width = page_width - 2 * margin
    _, title_h = title_para.wrap(title_width, 200)
    title_para.drawOn(pdf, margin, page_height - 66 - title_h)

    subtitle_para = Paragraph(inline_markup(subtitle), subtitle_style)
    _, subtitle_h = subtitle_para.wrap(title_width, 100)
    subtitle_para.drawOn(pdf, margin, page_height - 74 - title_h - subtitle_h)

    strapline_para = Paragraph("Shared context first, clear choices next", strapline_style)
    _, strapline_h = strapline_para.wrap(title_width, 40)
    strapline_para.drawOn(pdf, margin, page_height - header_h + 26)

    column_width = (page_width - 2 * margin - gutter) / 2
    content_top = page_height - header_h - 16

    left_titles = ["Why now", "What we heard"]
    right_titles = ["What is already aligned", "What needs steward input now"]

    left_heights = [
        section_height(name, sections[name], column_width, section_heading, body_style, bullet_style)
        for name in left_titles
    ]
    right_heights = [
        section_height(name, sections[name], column_width, section_heading, body_style, bullet_style)
        for name in right_titles
    ]

    left_y = content_top
    for idx, name in enumerate(left_titles):
        fill = PANEL if idx % 2 == 0 else PANEL_ALT
        left_y = draw_section(
            pdf,
            margin,
            left_y,
            column_width,
            left_heights[idx],
            name,
            sections[name],
            fill,
            section_heading,
            body_style,
            bullet_style,
        ) - 10

    right_y = content_top
    for idx, name in enumerate(right_titles):
        fill = PANEL_ALT if idx % 2 == 0 else PANEL
        right_y = draw_section(
            pdf,
            margin + column_width + gutter,
            right_y,
            column_width,
            right_heights[idx],
            name,
            sections[name],
            fill,
            section_heading,
            body_style,
            bullet_style,
        ) - 10

    footer_y = margin
    footer_h = min(left_y, right_y) - footer_y
    draw_footer(
        pdf,
        margin,
        footer_y,
        page_width - 2 * margin,
        footer_h,
        sections,
        ("What happens next",),
        footer_heading,
        footer_body,
    )

    pdf.showPage()
    pdf.save()

    pages = len(PdfReader(str(OUTPUT)).pages)
    if pages != 1:
        raise SystemExit(f"Expected one page, found {pages}")


if __name__ == "__main__":
    main()
