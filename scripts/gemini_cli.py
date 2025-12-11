import argparse
import os
import sys
import google.generativeai as genai

def main():
    parser = argparse.ArgumentParser(description='Gemini CLI for Career Manager')
    parser.add_argument('--file', help='Path to the prompt file')
    parser.add_argument('prompt', nargs='*', help='Prompt text (if not using --file)')
    args = parser.parse_args()

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)

    genai.configure(api_key=api_key)

    # Model configuration
    generation_config = {
        "temperature": 0.1,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=generation_config,
    )

    prompt_text = ""
    if args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                prompt_text = f.read()
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.prompt:
        prompt_text = " ".join(args.prompt)
    else:
        # Try reading from stdin
        if not sys.stdin.isatty():
            prompt_text = sys.stdin.read()

    if not prompt_text:
        print("Error: No prompt provided.", file=sys.stderr)
        sys.exit(1)

    try:
        chat_session = model.start_chat(history=[])
        response = chat_session.send_message(prompt_text)
        print(response.text)
    except Exception as e:
        print(f"Error communicating with Gemini API: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
