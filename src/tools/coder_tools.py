from langchain.tools import StructuredTool
import math
from typing import Any, Callable

# Your existing tools
from src.tools.code_tools.bash_tool import bash_tool
from src.tools.code_tools.python_repl import python_repl_tool

def create_math_tool(func: Callable[..., Any], func_name: str) -> StructuredTool:
    """Create a LangChain tool for a math function with proper type handling."""
    # Generate description from docstring
    doc = func.__doc__ or ''
    description = f"Math function {func_name}: {doc.splitlines()[0].strip() if doc else ''}"
    
    # Create wrapper function with basic type conversion
    def math_wrapper(*args, **kwargs) -> str:
        try:
            # Attempt to convert all arguments to floats
            converted_args = [float(arg) for arg in args]
            result = func(*converted_args, **kwargs)
            return str(result)
        except Exception as e:
            return f"Error: {str(e)}"
    
    return StructuredTool.from_function(
        func=math_wrapper,
        name=f"math_{func_name}",
        description=description,
        # Add parameter schema if needed using args_schema
    )

# Create list of math tools
math_tools = []
excluded = ['__name__', '__package__']  # Exclude module attributes

for func_name in dir(math):
    if func_name in excluded:
        continue
    
    func = getattr(math, func_name)
    if callable(func):
        try:
            math_tool = create_math_tool(func, func_name)
            math_tools.append(math_tool)
        except Exception as e:
            print(f"Skipping {func_name}: {str(e)}")

# Combine all tools
tools = [
    bash_tool,
    python_repl_tool,
] + math_tools