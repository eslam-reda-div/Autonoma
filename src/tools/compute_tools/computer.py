import logging
from typing import Annotated

from langchain_core.tools import tool
from src.tools.decorators import log_io
from dotenv import load_dotenv
from src.agent.agents.operate.operate import main
import os

load_dotenv()

logger = logging.getLogger(__name__)

@tool
@log_io
def computer(
    task: Annotated[str, "The complete detailed task description including all necessary information to perform the operation on the computer. Be specific about what applications to open, websites to navigate, or operations to perform."],
) -> str:
    """Use this to perform operations on the computer like opening applications, navigating websites, etc."""
    try:
        logger.info(f"Executing computer operation: '{task}'")
        if os.getenv("OPERATE_OCR_WITH_YOLO", "False") == "True":
            result = main("gpt-4-with-som", task, voice_mode=False, verbose_mode=True) # use yolov8 ocr
        else:
            result = main("gpt-4-with-ocr", task, voice_mode=False, verbose_mode=True)
        return result
    except BaseException as e:
        error_msg = f"Failed to execute computer operation. Error: {repr(e)}"
        logger.error(error_msg)
        return error_msg
