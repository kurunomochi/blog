"""Package only authored learning materials; never include targets or local databases."""
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parent.parent / "public" / "rust-reboot"
sources_only = "--sources" in sys.argv
archive = root / ("rust-code.zip" if sources_only else "rust-reboot.zip")
files = []
for file in sorted(root.rglob("*")):
    relative = file.relative_to(root)
    if not file.is_file() or "target" in relative.parts:
        continue
    if file.suffix == ".zip" or file.name.endswith((".db", ".db.bak", ".sqlite", ".sqlite-wal", ".sqlite-shm")):
        continue
    if sources_only and file.name == "index.html":
        continue
    files.append(file)
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for file in files:
        bundle.write(file, file.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert "workbook/src/starter.rs" in bundle.namelist()
    assert "capstone/src/main.rs" in bundle.namelist()
    if not sources_only:
        assert bundle.read("index.html") == (root / "index.html").read_bytes()
print(f"Packaged {archive.name}: {len(files)} files, {archive.stat().st_size:,} bytes")
