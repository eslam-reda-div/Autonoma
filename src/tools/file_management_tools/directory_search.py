import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import DirectorySearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def directory_search_tool(
    directory_path: Annotated[str, "The path to the directory to be searched"],
    search_query: Annotated[str, "The query string to search for within the directory contents"]
) -> str:
    """Use this to search within a specified directory for content matching a search query."""
    try:
        logger.info(f"Searching directory '{directory_path}' for '{search_query}'")
        search_tool = DirectorySearchTool(config=crewai_tools_config)
        results = search_tool.run(directory=directory_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search directory. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
