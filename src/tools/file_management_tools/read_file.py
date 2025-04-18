import logging
from langchain_community.tools.file_management import ReadFileTool
from src.tools.decorators import create_logged_tool

logger = logging.getLogger(__name__)

# Initialize file management tool with logging
LoggedReadFile = create_logged_tool(ReadFileTool)
read_file_tool = LoggedReadFile()
