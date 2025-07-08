import os
import numpy as np
from openai import OpenAI
import json
from typing import List, Dict, Optional
import dotenv
dotenv.load_dotenv()

class Chatbot:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.gpt_model = os.getenv('GPT_MODEL')
        self.embedding_model = os.getenv('EMBEDDING_MODEL')

        self.embedder = 






