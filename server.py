import logging
import uvicorn
import sys
import pyngrok.ngrok as ngrok
import socket
import qrcode
from qrcode.main import QRCode
import io
import re

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

def get_local_ip():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    return local_ip

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
    
    # Print the QR code
    logger.info(f"Scan this QR code to access the server:")
    print(f.getvalue())
    logger.info(f"URL: {clean_url}")

def get_user_choice():
    while True:
        print("\nChoose URL type to use:")
        print("1. Public URL (ngrok)")
        print("2. Network URL (local network)")
        print("3. Local URL (localhost)")
        choice = input("Enter your choice (1-3): ")
        
        if choice in ["1", "2", "3"]:
            return int(choice)
        else:
            print("Invalid choice. Please try again.")

def start_server():
    port = 8833
    
    # Get user choice
    choice = get_user_choice()
    
    public_url = None
    local_ip = get_local_ip()
    network_url = f"http://{local_ip}:{port}"
    local_url = f"http://localhost:{port}"
    
    # Setup based on user choice
    if choice == 1:  # Public URL
        try:
            public_url = ngrok.connect(port)
            logger.info(f"Public URL: {public_url}")
            print_qr_code(str(public_url))
        except Exception as e:
            logger.warning(f"Could not create ngrok tunnel: {str(e)}")
            logger.info("Falling back to network URL:")
            print_qr_code(network_url)
    elif choice == 2:  # Network URL
        logger.info(f"Network URL: {network_url}")
        print_qr_code(network_url)
    else:  # Local URL
        logger.info(f"Local URL: {local_url}")
        print_qr_code(local_url)

    # Start uvicorn
    reload = True
    if sys.platform.startswith("win"):
        reload = False
    
    uvicorn.run(
        "src.api.app:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level="info",
    )

if __name__ == "__main__":
    logger.info("Starting back-end API server")
    start_server()