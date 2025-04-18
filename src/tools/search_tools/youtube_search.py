import logging
from typing import Annotated

from langchain_core.tools import tool
from langchain_community.tools.youtube.search import YouTubeSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

@tool
@log_io
def youtube_search_tool(
    query: Annotated[str, "The YouTube search query."],
) -> str:
    """Use this to search for videos on YouTube."""
    try:
        logger.info(f"Searching YouTube for '{query}'")
        search_tool = YouTubeSearchTool()
        results = search_tool.invoke({"query": query})
        return results
    except BaseException as e:
        error_msg = f"Failed to search YouTube. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
