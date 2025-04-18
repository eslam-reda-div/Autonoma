TEAM_MEMBER_CONFIGRATIONS = {
    "researcher": {
        "name": "researcher",
        "desc": (
            "Responsible for searching and collecting relevant information, understanding user needs and conducting research analysis"
        ),
        "desc_for_llm": (
            "Uses search engines and web crawlers to gather information from the internet. "
            "Outputs a Markdown report summarizing findings. Researcher can not do math or programming."
        ),
        "is_optional": False,
    },
    "coder": {
        "name": "coder",
        "desc": (
            "Responsible for code implementation, debugging and optimization, handling technical programming tasks"
        ),
        "desc_for_llm": (
            "Executes Python or Bash commands, performs mathematical calculations, and outputs a Markdown report. "
            "Must be used for all mathematical computations."
        ),
        "is_optional": True,
    },
    "browser": {
        "name": "browser",
        "desc": "Responsible for web browsing, content extraction and interaction",
        "desc_for_llm": (
            "Directly interacts with web pages, performing complex operations and interactions. "
            "You can also leverage `browser` to perform in-domain search, like Facebook, Instgram, Github, etc."
        ),
        "is_optional": True,
    },
    "file_manager": {
        "name": "file_manager",
        "desc": "Responsible for file operations including reading, writing, creating, updating, moving, deleting, and copying files and directories",
        "desc_for_llm": (
            "Handles all file system operations such as creating, reading, updating, deleting files and directories. "
            "Can copy, move, rename files, search for content, and manage files."
            "Use this for any task involving file manipulation or data storage."
        ),
        "is_optional": True,
    },
    "computer": {
        "name": "computer",
        "desc": "Responsible for controlling the Windows 11 system, interacting with applications, and executing complex operations",
        "desc_for_llm": (
            "Acts as a computer operations specialist on Windows 11, capable of opening applications, navigating websites, "
            "managing files, executing system operations, and controlling keyboard/mouse interactions. "
            "Can perform complex multi-step processes through detailed task descriptions like "
            "'Open Chrome and navigate to Gmail', 'Create folders and move files in Explorer', or "
            "'Take screenshots and save them'. Tasks are executed by providing comprehensive instructions "
            "with specific paths, actions, and handling of potential error states."
        ),
        "is_optional": True,
    },
    "reporter": {
        "name": "reporter",
        "desc": (
            "Responsible for summarizing analysis results, generating reports and presenting final outcomes to users"
        ),
        "desc_for_llm": "Write a professional report based on the result of each step.",
        "is_optional": False,
    },
}

TEAM_MEMBERS = list(TEAM_MEMBER_CONFIGRATIONS.keys())