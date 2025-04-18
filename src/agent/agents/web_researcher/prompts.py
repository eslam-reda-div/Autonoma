"""Default prompts used by the src.agent."""

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

SYSTEM_PROMPT = """You are a helpful AI assistant.

System time: {system_time}"""

TOPIC_VALIDATOR_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful assistant whose job is to ensure the user provides a clear topic for research.
        Analyze the user's input and determine if it contains a clear research topic.
        
        Example valid topics:
        - "Artificial Intelligence"
        - "The French Revolution"
        - "Quantum Computing"
        
        Return a structured response with:
        - is_valid: true if a clear topic is provided, false otherwise
        - topic: the extracted topic if valid, null otherwise
        - message: a helpful message if the input is invalid, null otherwise
        
        For invalid inputs or small talk, provide a polite message asking for a specific topic."""
    ),
    ("user", "{input}"),
])

RELATED_TOPICS_PROMPT = ChatPromptTemplate.from_template(
    """I'm writing a Wikipedia page for a topic mentioned below. Please identify and recommend some Wikipedia pages on closely related subjects. I'm looking for examples that provide insights into interesting aspects commonly associated with this topic, or examples that help me understand the typical content and structure included in Wikipedia pages for similar topics.

Please list the as many subjects and urls as you can.

Topic of interest: {topic}
"""
)

PERSPECTIVES_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You need to select a diverse (and distinct) group of Wikipedia editors who will work together to create a comprehensive article on the topic. Each of them represents a different perspective, role, or affiliation related to this topic.
            You can use other Wikipedia pages of related topics for inspiration. For each editor, add a description of what they will focus on. Select up to 3 editors.

            Wiki page outlines of related topics for inspiration:
            {examples}""",
        ),
        ("user", "Topic of interest: {topic}"),
    ]
)

INTERVIEW_QUESTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an experienced Wikipedia writer and want to edit a specific page. \
Besides your identity as a Wikipedia writer, you have a specific focus when researching the topic. \
Now, you are chatting with an expert to get information. Ask good questions to get more useful information.

When you have no more questions to ask, say "Thank you so much for your help!" to end the conversation.\
Please only ask one question at a time and don't ask what you have asked before.\
Your questions should be related to the topic you want to write.
Be comprehensive and curious, gaining as much unique insight from the expert as possible.\

Stay true to your specific perspective:

{persona}""",
        ),
        MessagesPlaceholder(variable_name="messages", optional=True),
    ]
)

INTERVIEW_ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert who can use information effectively. You are chatting with a Wikipedia writer who wants\
 to write a Wikipedia page on the topic you know. Use the provided references to form your response.

Make your response as informative as possible and make sure every sentence is supported by the gathered information.
Each response must be backed up by a citation from a reliable source, formatted as a footnote, reproducing the URLS after your response.

References:
{references}"""
    ),
    MessagesPlaceholder(variable_name="messages", optional=True),
])

REFINE_OUTLINE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a Wikipedia writer. You have gathered information from experts and search engines. Now, you are refining the outline of the Wikipedia page. \
You need to make sure that the outline is comprehensive and specific. \
Topic you are writing about: {topic} 

Your output must follow this structure:
- page_title: The main topic title
- sections: A list of sections where each section has:
  - section_title: The section heading
  - description: The section's main content
  - subsections: A list of subsections (optional) where each has:
    - subsection_title: The subsection heading
    - description: The subsection's content
  - citations: A list of citation URLs

Use the old outline as a base, enhancing it with new information from the conversations. Do not remove existing sections or subsections.

Old outline:

{old_outline}""",
    ),
    (
        "user",
        "Refine the outline based on your conversations with subject-matter experts:\n\nConversations:\n\n{conversations}\n\nProvide the refined outline following the required structure.",
    ),
])

SECTION_WRITER_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert Wikipedia writer. Complete your assigned WikiSection from the following outline:\n\n
{outline}\n\nCite your sources, using the following references:\n\n<Documents>\n{docs}\n</Documents>""",
    ),
    ("user", "Write the full WikiSection for the {section} section. Include both the section description and any subsection descriptions."),
])

ARTICLE_WRITER_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert Wikipedia author. Write the complete wiki article on {topic} using the following section drafts:\n\n
{draft}\n\n
CRITICAL REQUIREMENTS:
1. You MUST write the COMPLETE article including ALL sections from the drafts
2. Do NOT truncate, summarize, or skip any sections
3. Do NOT use placeholders or "[Continue with...]" statements
4. Write the article in its entirety, no matter how long
5. Piece together all section drafts into a cohesive article
6. Make minor adjustments only for flow and transitions between sections
7. Ensure all specific details, examples, and depth from the original drafts are preserved
8. Maintain the comprehensive nature of each section while creating a unified whole

Strictly follow Wikipedia format guidelines.""",
    ),
    (
        "user",
        'Write the COMPLETE Wiki article using markdown format. Include ALL sections. Organize citations using footnotes like "[1]",'
        " avoiding duplicates in the footer. Include URLs in the footer.",
    ),
])

OUTLINE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a Wikipedia writer. Create a comprehensive outline for a Wikipedia page about the given topic.

Your output must follow this structure:
- page_title: The main topic title
- sections: A list of sections where each section has:
  - section_title: The section heading
  - description: A detailed description of what the section will cover
  - subsections: A list of subsections where each has:
    - subsection_title: The subsection heading
    - description: Detailed description of the subsection content
  - citations: A list of citation URLs (can be empty for initial outline)

Make sure to include at least 3-5 main sections with relevant subsections."""
    ),
    ("user", "Create a Wikipedia outline for: {topic}"),
])

QUERY_SUMMARIZATION_PROMPT = ChatPromptTemplate.from_template(
    """Given a long search query, create a shorter, focused version that captures the main search intent in under 350 characters.
Make the shortened query clear and specific enough to return relevant search results.

IMPORTANT: Output ONLY the shortened query. No explanations, no additional text.

Original query: {query}

Shortened query:"""
)
