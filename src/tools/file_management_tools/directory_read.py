import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import DirectoryReadTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def directory_read_tool(
    directory_path: Annotated[str, "The path to the directory to be read"]
) -> str:
    """Use this to read and return the contents of a directory."""
    try:
        logger.info(f"Reading directory contents from '{directory_path}'")
        directory_tool = DirectoryReadTool()
        results = directory_tool.run(directory=directory_path)
        return results
    except BaseException as e:
        error_msg = f"Failed to read directory contents. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
