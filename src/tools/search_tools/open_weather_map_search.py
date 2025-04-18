import logging
from typing import Annotated

from langchain_core.tools import tool
from langchain_community.tools.openweathermap.tool import OpenWeatherMapQueryRun
from src.tools.decorators import log_io
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

@tool
@log_io
def open_weather_map_search_tool(
    location: Annotated[str, "The location to get weather information for."],
) -> str:
    """Use this to get weather information for a specific location."""
    try:
        logger.info(f"Searching OpenWeatherMap for '{location}'")
        weather_tool = OpenWeatherMapQueryRun()
        results = weather_tool.invoke({"location": location})
        return results
    except BaseException as e:
        error_msg = f"Failed to search OpenWeatherMap. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
