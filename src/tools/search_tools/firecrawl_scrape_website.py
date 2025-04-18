import logging
from typing import Annotated

from langchain_core.tools import tool
from crewai_tools import FirecrawlScrapeWebsiteTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def firecrawl_scrape_website_tool(
    url: Annotated[str, "The URL of the website to scrape. Should be a valid and complete URL including the protocol (http:// or https://)."],
) -> str:
    """Use this to scrape the content of a website using Firecrawl's web scraping tool."""
    try:
        logger.info(f"Scraping website using Firecrawl: '{url}'")
        scrape_tool = FirecrawlScrapeWebsiteTool()
        results = scrape_tool.run(url=url)
        return results
    except BaseException as e:
        error_msg = f"Failed to scrape website. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
