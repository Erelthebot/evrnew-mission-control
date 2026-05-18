#!/usr/bin/env python3

import os
import sys
import argparse
import requests

MLX_URL = os.environ.get("MLX_URL", "http://127.0.0.1:52416/v1/chat/completions")
MLX_MODEL = os.environ.get("MLX_MODEL", "Llama-3.3-70B-Instruct-4bit")


def translate_text(text, target_language='Spanish'):
    prompt = (
        f'Translate the following text to {target_language}. '
        f'Provide only the translated text without any additional commentary or quotation marks:\n\n{text}'
    )
    r = requests.post(
        MLX_URL,
        json={
            "model": MLX_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2048,
        },
        timeout=120,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def main():
    parser = argparse.ArgumentParser(description='Translate work order text from English to Spanish.')
    parser.add_argument('text', nargs='?', help='Text to translate. If not provided, reads from stdin.')
    args = parser.parse_args()
    
    if args.text:
        input_text = args.text
    else:
        input_text = sys.stdin.read().strip()
    
    if not input_text:
        print('Error: No input text provided.')
        sys.exit(1)
    
    translated_text = translate_text(input_text)
    print(translated_text)

if __name__ == '__main__':
    main()
