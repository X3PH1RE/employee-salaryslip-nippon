from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass  # Vercel injects env vars; dotenv is for local dev

try:
    from app import create_app
    app = create_app()
except Exception:
    import sys
    import traceback
    traceback.print_exc(file=sys.stderr)
    raise

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
