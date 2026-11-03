import logging
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

logger = logging.getLogger(__name__)

class MLModel:
    """Local ML model for email generation using TinyLlama."""
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = None
        self.model_loaded = False
        # TinyLlama 1.1B Chat v1.0 is stable and follows instructions well
        self.model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    
    def load_model(self):
        """Load the TinyLlama model into memory."""
        logger.info(f"📥 Loading {self.model_id}...")
        
        try:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"🖥️ Using device: {self.device}")
            
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_id,
                trust_remote_code=True
            )
            
            # TinyLlama sometimes lacks a default pad token, set it to EOS
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Use float16 for GPU to save RAM, float32 for CPU compatibility
            dtype = torch.float16 if self.device == "cuda" else torch.float32
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                torch_dtype=dtype,
                low_cpu_mem_usage=True,
                trust_remote_code=True
            )
            
            self.model.to(self.device)
            self.model.eval() # Set to evaluation mode (not training)
            self.model_loaded = True
            logger.info("✅ Model loaded successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise
    
    def generate(self, prompt: str, max_new_tokens: int = 250) -> str:
        """Generate text from prompt using TinyLlama chat format."""
        
        if not self.model_loaded:
            raise RuntimeError("⚠️ Model not loaded! Call load_model() first.")
        
        try:
            # 1. Prepare Messages in Chat Format
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a professional sales email writer. "
                        "Write only the email body. "
                        "Keep it short, professional, and friendly. "
                        "Do not include the subject line."
                    ),
                },
                {"role": "user", "content": prompt},
            ]

            # 2. Apply Chat Template (Handles <|system|>, <s>, etc. automatically)
            formatted_prompt = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            # 3. Tokenize
            inputs = self.tokenizer(
                formatted_prompt,
                return_tensors="pt",
                truncation=True,
                max_length=1024
            ).to(self.device)
            
            # 4. Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=0.7, # 0.7 = creative but focused
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id
                )
            
            # 5. Extract ONLY the new response (remove the input prompt)
            # This slices the output to start exactly where the input ended
            generated_tokens = outputs[0][inputs.input_ids.shape[1]:]
            response = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
            
            logger.debug(f"Generated text: {response[:50]}...")
            return response.strip()
            
        except Exception as e:
            logger.error(f"❌ Generation error: {e}")
            # Return a fallback to prevent app crash during demo
            return "Hi there,\n\nI'd love to connect. (AI Generation Failed)"

# Create a global instance
ml_instance = MLModel()