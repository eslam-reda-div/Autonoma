import os
import socket
import subprocess
import threading
import time
from colorama import init, Fore, Style
from PIL import Image
import io
import re
import qrcode
from qrcode.main import QRCode
import logging
import uvicorn
import sys
import shutil

# Initialize colorama for colored terminal output
init()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def get_agent_web_path():
    """Get the path to the agent-web folder in the current directory"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, "agent-web")

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Create a socket connection to determine the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"{Fore.RED}Error getting local IP: {e}{Style.RESET_ALL}")
        return "127.0.0.1"  # Fallback to localhost

def update_env_file(api_url):
    """Update the .env file with the API URL"""
    env_path = os.path.join(get_agent_web_path(), ".env")
    
    api_url = api_url + "/api"
    
    # Read existing content
    content = ""
    if os.path.exists(env_path):
        with open(env_path, 'r') as file:
            content = file.read()
    
    # Update or add the NEXT_PUBLIC_API_URL
    if "NEXT_PUBLIC_API_URL" in content:
        content = re.sub(r'NEXT_PUBLIC_API_URL=.*', f'NEXT_PUBLIC_API_URL={api_url}', content)
    else:
        content += f"\nNEXT_PUBLIC_API_URL={api_url}"
    
    # Write back to file
    with open(env_path, 'w') as file:
        file.write(content)
    
    print(f"{Fore.GREEN}Updated .env file with API URL: {api_url}{Style.RESET_ALL}")

def display_qr_code(url):
    """Generate and display a QR code in the terminal"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save temporarily and display
    temp_path = os.path.join(os.path.dirname(__file__), "temp_qrcode.png")
    img.save(temp_path)
    
    print(f"\n{Fore.CYAN}Scan this QR code to access the web application:{Style.RESET_ALL}")
    img_display = Image.open(temp_path)
    img_display.show()
    
    print(f"{Fore.YELLOW}Web application URL: {url}{Style.RESET_ALL}")

def print_qr_code(url: str):
    # Extract clean URL from ngrok URL if needed
    clean_url = url
    
    qr = QRCode()
    qr.add_data(clean_url + "/api")
    qr.make()
    
    # Create string buffer to capture console output
    f = io.StringIO()
    qr.print_ascii(out=f)
    f.seek(0)
    
    print(f.getvalue())

def run_api_server():
    """Run the API server using uvicorn in a subprocess"""
    print(f"{Fore.BLUE}Starting API server on network...{Style.RESET_ALL}")
    
    port = 8833
    
    # Check for an available port
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    # Start with the desired port and increment until we find an available one
    initial_port = port
    while is_port_in_use(port):
        print(f"{Fore.YELLOW}Port {port} is in use, trying the next one.{Style.RESET_ALL}")
        port += 1

    if port != initial_port:
        print(f"{Fore.GREEN}Found available port: {port}{Style.RESET_ALL}")
    
    local_ip = get_local_ip()
    network_url = f"http://{local_ip}:{port}"
    api_url = network_url
    
    # Get the current directory - use the actual path where the API code is located
    current_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
    
    print(f"{Fore.YELLOW}Working directory for API: {current_dir}{Style.RESET_ALL}")
    
    # Use sys.executable to ensure we're using the correct Python interpreter
    api_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "src.api.app:app", 
         "--host", "0.0.0.0", "--port", str(port), "--log-level", "info"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        bufsize=1,
        cwd=current_dir  # Set working directory to the project root
    )
    
    # Start a thread to monitor and display output
    def monitor_output(process, prefix):
        for line in iter(process.stdout.readline, ''):
            print(f"{Fore.CYAN}[{prefix}] {line.strip()}{Style.RESET_ALL}")
        for line in iter(process.stderr.readline, ''):
            print(f"{Fore.RED}[{prefix} ERROR] {line.strip()}{Style.RESET_ALL}")
    
    thread = threading.Thread(target=monitor_output, args=(api_process, "API"), daemon=True)
    thread.start()
    
    # Give the API server a moment to start
    print(f"{Fore.YELLOW}Waiting for API server to initialize...{Style.RESET_ALL}")
    time.sleep(5)
    
    # Check if the process is still running
    if api_process.poll() is not None:
        print(f"{Fore.RED}API server failed to start. Exit code: {api_process.poll()}{Style.RESET_ALL}")
        # Try to get error output
        error_output = api_process.stderr.read()
        print(f"{Fore.RED}Error: {error_output}{Style.RESET_ALL}")
        
        # Try an alternative approach
        print(f"{Fore.YELLOW}Attempting to start API server with direct module import...{Style.RESET_ALL}")
        try:
            # Start a direct thread to run uvicorn
            def run_uvicorn():
                os.chdir(current_dir)  # Change to the project directory
                import uvicorn
                uvicorn.run("src.api.app:app", host="0.0.0.0", port=port, log_level="info")
            
            api_thread = threading.Thread(target=run_uvicorn, daemon=True)
            api_thread.start()
            time.sleep(3)  # Give it time to start
            print(f"{Fore.GREEN}API server started in thread mode at {api_url}{Style.RESET_ALL}")
            return api_url, "thread_mode"
        except Exception as e:
            print(f"{Fore.RED}Alternative API server start failed: {str(e)}{Style.RESET_ALL}")
            return api_url, None
        
    print_qr_code(api_url)
    
    print(f"{Fore.GREEN}API server started successfully at {api_url+'/api'}{Style.RESET_ALL}")
    
    return api_url, api_process

