import logging
import json
from typing import Literal
from langchain_core.messages import HumanMessage
from langgraph.types import Command
from langgraph.types import Command
from src.utils.json_utils import repair_json_output
from src.agent.agents.prompts.template import apply_prompt_template
from src.agent.state import State
from src.config.llm import coder_llm
from langgraph.prebuilt import create_react_agent
from src.tools.coder_tools import tools
from langgraph_codeact import create_codeact
from langgraph.checkpoint.memory import MemorySaver
import builtins
import contextlib
import io
from typing import Any

logger = logging.getLogger(__name__)

def eval(code: str, _locals: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    # Store original keys before execution
    original_keys = set(_locals.keys())

    try:
        with contextlib.redirect_stdout(io.StringIO()) as f:
            exec(code, builtins.__dict__, _locals)
        result = f.getvalue()
        if not result:
            result = "<code ran, no output printed to stdout>"
    except Exception as e:
        result = f"Error during execution: {repr(e)}"

    # Determine new variables created during execution
    new_keys = set(_locals.keys()) - original_keys
    new_vars = {key: _locals[key] for key in new_keys}
    return result, new_vars

def code_node(state: State) -> Command[Literal["supervisor"]]:
    global eval
    logger.info("Code agent starting task")

    # code_act = create_codeact(
    #     coder_llm, 
    #     tools, 
    #     eval,
    #     lambda state: apply_prompt_template('coder', state)
    # )
    # coder_agent = code_act.compile(checkpointer=MemorySaver())

    coder_agent = create_react_agent(
        coder_llm,
        tools=tools,
        prompt=lambda state: apply_prompt_template('coder', state)
    )

    result = coder_agent.invoke(state)
    logger.info("Code agent completed task")
    response_content = result["messages"][-1].content
    response_content = repair_json_output(response_content)
    logger.debug(f"Code agent response: {response_content}")
    return Command(
        update={
            "messages": [
                HumanMessage(
                    content=response_content,
                    name="coder",
                )
            ]
        },
        goto="supervisor",
    )