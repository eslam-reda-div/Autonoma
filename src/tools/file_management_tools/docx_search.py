import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import DOCXSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def docx_search_tool(
    docx_path: Annotated[str, "Path to the DOCX file to be searched"],
    search_query: Annotated[str, "The query string to search for within the document"]
) -> str:
    """Use this to perform semantic search on a DOCX file."""
    try:
        logger.info(f"Searching DOCX file '{docx_path}' for query '{search_query}'")
        docx_tool = DOCXSearchTool(config=crewai_tools_config)
        results = docx_tool.run(docx=docx_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search DOCX file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
