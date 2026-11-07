# -*- mode: python ; coding: utf-8 -*-
"""Bundle Web Studio, its pages, and Python into one Windows folder."""

import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

ROOT = Path(SPECPATH).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))
UI = ROOT / "frontend" / "dist"
if not (UI / "index.html").exists():
    raise SystemExit("Build the pages first: cd frontend; npm run build")

webview_datas = []
webview_binaries = []
webview_hidden = []
for package in ("webview", "clr_loader", "pythonnet"):
    datas, binaries, hidden = collect_all(package)
    webview_datas += datas
    webview_binaries += binaries
    webview_hidden += hidden

a = Analysis(
    [str(ROOT / "desktop" / "launch.py")],
    pathex=[str(ROOT / "backend")],
    binaries=webview_binaries,
    datas=[(str(UI), "frontend/dist"), *webview_datas],
    hiddenimports=[
        *webview_hidden,
        *collect_submodules("uvicorn"),
        *collect_submodules("app"),
        "httptools",
        "websockets",
        "multipart",
        "python_multipart",
        "sqlalchemy.dialects.sqlite",
        "webview",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="Web Studio",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    icon=str(ROOT / "desktop" / "webstudio.ico"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="WebStudio",
)
