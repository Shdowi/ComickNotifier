import subprocess
import sys
import os
import time

if __name__ == "__main__":
    # Small delay to ensure the bot is fully closed before restarting
    time.sleep(1)
    try:
        subprocess.Popen([sys.executable, os.path.join(os.path.dirname(__file__), "main.py")])
    except Exception as e:
        print(f"Failed to launch main.py: {e}")
