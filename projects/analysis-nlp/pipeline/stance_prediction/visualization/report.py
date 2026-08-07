from pathlib import Path

import matplotlib.pyplot as plt

STYLE = (
    "body{font-family:sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;}"
    "h1{border-bottom:2px solid #333;}"
    "h2{margin-top:3rem;border-bottom:1px solid #ccc;}"
    "img{max-width:100%;display:block;margin:1rem 0;}"
    ".chart{margin-bottom:2rem;}"
)


def save_matplotlib_chart(fig, title, output_dir, filename):
    """Save a matplotlib figure as a PNG under output_dir and return a
    {'title', 'image_path'} ChartInfo dict (image_path is relative, for
    embedding directly next to the generated index.html)."""
    path = Path(output_dir) / filename
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return {"title": title, "image_path": filename}


def save_plotly_chart(fig, title):
    """Return a {'title', 'html'} ChartInfo dict wrapping an inline,
    interactive plotly fragment."""
    html = fig.to_html(include_plotlyjs="cdn", full_html=False)
    return {"title": title, "html": html}


def build_html_index(sections, output_dir):
    """sections: list of (section_title, list[ChartInfo]) tuples, one per
    pipeline stage. Writes index.html under output_dir and returns its path."""
    parts = [
        "<!DOCTYPE html>",
        "<html><head><meta charset='utf-8'><title>Pipeline Visualization</title>",
        f"<style>{STYLE}</style>",
        "</head><body>",
        "<h1>Pipeline Visualization Report</h1>",
    ]
    for section_title, charts in sections:
        parts.append(f"<h2>{section_title}</h2>")
        if not charts:
            parts.append("<p>No charts produced for this stage.</p>")
        for chart in charts:
            parts.append("<div class='chart'>")
            parts.append(f"<h3>{chart['title']}</h3>")
            if "image_path" in chart:
                img_tag = f"<img src='{chart['image_path']}' alt=\"{chart['title']}\">"
                parts.append(img_tag)
            else:
                parts.append(chart["html"])
            parts.append("</div>")
    parts.append("</body></html>")

    index_path = Path(output_dir) / "index.html"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    return index_path
