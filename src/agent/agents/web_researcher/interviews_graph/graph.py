"""Define the interview workflow graph."""

from langgraph.graph import StateGraph, START, END
from langgraph.pregel import RetryPolicy

from src.agent.agents.web_researcher.state import InterviewState
from src.agent.agents.web_researcher.interviews_graph.nodes.initialize import initialize_interview
from src.agent.agents.web_researcher.interviews_graph.nodes.question import generate_question
from src.agent.agents.web_researcher.interviews_graph.nodes.next_editor import next_editor
from src.agent.agents.web_researcher.interviews_graph.router import route_messages
from src.agent.agents.web_researcher.interviews_graph.answers_graph.graph import answer_graph

builder = StateGraph(InterviewState)
        
# Add nodes
builder.add_node("initialize", initialize_interview)
builder.add_node(
    "ask_question", 
    generate_question, 
    retry=RetryPolicy(max_attempts=5)
)
builder.add_node(
    "answer_question",
    answer_graph,
    retry=RetryPolicy(max_attempts=5)
)
builder.add_node("next_editor", next_editor)
        
# Add edges
builder.add_edge(START, "initialize")
builder.add_edge("initialize", "ask_question")
builder.add_conditional_edges(
    "answer_question",
    route_messages,
    {
        "ask_question": "ask_question",
        "next_editor": "next_editor",
        "end": END
    }
)
builder.add_edge("ask_question", "answer_question")
builder.add_conditional_edges(
    "next_editor",
    lambda x: "end" if x.is_complete else "ask_question",
    {
        "ask_question": "ask_question",
        "end": END
    }
)
        
interview_graph = builder.compile() 
interview_graph.name = "Interview Conductor"
