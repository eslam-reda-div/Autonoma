import logging
from langchain_community.tools.file_management import CopyFileTool
from src.tools.decorators import create_logged_tool

logger = logging.getLogger(__name__)

# Initialize file management tool with logging
LoggedCopyFile = create_logged_tool(CopyFileTool)
copy_file_tool = LoggedCopyFile()
