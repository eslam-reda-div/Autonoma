import logging
from langchain_community.tools.file_management import MoveFileTool
from src.tools.decorators import create_logged_tool

logger = logging.getLogger(__name__)

# Initialize file management tool with logging
LoggedMoveFile = create_logged_tool(MoveFileTool)
move_file_tool = LoggedMoveFile()
