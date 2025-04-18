import logging
from typing import Annotated
import os
from langchain_core.tools import tool
from crewai_tools import SerperDevTool
from src.tools.decorators import log_io
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def serper_dev_search_tool(
    query: Annotated[str, "The search query string to be sent to the search engine"],
    n_results: Annotated[int, "The number of search results to return"] = 10
) -> str:
    """Use this to search the web using SerperDev."""
    try:
        logger.info(f"Searching SerperDev for '{query}'")
        search_tool = SerperDevTool()
        results = search_tool.run(search_query=query, n_results=n_results)
        return results
    except BaseException as e:
        error_msg = f"Failed to search with SerperDev. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
