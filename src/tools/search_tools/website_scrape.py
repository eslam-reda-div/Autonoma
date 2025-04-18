import logging
from typing import Annotated

from langchain_core.tools import tool
from crewai_tools import ScrapeWebsiteTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def website_scrape_tool(
    website_url: Annotated[str, "The URL of the website to scrape. Must include protocol (http:// or https://)."],
) -> str:
    """Scrapes a website and returns its content as a string."""
    try:
        logger.info(f"Scraping website: '{website_url}'")
        scraping_tool = ScrapeWebsiteTool()
        results = scraping_tool.run(website_url=website_url)
        return results
    except BaseException as e:
        error_msg = f"Failed to scrape website. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
