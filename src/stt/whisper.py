import speech_recognition as sr
from langdetect import detect
import os
from dotenv import load_dotenv

load_dotenv()

def stt(input_source, is_wav_file=False):
    recognizer = sr.Recognizer()
    try:
        if is_wav_file:
            with sr.AudioFile(input_source) as source:
                audio = recognizer.record(source)
        else:
            audio = input_source
            
        text = recognizer.recognize_faster_whisper(audio, model=os.getenv("WHISPER_MODEL"))
        if text == "" or text is None or text == " " or str(text).strip() == "":
            return {
                "text": "Could not understand what you said try saying it again and make sure you are speaking clearly and close to the microphone.",
                "error": True
            }
        return {
            "text": text, 
            "error": False
        }
    except sr.UnknownValueError:
        return {
            "text": "Could not understand what you said try saying it again and make sure you are speaking clearly and close to the microphone.",
            "error": True
        }
    except sr.RequestError as e:
        return {
            "text": f"Error with the speech recognition service; {e}",
            "error": True
        }
    except Exception as e:
        return {
            "text": f"An unexpected error occurred: {e}",
            "error": True
        }