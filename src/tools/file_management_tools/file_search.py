import logging
from langchain_community.tools.file_management import FileSearchTool
from src.tools.decorators import create_logged_tool

logger = logging.getLogger(__name__)

# Initialize file management tool with logging
LoggedFileSearch = create_logged_tool(FileSearchTool)
file_search_tool = LoggedFileSearch()