def run_web_app():
    """Run the web application with pnpm start"""
    web_app_path = get_agent_web_path()
    
    print(f"{Fore.BLUE}Starting web application from {web_app_path}...{Style.RESET_ALL}")
    
    # Clean up previous build artifacts
    out_dir = os.path.join(web_app_path, "out")
    next_dir = os.path.join(web_app_path, ".next")

    print(f"{Fore.BLUE}Cleaning up previous build artifacts...{Style.RESET_ALL}")

    # Function to force delete a directory and its contents
    def force_delete_dir(dir_path):
        if os.path.exists(dir_path):
            try:
                # Try using rmtree to remove directory and contents
                shutil.rmtree(dir_path, ignore_errors=True)
                print(f"{Fore.GREEN}Removed directory: {dir_path}{Style.RESET_ALL}")
            except Exception as e:
                # If that fails, try using system commands based on OS
                print(f"{Fore.YELLOW}Using system commands to force delete: {dir_path}{Style.RESET_ALL}")
                try:
                    if os.name == 'nt':  # Windows
                        subprocess.run(f'rmdir /S /Q "{dir_path}"', shell=True, check=False)
                    else:  # Unix/Linux/Mac
                        subprocess.run(f'rm -rf "{dir_path}"', shell=True, check=False)
                    print(f"{Fore.GREEN}Removed directory: {dir_path}{Style.RESET_ALL}")
                except Exception as inner_e:
                    print(f"{Fore.RED}Failed to delete {dir_path}: {str(inner_e)}{Style.RESET_ALL}")

    # Delete build directories
    force_delete_dir(out_dir)
    force_delete_dir(next_dir)
    
    # First build the web application
    print(f"{Fore.BLUE}Building web application...{Style.RESET_ALL}")
    build_process = subprocess.Popen(
        ["pnpm", "build"],
        cwd=web_app_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        bufsize=1
    )

    # Monitor the build process
    for line in iter(build_process.stdout.readline, ''):
        print(f"{Fore.CYAN}[BUILD] {line.strip()}{Style.RESET_ALL}")
    for line in iter(build_process.stderr.readline, ''):
        print(f"{Fore.RED}[BUILD ERROR] {line.strip()}{Style.RESET_ALL}")

    # Wait for build to complete
    build_process.wait()

    if build_process.returncode != 0:
        print(f"{Fore.RED}Web application build failed with return code {build_process.returncode}{Style.RESET_ALL}")
        sys.exit(1)

    print(f"{Fore.GREEN}Web application built successfully!{Style.RESET_ALL}")
    
    # Set initial port number
    web_port = 3000
    
    # Check for an available port
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    # Find an available port
    initial_port = web_port
    while is_port_in_use(web_port):
        print(f"{Fore.YELLOW}Port {web_port} is in use, trying the next one.{Style.RESET_ALL}")
        web_port += 1

    if web_port != initial_port:
        print(f"{Fore.GREEN}Found available port for web app: {web_port}{Style.RESET_ALL}")
    
    # Change to the web app directory and serve the out folder
    print(f"{Fore.BLUE}Starting web server on port {web_port}...{Style.RESET_ALL}")
    web_process = subprocess.Popen(
        ["npx", "serve@latest", "out", "-l", str(web_port)],
        cwd=web_app_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        bufsize=1,
        shell=True  # Use with caution
    )
    
    # Start a thread to monitor and display output
    def monitor_output(process, prefix):
        for line in iter(process.stdout.readline, ''):
            print(f"{Fore.GREEN}[{prefix}] {line.strip()}{Style.RESET_ALL}")
        for line in iter(process.stderr.readline, ''):
            print(f"{Fore.RED}[{prefix} ERROR] {line.strip()}{Style.RESET_ALL}")
    
    thread = threading.Thread(target=monitor_output, args=(web_process, "WEB"), daemon=True)
    thread.start()
    
    # Return both the process and the port number
    return web_process, web_port

def main():
    print(f"{Fore.MAGENTA}=== Starting Development Environment ==={Style.RESET_ALL}")
    
    # Get local IP
    local_ip = get_local_ip()
    print(f"{Fore.YELLOW}Local IP address: {local_ip}{Style.RESET_ALL}")
    
    # Start API server
    api_url, api_process = run_api_server()
    
    # Update environment file
    update_env_file(api_url)
    
    # Start web application
    web_process, web_port = run_web_app()
    
    # Wait for web app to initialize (typically on port 3000)
    print(f"{Fore.YELLOW}Waiting for web application to start...{Style.RESET_ALL}")
    time.sleep(10)  # Give it some time to start
    
    # Generate QR code for web app URL
    web_url = f"http://{local_ip}:{web_port}"
    display_qr_code(web_url)
    
    try:
        # Keep running until interrupted
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Fore.MAGENTA}Shutting down...{Style.RESET_ALL}")
        # Cleanup processes
        if web_process:
            web_process.terminate()
        if api_process:
            api_process.terminate()
        
        # Remove temporary QR code file
        temp_qr = os.path.join(os.path.dirname(__file__), "temp_qrcode.png")
        if os.path.exists(temp_qr):
            try:
                os.remove(temp_qr)
            except:
                pass

if __name__ == "__main__":
    main()
