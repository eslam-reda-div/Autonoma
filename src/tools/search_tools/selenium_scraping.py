import logging
from typing import Annotated

from langchain_core.tools import tool
from crewai_tools import SeleniumScrapingTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def selenium_scraping_tool(
    website_url: Annotated[str, "The URL of the website to scrape"],
    css_element: Annotated[str, "The CSS selector to target specific elements on the webpage"]
) -> str:
    """Extracts content from a webpage using Selenium.
    This tool navigates to a specified website and extracts content based on the provided CSS selector."""
    try:
        logger.info(f"Scraping website using Selenium: '{website_url}'")
        scraping_tool = SeleniumScrapingTool()
        results = scraping_tool.run(website_url=website_url, css_element=css_element)
        return results
    except BaseException as e:
        error_msg = f"Failed to scrape website. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
