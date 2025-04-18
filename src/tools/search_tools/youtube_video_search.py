import logging
from typing import Annotated
from pydantic import BaseModel, Field

from langchain_core.tools import tool
from crewai_tools import YoutubeVideoSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()


logger = logging.getLogger(__name__)

@tool
@log_io
def youtube_video_search_tool(
    video_url: Annotated[str, "The URL of the YouTube video to search within"],
    search_query: Annotated[str, "The query text to search for in the video content"],
) -> str:
    """Use this to search for content within a specific YouTube video."""
    try:
        logger.info(f"Searching YouTube video '{video_url}' for '{search_query}'")
        youtube_search_tool = YoutubeVideoSearchTool(config=crewai_tools_config)
        results = youtube_search_tool.run(youtube_video_url=video_url, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search YouTube video content. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
