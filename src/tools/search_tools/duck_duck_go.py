import logging
from typing import Annotated

from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from src.tools.decorators import log_io
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def duck_duck_go_tool(
    query: Annotated[str, "The search query to look up."],
) -> str:
    """Use this to search the web using DuckDuckGo."""
    try:
        logger.info(f"Searching DuckDuckGo for '{query}'")
        search_tool = DuckDuckGoSearchRun()
        results = search_tool.invoke(query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
