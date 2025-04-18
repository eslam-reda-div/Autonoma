# import speech_recognition as sr
# from langdetect import detect
# from stt.whisper import stt
# import time

# def recognize_speech():
#     # Initialize recognizer
#     recognizer = sr.Recognizer()
#     while True:
#         # Use microphone as source
#         with sr.Microphone() as source:
#             print("Listening... Speak now.")
#             # Adjust for ambient noise
#             recognizer.adjust_for_ambient_noise(source)
#             # Listen for audio
#             audio = recognizer.listen(source)
#         try:
#             # Use Google Speech Recognition to convert audio to text
#             start_time = time.time()
#             text = stt(audio)
#             end_time = time.time()
#             print(f"Speech recognition took {end_time - start_time:.2f} seconds")
#             print("You said:", text)
#             print("Language detected:", detect(text['lang']))
            
#             # If you want to add an exit command, you could do:
#             # if text.lower() == "exit":
#             #     print("Exiting voice recognition loop.")
#             #     break
                
#         except sr.UnknownValueError:
#             print("Could not understand audio")
#         except sr.RequestError as e:
#             print(f"Error with the speech recognition service; {e}")

# if __name__ == "__main__":
#     # Make sure to install the required libraries:
#     # pip install SpeechRecognition
#     # pip install PyAudio
#     recognize_speech()


# from src.tools.schedule_tools.schedule import schedule_tool
# import datetime

# current_time = datetime.datetime.now()
# schedule_time = current_time + datetime.timedelta(seconds=60)

# formatted_time = schedule_time.strftime("%Y-%m-%d %H:%M")
# result = schedule_tool.invoke({
#     "user_input": "how are you today?",
#     "schedule_time": formatted_time
# })

# print(result)

# print(f"Scheduled for: {formatted_time}")

# print("tool name: ", schedule_tool.name)
# print("tool description: ", schedule_tool.description)
# print("tool args: ", schedule_tool.args)

# from src.utils.save_graph import save_graph

# save_graph()

# from src.agent.agents.operate.operate import main

# main("gpt-4-with-ocr", "open google docs and write a paragraph about the software engnearing", voice_mode=False, verbose_mode=True)

# from src.tools.compute_tools.computer import computer

# print("name: ", computer.name)
# print("description: ", computer.description)
# print("args: ", computer.args)
# from src.tools.coder_tools import tools

# for tool in tools:
#     print("name: ", tool.name)
#     print("description: ", tool.description)
#     print("args: ", tool.args)
#     print("-------------------------------------------------")


# import shutil
# import os

# for root, dirs, files in os.walk(".", topdown=False):
#     for dir in dirs:
#         if dir == "__pycache__":
#             shutil.rmtree(os.path.join(root, dir))

# from src.tools.browse_tools.browser import browser_tool

# browser_tool.invoke({    
# "instruction": "Please navigate to the official linkedin website and navegate to my connections page and send a connection request to the first person in the list"
# })