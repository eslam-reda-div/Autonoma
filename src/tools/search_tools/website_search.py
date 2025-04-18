import logging
from typing import Annotated
from pydantic import BaseModel, Field

from langchain_core.tools import tool
from crewai_tools import WebsiteSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()


logger = logging.getLogger(__name__)

@tool
@log_io
def website_search_tool(
    website_url: Annotated[str, "The URL of the website to search"],
    search_query: Annotated[str, "The search query to look for within the website content"],
) -> str:
    """Use this to search for specific information within a website."""
    try:
        logger.info(f"Searching website '{website_url}' for '{search_query}'")
        website_search = WebsiteSearchTool(config=crewai_tools_config)
        return website_search.run(website=website_url, search_query=search_query)
    except BaseException as e:
        error_msg = f"Failed to search website. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
