"""Inline CSS, data and JS into one self-contained HTML page."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = HERE / "dist" / "darko-redesign.html"


def main() -> None:
    tpl = (SRC / "index.html").read_text()
    css = (SRC / "app.css").read_text()
    js = "\n".join(p.read_text() for p in sorted(SRC.glob("*.js")))
    data = (HERE / "data.json").read_text().replace("</", "<\\/")
    html = tpl.replace("/*CSS*/", css).replace("/*DATA*/", data).replace("/*JS*/", js)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)
    (OUT.parent / "preview-std.html").write_text(
        '<!doctype html>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + html
    )
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
