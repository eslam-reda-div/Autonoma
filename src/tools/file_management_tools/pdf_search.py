import logging
from typing import Annotated
import os

from langchain_core.tools import tool
from crewai_tools import PDFSearchTool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.config.llm import crewai_tools_config

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def pdf_search_tool(
    pdf_file_path: Annotated[str, "Path to the PDF file to be searched"],
    search_query: Annotated[str, "The query string to search for in the PDF document"]
) -> str:
    """Use this to perform semantic search on a PDF document."""
    try:
        logger.info(f"Searching PDF file '{pdf_file_path}' for query '{search_query}'")
        pdf_tool = PDFSearchTool(config=crewai_tools_config)
        results = pdf_tool.run(pdf=pdf_file_path, query=search_query)
        return results
    except BaseException as e:
        error_msg = f"Failed to search PDF file. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
