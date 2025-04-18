import logging
from typing import Annotated

from langchain_core.tools import tool
from crewai_tools import ScrapeElementFromWebsiteTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def scrape_element_tool(
    website_url: Annotated[str, "The URL of the website to scrape. Must include protocol (http:// or https://)."],
    css_element: Annotated[str, "CSS selector to identify the element to extract."]
) -> str:
    """Scrapes content from a specified CSS element on a webpage."""
    try:
        logger.info(f"Scraping element from website: '{website_url}'")
        scraping_tool = ScrapeElementFromWebsiteTool()
        results = scraping_tool.run(website_url=website_url, css_element=css_element)
        return results
    except BaseException as e:
        error_msg = f"Failed to scrape element from website. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
