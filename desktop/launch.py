"""Open Web Studio in its own window.

Double-click Web Studio after it is installed. Websites are kept in
%LOCALAPPDATA%\\WebStudio on this computer. Nothing is sent to the internet
unless a page itself uses an online font, video, or map.
"""

from __future__ import annotations

import msvcrt
import os
import socket
import sys
import threading
import time
import urllib.request
from pathlib import Path

HOST = "127.0.0.1"
PORT = 47321

_LOCK = None


def app_data() -> Path:
    if getattr(sys, "frozen", False):
        root = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(root) / "WebStudio"
    return Path(__file__).resolve().parents[1] / "backend" / "data"


def prepare() -> Path:
    data = app_data()
    data.mkdir(parents=True, exist_ok=True)
    os.environ["WEBSTUDIO_DATA"] = str(data)
    if not getattr(sys, "frozen", False):
        backend = Path(__file__).resolve().parents[1] / "backend"
        if str(backend) not in sys.path:
            sys.path.insert(0, str(backend))
    return data


def take_lock(data: Path) -> bool:
    """One installed copy owns the local server. A second double-click just focuses it."""
    global _LOCK
    handle = open(data / "studio.lock", "a+b")
    handle.seek(0, os.SEEK_END)
    if handle.tell() == 0:
        handle.write(b"\0")
        handle.flush()
    handle.seek(0)
    try:
        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        handle.close()
        return False
    _LOCK = handle
    return True


def remember_port(data: Path, port: int) -> None:
    (data / "studio.port").write_text(str(port), encoding="ascii")


def remembered_port(data: Path) -> int:
    try:
        text = (data / "studio.port").read_text(encoding="ascii").strip()
        return int(text)
    except (OSError, ValueError):
        return PORT


def port_busy(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex((HOST, port)) == 0


def healthy(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/api/health", timeout=0.4) as response:
            return b"web-studio" in response.read()
    except Exception:
        return False


def free_port() -> int:
    if not port_busy(PORT):
        return PORT
    for port in range(PORT + 1, PORT + 20):
        if not port_busy(port):
            return port
    raise RuntimeError("Web Studio could not find a free port.")


def complain(message: str) -> None:
    try:
        log = app_data() / "studio.log"
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open("a", encoding="utf-8") as handle:
            handle.write(message + "\n")
    except Exception:
        pass
    if os.environ.get("WEBSTUDIO_NO_WINDOW") == "1":
        print(message, file=sys.stderr)
        return
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(0, message, "Web Studio", 0x10)
    except Exception:
        pass


def focus_window() -> bool:
    try:
        import ctypes

        user32 = ctypes.windll.user32
        hwnd = user32.FindWindowW(None, "Web Studio")
        if not hwnd:
            return False
        user32.ShowWindow(hwnd, 9)
        user32.SetForegroundWindow(hwnd)
        return True
    except Exception:
        return False


def wait_until(check, seconds: float) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if check():
            return True
        time.sleep(0.15)
    return False


def capture_output(data: Path) -> None:
    """A double-clicked window has no console, so keep notes in studio.log."""
    if sys.stdout is not None and sys.stderr is not None:
        return
    log = open(data / "studio.log", "a", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = log
    if sys.stderr is None:
        sys.stderr = log


def start_server(port: int):
    import logging

    logging.basicConfig(
        filename=str(app_data() / "studio.log"),
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    from app.main import DIST, app as fastapi_app

    if not DIST.exists():
        raise RuntimeError("Web Studio is missing its pages. Reinstall Web Studio.")

    import uvicorn

    # log_config=None avoids uvicorn's color formatter, which crashes with no console.
    config = uvicorn.Config(
        fastapi_app,
        host=HOST,
        port=port,
        log_level="info",
        access_log=False,
        log_config=None,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    thread = threading.Thread(target=server.run, name="web-studio", daemon=True)
    thread.start()
    if not wait_until(lambda: healthy(port) or not thread.is_alive(), 25):
        raise RuntimeError("Web Studio took too long to open.")
    if not healthy(port):
        raise RuntimeError("Web Studio could not open. See studio.log in the WebStudio folder.")
    return server


def open_window(url: str, data: Path) -> None:
    import webview

    webview.create_window(
        "Web Studio",
        url,
        width=1280,
        height=800,
        min_size=(960, 640),
        text_select=True,
        background_color="#D4D4D4",
    )
    # storage_path keeps the student's device id and login between visits.
    webview.start(private_mode=False, storage_path=str(data / "webview"))


def main() -> None:
    data = prepare()
    capture_output(data)
    owns_server = take_lock(data)
    server = None
    if owns_server:
        port = free_port()
        remember_port(data, port)
        server = start_server(port)
    else:
        port = remembered_port(data)
        if not wait_until(lambda: healthy(port), 20):
            complain("Web Studio is already starting. Wait a moment, then open it again.")
            return

    url = f"http://{HOST}:{port}/"
    if os.environ.get("WEBSTUDIO_NO_WINDOW") == "1":
        print(url, flush=True)
        if server is None:
            return
        try:
            while True:
                time.sleep(0.5)
        except KeyboardInterrupt:
            server.should_exit = True
        return

    if not owns_server:
        if not wait_until(focus_window, 8):
            complain("Web Studio is already open.")
        return

    try:
        open_window(url, data)
    finally:
        if server is not None:
            server.should_exit = True


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        complain(str(exc))
        sys.exit(1)
