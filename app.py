import json
import os
from datetime import datetime
from dotenv import load_dotenv
from src.utils.save_graph import save_graph
from src.utils.save_conversations import save_conversation
from src.workflows.workflow import run_agent_workflow
# from workflows.single_agent import run_agent_workflow

load_dotenv()
# save_graph()

if __name__ == "__main__":
    while True:
        try:
            user_query = input("Enter your query (type 'exit' to quit): ")
            
            if user_query.lower() == 'exit':
                print("Exiting voice assistant. Goodbye!")
                break
    
            result = run_agent_workflow(
                user_input=user_query, 
                deep_thinking_mode=True,
                search_before_planning=False,
                debug=False
            )
            
            print("\n=== Conversation History ===")
            for message in result["messages"]:
                role = message.type
                print(f"\n[{role.upper()}] - [{message.name}]: {message.content}")
            print("\n")
            
            # Save the conversation after each interaction
            save_conversation(result)
            
        except KeyboardInterrupt:
            print("\nExiting voice assistant. Goodbye!")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")
