import subprocess
import sys
import os
import time
import urllib.request
import webbrowser
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_MAIN = os.path.join(ROOT_DIR, "backend", "object_detection", "main.py")
SL_ENGINE_MAIN = os.path.join(ROOT_DIR, "microservices", "sl_engine", "main.py")

# Auto-detect .venv Python interpreter
VENV_PYTHON = os.path.join(ROOT_DIR, ".venv", "bin", "python")
PYTHON_EXE = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

def load_dotenv(env_path):
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key:
                        os.environ[key] = val

load_dotenv(os.path.join(ROOT_DIR, ".env"))

FRONTEND_PORT = os.environ.get("FRONTEND_PORT") or os.environ.get("PORT", "8888")
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"
BACKEND_URL = "http://localhost:8889/api/status"
SL_ENGINE_URL = "http://localhost:8001/api/health"

processes = []

def is_server_running(url, timeout=1.5):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except Exception:
        return False

def cleanup(signum=None, frame=None):
    print("\nShutting down OpenAccess services...")
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=2)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
    print("All services stopped.")
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("=" * 60)
    print(" OpenAccess - Combined Project Launcher")
    print(" Includes: Deaf, Blind, AAC, Object Detection AI & Kozha SL Engine")
    print("=" * 60)
    print(f"Using Python Interpreter: {PYTHON_EXE}")

    # 1. Start Object Detection Backend (FastAPI on Port 8889)
    if is_server_running(BACKEND_URL):
        print(f"[Backend] AI Object Detection server already running at {BACKEND_URL}")
    else:
        print("[Backend] Starting Object Detection AI server (Port 8889)...")
        backend_proc = subprocess.Popen(
            [PYTHON_EXE, BACKEND_MAIN],
            cwd=ROOT_DIR,
            env=os.environ.copy()
        )
        processes.append(backend_proc)

    # 2. Start Kozha Sign Language Engine (FastAPI on Port 8001)
    if is_server_running(SL_ENGINE_URL):
        print(f"[SL Engine] Kozha Sign Language Engine already running at {SL_ENGINE_URL}")
    else:
        print("[SL Engine] Starting Kozha 3D Sign Engine (Port 8001)...")
        sl_proc = subprocess.Popen(
            [PYTHON_EXE, SL_ENGINE_MAIN],
            cwd=ROOT_DIR,
            env=os.environ.copy()
        )
        processes.append(sl_proc)

    # 3. Start Frontend Server (Next.js with Bun on Port from .env)
    if is_server_running(FRONTEND_URL):
        print(f"[Frontend] Next.js frontend already running at {FRONTEND_URL}")
    else:
        print("[Frontend] Running bun install...")
        subprocess.run(["bun", "install"], cwd=FRONTEND_DIR, check=True)

        print("[Frontend] Building frontend with bun build...")
        subprocess.run(["bun", "run", "build"], cwd=FRONTEND_DIR, check=True)

        print(f"[Frontend] Starting Next.js Web Frontend (bun start on Port {FRONTEND_PORT})...")
        env = os.environ.copy()
        env["PORT"] = str(FRONTEND_PORT)
        frontend_proc = subprocess.Popen(
            "bun start",
            cwd=FRONTEND_DIR,
            shell=True,
            env=env
        )
        processes.append(frontend_proc)

    # 4. Wait for servers to initialize
    print("\nWaiting for web services to become ready...")
    backend_ready = False
    sl_ready = False
    frontend_ready = False

    for i in range(25):
        if not backend_ready and is_server_running(BACKEND_URL):
            backend_ready = True
            print(" -> AI Backend Ready (Port 8889)")

        if not sl_ready and is_server_running(SL_ENGINE_URL):
            sl_ready = True
            print(" -> Kozha SL Engine Ready (Port 8001)")
        
        if not frontend_ready and is_server_running(FRONTEND_URL):
            frontend_ready = True
            print(f" -> Web Frontend Ready (Port {FRONTEND_PORT})")


        if backend_ready and sl_ready and frontend_ready:
            break

        time.sleep(1)

    print(f"\nOpening Web UI in default browser: {FRONTEND_URL}")
    webbrowser.open(FRONTEND_URL)
    print("OpenAccess Web App is live! Press Ctrl+C to terminate services.")

    # Keep script alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
