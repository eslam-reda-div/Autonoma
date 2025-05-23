import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import JSONSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def json_search_tool(
    json_file_path: Annotated[str, "Path to the JSON file to be searched"],
    search_query: Annotated[str, "The query string to search for in the JSON file"]
) -> str:
    """Use this to perform semantic search on a JSON file."""
    try:
        logger.info(f"Searching JSON file '{json_file_path}' for query '{search_query}'")
        json_tool = JSONSearchTool(config=crewai_tools_config)
        results = json_tool.run(json_path=json_file_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search JSON file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
