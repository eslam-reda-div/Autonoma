import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import XMLSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def xml_search_tool(
    xml_file_path: Annotated[str, "Path to the XML file to be searched"],
    search_query: Annotated[str, "The query string to search for in the XML file"]
) -> str:
    """Use this to perform semantic search on an XML file."""
    try:
        logger.info(f"Searching XML file '{xml_file_path}' for query '{search_query}'")
        xml_tool = XMLSearchTool(config=crewai_tools_config)
        results = xml_tool.run(xml=xml_file_path, search_query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search XML file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
