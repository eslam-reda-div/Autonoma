import asyncio
import logging
import json
import subprocess
import time
import os
import uuid
from pydantic import BaseModel, Field
from typing import Optional, ClassVar, Type
from langchain.tools import BaseTool
from browser_use import AgentHistoryList, Browser, BrowserConfig
from browser_use import Agent as BrowserAgent
from src.config.llm import browser_tool_llm as llm
from src.tools.decorators import create_logged_tool
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BROWSER_HISTORY_DIR = os.getenv("BROWSER_HISTORY_DIR")
CHROME_INSTANCE_PATH = os.getenv("CHROME_INSTANCE_PATH")
CHROME_HEADLESS = os.getenv("CHROME_HEADLESS", "False") == "True"
CHROME_PROXY_SERVER = os.getenv("CHROME_PROXY_SERVER")
CHROME_PROXY_USERNAME = os.getenv("CHROME_PROXY_USERNAME")
CHROME_PROXY_PASSWORD = os.getenv("CHROME_PROXY_PASSWORD")

# Create browser history directory if it doesn't exist
os.makedirs(BROWSER_HISTORY_DIR, exist_ok=True)

def ensure_chrome_debug_available():
    """Ensure Chrome is available in debug mode by checking existing processes 
    and starting a new debug instance if needed."""
    try:
        # Check if Chrome is already running in debug mode by trying to connect
        import requests
        try:
            response = requests.get("http://localhost:9222/json/version", timeout=2)
            if response.status_code == 200:
                logger.info("Chrome debug instance already running")
                return True
        except requests.exceptions.RequestException:
            logger.info("No Chrome debug instance detected, will launch new one")
        
        # On Windows, kill existing Chrome processes that might interfere
        if os.name == 'nt':
            try:
                subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], 
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                logger.info("Killed existing Chrome processes")
                time.sleep(1)  # Give it time to shut down
            except Exception as e:
                logger.warning(f"Failed to kill Chrome processes: {e}")

        # Launch Chrome in debug mode
        chrome_path = CHROME_INSTANCE_PATH or "chrome"
        debug_command = [
            chrome_path,
            "--remote-debugging-port=9222",
            "--no-first-run",
            "--no-default-browser-check",
            # f"--user-data-dir={os.path.join(os.getcwd(), 'chrome_user_data')}"
        ]
        
        subprocess.Popen(debug_command, 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE,
                        shell=True if os.name == 'nt' else False)
        
        logger.info("Launched Chrome in debug mode")
        
        # Wait for Chrome to initialize
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                response = requests.get("http://localhost:9222/json/version", timeout=2)
                if response.status_code == 200:
                    logger.info("Chrome debug instance is now ready")
                    return True
            except requests.exceptions.RequestException:
                pass
            
            logger.info(f"Waiting for Chrome to initialize (attempt {attempt+1}/{max_attempts})")
            time.sleep(2)
            
        logger.warning("Chrome debug instance not responding after multiple attempts")
        return False
        
    except Exception as e:
        logger.error(f"Error ensuring Chrome debug availability: {str(e)}")
        return False


def initialize_browser():
    """Initialize browser configuration and create browser instance."""
    # Try to ensure Chrome is available before configuring browser
    chrome_debug_ready = ensure_chrome_debug_available()
    
    browser_config = BrowserConfig(
        headless=CHROME_HEADLESS,
        chrome_instance_path=CHROME_INSTANCE_PATH,
    )
    
    if CHROME_PROXY_SERVER:
        proxy_config = {
            "server": CHROME_PROXY_SERVER,
        }
        if CHROME_PROXY_USERNAME:
            proxy_config["username"] = CHROME_PROXY_USERNAME
        if CHROME_PROXY_PASSWORD:
            proxy_config["password"] = CHROME_PROXY_PASSWORD
        browser_config.proxy = proxy_config
    
    try:
        browser_instance = Browser(config=browser_config)
        logger.info("Browser instance created successfully")
        return browser_instance
    except Exception as e:
        logger.error(f"Failed to create browser instance: {str(e)}")
        return None


class BrowserUseInput(BaseModel):
    """Input for browser tool."""
    instruction: str = Field(..., description="The instruction to use browser")


class BrowserTool(BaseTool):
    name: ClassVar[str] = "browser"
    args_schema: Type[BaseModel] = BrowserUseInput
    description: ClassVar[str] = (
        "Use this tool to interact with web browsers. Input should be a natural language description of what you want to do with the browser, such as 'Go to google.com and search for browser-use', or 'Navigate to Reddit and find the top post about AI'."
    )

    _agent: Optional[BrowserAgent] = None
    _browser: Optional[Browser] = None

    def _generate_browser_result(
        self, result_content: str, generated_gif_path: str
    ) -> dict:
        return {
            "result_content": result_content,
            "generated_gif_path": generated_gif_path,
        }
        
    def _ensure_browser(self):
        """Ensure browser is initialized."""
        if self._browser is None:
            self._browser = initialize_browser()
        return self._browser is not None

    def _run(self, instruction: str) -> str:
        """Run the browser task synchronously."""
        if not self._ensure_browser():
            return "Error: Browser instance is not available. Check Chrome installation and configuration."
            
        generated_gif_path = f"{BROWSER_HISTORY_DIR}/{uuid.uuid4()}.gif"
        
        self._agent = BrowserAgent(
            task=instruction,
            llm=llm,
            browser=self._browser,
            generate_gif=generated_gif_path,
        )

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(self._agent.run())

                if isinstance(result, AgentHistoryList):
                    return json.dumps(
                        self._generate_browser_result(
                            result.final_result(), generated_gif_path
                        )
                    )
                else:
                    return json.dumps(
                        self._generate_browser_result(result, generated_gif_path)
                    )
            finally:
                loop.close()
        except Exception as e:
            error_msg = f"Error executing browser task: {str(e)}"
            logger.error(error_msg)
            return error_msg

    async def terminate(self):
        """Terminate the browser agent if it exists."""
        if self._agent and self._agent.browser:
            try:
                await self._agent.browser.close()
            except Exception as e:
                logger.error(f"Error terminating browser agent: {str(e)}")
        self._agent = None

    async def _arun(self, instruction: str) -> str:
        """Run the browser task asynchronously."""
        if not self._ensure_browser():
            return "Error: Browser instance is not available. Check Chrome installation and configuration."
            
        generated_gif_path = f"{BROWSER_HISTORY_DIR}/{uuid.uuid4()}.gif"
        
        self._agent = BrowserAgent(
            task=instruction,
            llm=llm,
            browser=self._browser,
            generate_gif=generated_gif_path,
        )
        try:
            result = await self._agent.run()
            if isinstance(result, AgentHistoryList):
                return json.dumps(
                    self._generate_browser_result(
                        result.final_result(), generated_gif_path
                    )
                )
            else:
                return json.dumps(
                    self._generate_browser_result(result, generated_gif_path)
                )
        except Exception as e:
            error_msg = f"Error executing browser task: {str(e)}"
            logger.error(error_msg)
            return error_msg
        finally:
            await self.terminate()


BrowserTool = create_logged_tool(BrowserTool)
browser_tool = BrowserTool()