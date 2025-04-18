import logging
from typing import Annotated

from langchain_core.tools import tool
from crewai_tools import FirecrawlCrawlWebsiteTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def firecrawl_crawl_website_tool(
    url: Annotated[str, "The URL of the website to crawl and extract content from"],
) -> str:
    """Crawls a website to extract its content using FirecrawlCrawlWebsiteTool
    
    This tool enables crawling a website to extract its content, allowing for processing 
    and retrieval of information from web pages.
    """
    try:
        logger.info(f"Crawling website using Firecrawl: '{url}'")
        fire = FirecrawlCrawlWebsiteTool()
        results = fire.run(url=url)
        return results
    except BaseException as e:
        error_msg = f"Failed to crawl website using Firecrawl. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
