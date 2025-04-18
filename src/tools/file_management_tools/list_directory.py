import logging
from langchain_community.tools.file_management import ListDirectoryTool
from src.tools.decorators import create_logged_tool

logger = logging.getLogger(__name__)

# Initialize file management tool with logging
LoggedListDirectory = create_logged_tool(ListDirectoryTool)
list_directory_tool = LoggedListDirectory()
