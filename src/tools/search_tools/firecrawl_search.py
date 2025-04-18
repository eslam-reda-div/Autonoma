import logging
from typing import Annotated

from langchain_core.tools import tool
from crewai_tools import FirecrawlSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def firecrawl_search_tool(
    query: Annotated[str, "The search query to look up"],
) -> str:
    """Performs a search using the FirecrawlSearchTool"""
    try:
        logger.info(f"Searching Firecrawl for '{query}'")
        fire = FirecrawlSearchTool()
        results = fire.run(query=query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search using Firecrawl. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
