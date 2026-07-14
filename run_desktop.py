import sys
import threading
import uvicorn
import webview
import time
import socket

def is_port_in_use(port: int) -> bool:
    """Check if a specific port is in use on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_backend(port: int):
    """Run the FastAPI backend using uvicorn."""
    from app.main import app
    # Run uvicorn server on localhost
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

def main():
    port = 23948  # Custom port to minimize conflicts
    
    # 1. Start the FastAPI backend in a daemon thread
    backend_thread = threading.Thread(target=start_backend, args=(port,), daemon=True)
    backend_thread.start()
    
    # 2. Wait until the backend server starts responding
    retries = 50
    backend_ready = False
    while retries > 0:
        if is_port_in_use(port):
            backend_ready = True
            break
        time.sleep(0.1)
        retries -= 1
        
    if not backend_ready:
        print("Error: Backend server failed to start in time.", file=sys.stderr)
        sys.exit(1)
        
    # 3. Create the native desktop window
    webview.create_window(
        title="Task Manager",
        url=f"http://127.0.0.1:{port}",
        width=1200,
        height=800,
        resizable=True,
        min_size=(900, 600)
    )
    
    # 4. Start the GUI event loop. This blocks until the window is closed.
    webview.start()

if __name__ == '__main__':
    main()
