import logging
from langchain_community.tools.file_management import DeleteFileTool
from src.tools.decorators import create_logged_tool

logger = logging.getLogger(__name__)

# Initialize file management tool with logging
LoggedDeleteFile = create_logged_tool(DeleteFileTool)
delete_file_tool = LoggedDeleteFile()
