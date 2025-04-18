import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import CSVSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def csv_search_tool(
    csv_file_path: Annotated[str, "Path to the CSV file to be searched"],
    search_query: Annotated[str, "The query string to search for in the CSV file"]
) -> str:
    """Use this to perform semantic search on a CSV file."""
    try:
        logger.info(f"Searching CSV file '{csv_file_path}' for query '{search_query}'")
        csv_tool = CSVSearchTool(config=crewai_tools_config)
        results = csv_tool.run(csv=csv_file_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search CSV file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
