import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import MDXSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def mdx_search_tool(
    mdx_file_path: Annotated[str, "Path to the MDX file to be searched"],
    search_query: Annotated[str, "The query string to search for in the MDX file"]
) -> str:
    """Use this to perform semantic search on an MDX file."""
    try:
        logger.info(f"Searching MDX file '{mdx_file_path}' for query '{search_query}'")
        mdx_tool = MDXSearchTool(config=crewai_tools_config)
        results = mdx_tool.run(mdx=mdx_file_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search MDX file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
