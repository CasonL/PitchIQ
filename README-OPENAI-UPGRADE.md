# OpenAI SDK Upgrade Guide

## Current Status

This project currently uses OpenAI Python SDK version 0.28.1, which is an older version that uses the legacy API structure:

```python
import openai
openai.api_key = "your-api-key"
response = openai.ChatCompletion.create(
    model="gpt-4.1-mini",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## Future Upgrade

In the future, we should upgrade to the newer OpenAI Python SDK (1.x+), which uses a client-based approach:

```python
from openai import OpenAI
client = OpenAI(api_key="your-api-key")
response = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## Upgrade Steps

When ready to upgrade:

1. Update the requirements.txt to use the latest version of openai
2. Refactor app/services/openai_service.py to use the new client-based approach
3. Update exception handling (APIError, RateLimitError now have different imports)
4. Test all OpenAI-dependent functionality
5. Remove the gpt4o_service.py if its functionality is merged with openai_service.py

## Why Upgrade?

- Better support for newer models
- Improved error handling
- Type hints and better IDE support
- More consistent API structure
- Future-proofing

## Note

This upgrade should be done when there's sufficient time for testing, as it involves significant refactoring of the OpenAI service integrations. 