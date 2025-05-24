# Project Cleanup Report

Generated on: 2025-05-09 13:04:10

## Duplicate Files

The following files appear to be identical:
- `app\auth\__init__.py`
- `app\chat\__init__.py`
- `app\dashboard\__init__.py`
- `app\services\__init__.py`

The following files appear to be identical:
- `app\frontend\node_modules\flatted\python\flatted.py`
- `app\static\react\node_modules\flatted\python\flatted.py`

The following files appear to be identical:
- `app\training\generate_ai_response.py`
- `app\training\services_edited.py`

## Utility Scripts to Organize

The following scripts should be moved to a `scripts/` directory:

- `build_react.py`
- `build_react_for_landing.py`
- `check_api_key.py`
- `create_react_structure.py`
- `fix_openai_compatibility.py`
- `run_migrations.py`
- `run_sales_ai.py`
- `test_app.py`
- `test_conversation_analysis.py`
- `test_dashboard_coach.py`
- `test_dns.py`
- `test_elevenlabs.py`
- `test_openai_direct.py`
- `test_openai_key.py`
- `test_voice_app.py`
- `update_openai_sdk.py`

You can create the scripts directory and move these files with:

```bash
mkdir -p scripts
git mv build_react.py scripts/
git mv build_react_for_landing.py scripts/
git mv check_api_key.py scripts/
git mv create_react_structure.py scripts/
git mv fix_openai_compatibility.py scripts/
git mv run_migrations.py scripts/
git mv run_sales_ai.py scripts/
git mv test_app.py scripts/
git mv test_conversation_analysis.py scripts/
git mv test_dashboard_coach.py scripts/
git mv test_dns.py scripts/
git mv test_elevenlabs.py scripts/
git mv test_openai_direct.py scripts/
git mv test_openai_key.py scripts/
git mv test_voice_app.py scripts/
git mv update_openai_sdk.py scripts/
```

## Potentially Removable Directories

The following directories appear to be external projects and may be removed:

- `pitchiq-spark-launch-main/`
- `pitchiq-voice-orb-design-a43f76bafc0e5d8fa6138ab0896e1fc6c01a2e6d/`
- `nextjs-live-transcription-main/`
- `flask-text-to-speech-main/`
- `deepgram-js-sdk-main/`

Before removing these directories, ensure they are not required by the project.

You can remove these directories with:

```bash
rm -rf pitchiq-spark-launch-main
rm -rf pitchiq-voice-orb-design-a43f76bafc0e5d8fa6138ab0896e1fc6c01a2e6d
rm -rf nextjs-live-transcription-main
rm -rf flask-text-to-speech-main
rm -rf deepgram-js-sdk-main
```

## Next Steps

1. Review this report and determine which suggestions to implement
2. Test the application after making each change
3. Consider running this script again after implementing the changes
