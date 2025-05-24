# Troubleshooting Guide

## Common Issues and Solutions

### 1. OpenAI Import Error

**Error Message:**
```
ImportError: cannot import name 'OpenAI' from 'openai' (C:\Users\...\site-packages\openai\__init__.py)
```

**Solution:**
This error occurs because the installed version of the OpenAI package is too old. The code is written for v1.0.0 or newer of the OpenAI package, which uses the newer client style.

To fix this issue:

1. Update the OpenAI package to a newer version:
   ```bash
   pip install openai>=1.0.0
   ```

2. Or specifically install the version in our updated requirements:
   ```bash
   pip install openai==1.7.0
   ```

3. Or install all the updated dependencies:
   ```bash
   pip install -r requirements-updated.txt
   ```

### 2. OpenAI Proxies Parameter Error

**Error Message:**
```
TypeError: Client.__init__() got an unexpected keyword argument 'proxies'
```

**Solution:**
This error occurs because there's a version mismatch between the OpenAI library and how it's being initialized in the code.

To fix this issue:

1. Make sure you're using the correct version of OpenAI:
   ```bash
   pip install openai==1.7.0
   ```

2. If the issue persists, you might need to modify app/services/openai_service.py to remove or update the proxies parameter.

### 3. Deepgram SDK Import Error

**Error Message:**
```
ImportError: cannot import name 'DeepgramClient' from 'deepgram'
```

**Solution:**
This error occurs because the code is using the Deepgram SDK v3 API but an older version is installed. The `DeepgramClient` class is only available in v3.0.0 and newer.

To fix this issue:

1. Update the Deepgram SDK to v3.0.0 or newer:
   ```bash
   pip install deepgram-sdk>=3.0.0
   ```

2. Or specifically install the version in our updated requirements:
   ```bash
   pip install deepgram-sdk==3.0.0
   ```

3. Or install all the updated dependencies:
   ```bash
   pip install -r requirements-updated.txt
   ```

### 4. Config Manager Import Error

**Error Message:**
```
ImportError: cannot import name 'config' from 'app.config_manager'
```

**Solution:**
This error occurs because some code is trying to import a variable named `config` from the config_manager module, but our implementation exports `config_manager` instead.

To fix this issue:

1. Add an alias in app/config_manager.py:
   ```python
   # At the end of the file, after config_manager is defined
   config = config_manager
   ```

2. Or update the importing code to use config_manager instead of config.

### 5. Config Import Error

**Error Message:**
```
ImportError: cannot import name 'config_by_name' from 'config' (unknown location)
```

**Solution:**
This error occurs when the configuration file isn't properly set up or isn't in the correct location.

To fix this issue:

1. Make sure the config.py file exists in the root directory
2. Ensure the config.py file contains the `config_by_name` dictionary
3. Check for any circular imports in the configuration

### 6. Database Connection Issues

If you encounter database connection issues:

1. Check that the database file exists:
   ```bash
   python app.py init-db
   ```

2. Run migrations if needed:
   ```bash
   python app.py migrate
   ```

3. Verify database URL in your .env file:
   ```
   DATABASE_URL=sqlite:///instance/sales_training.db
   ```

### 7. API Keys Not Found

If the OpenAI, ElevenLabs, or Deepgram services fail to initialize due to missing API keys:

1. Make sure your API keys are in your .env file:
   ```
   OPENAI_API_KEY=sk-...
   ELEVEN_LABS_API_KEY=...
   DEEPGRAM_API_KEY=...
   ```

2. Check the health dashboard to verify services are initialized:
   ```bash
   python app.py health
   ```

## Getting Support

If you continue to experience issues after trying these solutions, please:

1. Check the application logs in app_log.txt
2. Ensure all dependencies are installed correctly
3. Verify configuration files are properly set up 