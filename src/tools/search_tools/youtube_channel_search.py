import logging
from typing import Annotated
from langchain_core.tools import tool
from crewai_tools import YoutubeChannelSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def youtube_channel_search_tool(
    youtube_channel_handle: Annotated[str, "The handle/ID of the YouTube channel to search"],
    search_query: Annotated[str, "The search query to find relevant content within the specified channel"],
) -> str:
    """Use this to search for videos on a specific YouTube channel."""
    try:
        logger.info(f"Searching YouTube channel '{youtube_channel_handle}' for '{search_query}'")
        youtube_channel_tool = YoutubeChannelSearchTool(config=crewai_tools_config)
        results = youtube_channel_tool.run(
            youtube_channel_handle=youtube_channel_handle, 
            search_query=search_query
        )
        return results
    except BaseException as e:
        error_msg = f"Failed to search YouTube channel. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
