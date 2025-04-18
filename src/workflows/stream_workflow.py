import asyncio
import logging
from typing import Dict, List, Any, Generator, Optional

from src.config.team import TEAM_MEMBERS, TEAM_MEMBER_CONFIGRATIONS
from src.agent.graph import build_graph
from langchain_community.adapters.openai import convert_message_to_dict
from src.config.constants import STREAMING_LLM_AGENTS, EventType
import uuid

from src.tools.browse_tools.browser import browser_tool

# Configure logging
logging.basicConfig(
    level=logging.INFO,  # Default level is INFO
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


def enable_debug_logging():
    """Enable debug level logging for more detailed execution information."""
    logging.getLogger("src").setLevel(logging.DEBUG)


logger = logging.getLogger(__name__)

# Create the graph
graph = build_graph()

# Global variable to track current browser tool instance
current_browser_tool: Optional[browser_tool] = None


async def run_agent_workflow(
    user_input_messages: list,
    debug: Optional[bool] = False,
    deep_thinking_mode: Optional[bool] = False,
    search_before_planning: Optional[bool] = False,
    team_members: Optional[list] = None,
    thread_id: Optional[str] = "default",
):
    """Run the agent workflow to process and respond to user input messages.

    This function orchestrates the execution of various agents in a workflow to handle
    user requests. It manages agent communication, tool usage, and generates streaming
    events for the workflow progress.

    Args:
        user_input_messages: List of user messages to process in the workflow
        debug: If True, enables debug level logging for detailed execution information
        deep_thinking_mode: If True, enables more thorough analysis and consideration
            in agent responses
        search_before_planning: If True, performs preliminary research before creating
            the execution plan
        team_members: Optional list of specific team members to involve in the src.workflow.
            If None, uses default TEAM_MEMBERS configuration
        thread_id: Optional string identifier for maintaining conversation context.
            If not provided, defaults to "default"

    Returns:
        Yields various event dictionaries containing workflow state and progress information,
        including agent activities, tool calls, and the final workflow state

    Raises:
        ValueError: If user_input_messages is empty
        asyncio.CancelledError: If the workflow is cancelled during execution
    """
    if not user_input_messages:
        raise ValueError("Input could not be empty")

    if debug:
        enable_debug_logging()

    logger.info(f"Starting workflow with user input: {user_input_messages}")

    workflow_id = str(uuid.uuid4())

    team_members = team_members if team_members else TEAM_MEMBERS

    # Reset flag at the start of each workflow
    is_workflow_triggered = False
    last_event_data = None

    try:
        async for event in graph.astream_events(
            {
                "TEAM_MEMBERS": team_members,
                "TEAM_MEMBER_CONFIGRATIONS": TEAM_MEMBER_CONFIGRATIONS,
                "messages": [user_input_messages[-1]],
                "deep_thinking_mode": deep_thinking_mode,
                "search_before_planning": search_before_planning,
            },
            config={"configurable": {"thread_id": thread_id}},
            version="v2",
        ):
            kind, data, name, node, langgraph_step, run_id = _extract_event_data(event)
            last_event_data = data

            # Process events and generate output data
            for ydata in _process_event(
                kind,
                data,
                name,
                node,
                workflow_id,
                langgraph_step,
                run_id,
                user_input_messages,
                team_members,
            ):
                if ydata:
                    if ydata.get("event") == "start_of_workflow":
                        is_workflow_triggered = True
                    yield ydata
    except asyncio.CancelledError:
        logger.info("Workflow cancelled, terminating browser agent if exists")
        global current_browser_tool
        if current_browser_tool:
            await current_browser_tool.terminate()
        raise

    # Handle workflow completion - Fix for using yield from in async functions
    for final_event in _generate_final_events(
        workflow_id, last_event_data, is_workflow_triggered
    ):
        yield final_event


def _extract_event_data(
    event: Dict[str, Any],
) -> tuple[str, Dict[str, Any], str, str, str, str]:
    """Extract key data from events"""
    kind = event.get("event")
    data = event.get("data")
    name = event.get("name")
    metadata = event.get("metadata", {})

    node = ""
    if metadata.get("checkpoint_ns") is not None:
        node = metadata.get("checkpoint_ns").split(":")[0]

    langgraph_step = ""
    if metadata.get("langgraph_step") is not None:
        langgraph_step = str(metadata["langgraph_step"])

    run_id = ""
    if event.get("run_id") is not None:
        run_id = str(event["run_id"])

    return kind, data, name, node, langgraph_step, run_id


def _process_event(
    kind: str,
    data: Dict[str, Any],
    name: str,
    node: str,
    workflow_id: str,
    langgraph_step: str,
    run_id: str,
    user_input_messages: List[Dict[str, Any]],
    team_members: Optional[List[str]],
) -> Generator[Dict[str, Any], None, None]:
    """Process events and return corresponding output data"""
    # Handle chain start events
    if kind == EventType.CHAIN_START.value and name in STREAMING_LLM_AGENTS:
        yield from _handle_chain_start(
            name, workflow_id, langgraph_step, user_input_messages
        )

    # Handle chain end events
    elif kind == EventType.CHAIN_END.value and name in STREAMING_LLM_AGENTS:
        yield from _handle_chain_end(name, workflow_id, langgraph_step)

    # Handle chat model start events
    elif kind == EventType.CHAT_MODEL_START.value and node in STREAMING_LLM_AGENTS:
        yield from _handle_chat_model_start(node)

    # Handle chat model end events
    elif kind == EventType.CHAT_MODEL_END.value and node in STREAMING_LLM_AGENTS:
        yield from _handle_chat_model_end(node)

    # Handle chat model stream events
    elif kind == EventType.CHAT_MODEL_STREAM.value and node in STREAMING_LLM_AGENTS:
        yield from _handle_chat_model_stream(data, node)

    # Handle tool start events
    elif kind == EventType.TOOL_START.value and node in team_members:
        yield from _handle_tool_start(node, name, data, workflow_id, run_id)

    # Handle tool end events
    elif kind == EventType.TOOL_END.value and node in team_members:
        yield from _handle_tool_end(node, name, data, workflow_id, run_id)

    return None


def _handle_chain_start(
    name: str,
    workflow_id: str,
    langgraph_step: str,
    user_input_messages: List[Dict[str, Any]],
) -> Generator[Dict[str, Any], None, None]:
    """Handle chain start events"""
    # If it's the planner, generate workflow start event
    if name == "planner":
        yield {
            "event": "start_of_workflow",
            "data": {"workflow_id": workflow_id, "input": user_input_messages},
        }

    yield {
        "event": "start_of_agent",
        "data": {
            "agent_name": name,
            "agent_id": f"{workflow_id}_{name}_{langgraph_step}",
        },
    }


def _handle_chain_end(
    name: str, workflow_id: str, langgraph_step: str
) -> Generator[Dict[str, Any], None, None]:
    """Handle chain end events"""
    yield {
        "event": "end_of_agent",
        "data": {
            "agent_name": name,
            "agent_id": f"{workflow_id}_{name}_{langgraph_step}",
        },
    }


def _handle_chat_model_start(node: str) -> Generator[Dict[str, Any], None, None]:
    """Handle chat model start events"""
    yield {
        "event": "start_of_llm",
        "data": {"agent_name": node},
    }


def _handle_chat_model_end(node: str) -> Generator[Dict[str, Any], None, None]:
    """Handle chat model end events"""
    yield {
        "event": "end_of_llm",
        "data": {"agent_name": node},
    }


def _handle_chat_model_stream(
    data: Dict[str, Any], node: str
) -> Generator[Dict[str, Any], None, None]:
    """Handle chat model stream events"""


    # Extract content safely from different chunk structures
    if isinstance(data["chunk"], str):
        content = data["chunk"]
    elif hasattr(data["chunk"], "content"):
        content = data["chunk"].content
    else:
        content = data["chunk"].get("content") if isinstance(data["chunk"], dict) else None

    # Handle empty content
    if content is None or content == "":
        if not data["chunk"].additional_kwargs.get("reasoning_content"):
            return

        yield {
            "event": "message",
            "data": {
                "message_id": data["chunk"].id,
                "delta": {
                    "reasoning_content": (
                        data["chunk"].additional_kwargs["reasoning_content"]
                    )
                },
            },
        }
        return

    # Handle messages from other agents
    yield {
        "event": "message",
        "data": {
            "message_id": data["chunk"].id,
            "delta": {"content": content},
        },
    }


def _handle_tool_start(node, name, data, workflow_id, run_id):
    """Handle tool start events"""
    yield {
        "event": "tool_call",
        "data": {
            "tool_call_id": f"{workflow_id}_{node}_{name}_{run_id}",
            "tool_name": name,
            "tool_input": data.get("input"),
        },
    }


def _handle_tool_end(node, name, data, workflow_id, run_id):
    """Handle tool end events"""
    # Extract content based on output format
    tool_result = ""
    output = data.get("output")
    
    if output is not None:
        if isinstance(output, str):
            tool_result = output
        elif hasattr(output, "content"):
            tool_result = output.content
        elif isinstance(output, dict) and "content" in output:
            tool_result = output["content"]
    
    yield {
        "event": "tool_call_result",
        "data": {
            "tool_call_id": f"{workflow_id}_{node}_{name}_{run_id}",
            "tool_name": name,
            "tool_result": tool_result,
        },
    }


def _generate_final_events(
    workflow_id: str, data: Dict[str, Any], is_workflow_triggered: bool
) -> Generator[Dict[str, Any], None, None]:
    """Generate workflow end events"""
    if is_workflow_triggered:
        yield {
            "event": "end_of_workflow",
            "data": {"workflow_id": workflow_id},
        }

    yield {
        "event": "final_session_state",
        "data": {
            "messages": [
                convert_message_to_dict(msg)
                for msg in data["output"].get("messages", [])
            ],
        },
    }