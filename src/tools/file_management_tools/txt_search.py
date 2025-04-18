import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import TXTSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def txt_search_tool(
    text_file_path: Annotated[str, "Path to the text file to be searched"],
    search_query: Annotated[str, "The query string to search for in the text file"]
) -> str:
    """Use this to perform semantic search on a text file."""
    try:
        logger.info(f"Searching text file '{text_file_path}' for query '{search_query}'")
        text_tool = TXTSearchTool(config=crewai_tools_config)
        results = text_tool.run(txt=text_file_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search text file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
