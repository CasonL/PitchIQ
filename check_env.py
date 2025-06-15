import sys
import os
import importlib

print(f"--- Python Executable: {sys.executable} ---")
print(f"--- Python Version: {sys.version} ---")
print(f"--- Current Working Directory: {os.getcwd()} ---")

print("\n--- sys.path ---")
for p in sys.path:
    print(p)
print("--- End sys.path ---\n")

print("--- Attempting to import authlib.integrations.flask_client.OAuth ---")
try:
    from authlib.integrations.flask_client import OAuth
    print("SUCCESS: Imported authlib.integrations.flask_client.OAuth successfully.")
    
    # Further check module details
    import authlib
    print(f"  Authlib version: {getattr(authlib, '__version__', 'N/A')}")
    print(f"  Authlib location: {getattr(authlib, '__file__', 'N/A')}")
    
    # Check for integrations submodule
    if hasattr(authlib, 'integrations'):
        print(f"  authlib.integrations found.")
        integrations_module = authlib.integrations
        print(f"  authlib.integrations location: {getattr(integrations_module, '__file__', 'N/A')}")
        
        # Check for flask_client submodule
        if hasattr(integrations_module, 'flask_client'):
            print(f"  authlib.integrations.flask_client found.")
            flask_client_module = integrations_module.flask_client
            print(f"  authlib.integrations.flask_client location: {getattr(flask_client_module, '__file__', 'N/A')}")
            # List contents of flask_client to see if OAuth is there
            # print(f"  dir(authlib.integrations.flask_client): {dir(flask_client_module)}")
        else:
            print("  ERROR: authlib.integrations.flask_client NOT found as a submodule of authlib.integrations.")
            print(f"  dir(authlib.integrations): {dir(integrations_module)}")
    else:
        print("  ERROR: authlib.integrations NOT found as a submodule of authlib.")
        print(f"  dir(authlib): {dir(authlib)}")
        
except ImportError as e:
    print(f"FAILED: Could not import authlib.integrations.flask_client.OAuth. Error: {e}")
except Exception as e_gen:
    print(f"An unexpected error occurred during import test: {e_gen}")

print("\n--- Verifying site-packages in sys.path ---")
# Adjusted path for Windows venv structure
if sys.platform == "win32":
    # .venv/Scripts/python.exe -> .venv/Lib/site-packages
    expected_site_packages_base = os.path.abspath(os.path.join(os.path.dirname(sys.executable), '..', 'Lib', 'site-packages'))
else:
    # .venv/bin/python -> .venv/lib/pythonX.Y/site-packages (more variable)
    # This is a common structure but can vary.
    python_version_short = f"python{sys.version_info.major}.{sys.version_info.minor}"
    expected_site_packages_base = os.path.abspath(os.path.join(os.path.dirname(sys.executable), '..', 'lib', python_version_short, 'site-packages'))

print(f"Expected venv site-packages path (calculated): {expected_site_packages_base}")

# Normalize paths for comparison
normalized_sys_path = [os.path.normpath(p) for p in sys.path]
normalized_expected_site_packages = os.path.normpath(expected_site_packages_base)

if normalized_expected_site_packages in normalized_sys_path:
    print("Expected venv site-packages IS in sys.path.")
else:
    print("WARNING: Expected venv site-packages IS NOT in sys.path (based on calculated path).")
    print("Checking for any 'site-packages' directory in sys.path that contains 'authlib'...")
    found_authlib_in_sys_path = False
    for path_item in normalized_sys_path:
        if "site-packages" in path_item:
            authlib_potential_path = os.path.join(path_item, 'authlib')
            if os.path.isdir(authlib_potential_path):
                print(f"  Found 'authlib' in sys.path site-packages: {authlib_potential_path}")
                found_authlib_in_sys_path = True
                break
    if not found_authlib_in_sys_path:
        print("  Could not find 'authlib' in any 'site-packages' directory listed in sys.path.")

    # Attempt to find where authlib might be loaded from if at all
    print("\n--- importlib.util.find_spec(\"authlib\") ---")
    try:
        authlib_spec = importlib.util.find_spec("authlib")
        if authlib_spec and authlib_spec.origin:
            print(f"Authlib found by importlib at: {authlib_spec.origin}")
            print(f"Authlib submodule search locations: {authlib_spec.submodule_search_locations}")
        else:
            print("Authlib could not be located by importlib.util.find_spec.")
    except Exception as e_find:
        print(f"Error using importlib.util.find_spec: {e_find}") 