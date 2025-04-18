import logging
from langchain import hub
from dotenv import load_dotenv
from src.config.llm import single_agent_llm
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain_core.messages import HumanMessage, AIMessage
from src.tools.single_agent import tools
from src.agent.agents.prompts.template import get_prompt_template

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

def enable_debug_logging():
    logging.getLogger(__name__).setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)

prompt = hub.pull("hwchase17/structured-chat-agent")

chat = [
    HumanMessage(content=get_prompt_template('single_agent')),
]

agent = create_structured_chat_agent(
    llm=single_agent_llm, 
    tools=tools, 
    prompt=prompt
)

app = AgentExecutor(
    agent=agent, 
    tools=tools, 
    verbose=True,
    handle_parsing_errors=True,
)

def run_agent_workflow(user_input: str, debug: bool = False):
    global chat
    global app
    if not user_input:
        raise ValueError("Input could not be empty")

    if debug:
        enable_debug_logging()

    logger.info(f"Starting workflow with user input: {user_input}")
    result = app.invoke(
        {
            "input": user_input,
            "chat_history": chat
        }
    )
    response_content = result.get("output", "I'm sorry, I didn't understand that.")
    chat.append(HumanMessage(content=user_input))
    chat.append(AIMessage(content=response_content))
    logger.info("Workflow completed successfully")
    result = {}
    result["messages"] = chat
    return result
