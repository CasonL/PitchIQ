"""
Test script to check all registered routes in the Flask app.
"""
from app import create_app

def test_routes():
    """Print all registered routes with their methods."""
    app = create_app()
    
    print("DEBUG MODE:", app.debug)
    print("\nREGISTERED ROUTES:")
    print("-" * 70)
    
    # Sort routes by URL for better readability
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append((rule.endpoint, rule.methods, rule.rule))
    
    # Sort by URL
    routes.sort(key=lambda x: x[2])
    
    # Print routes in a table format
    for endpoint, methods, url in routes:
        methods_str = ", ".join(sorted(m for m in methods if m not in ('HEAD', 'OPTIONS')))
        print(f"{url:<40} {methods_str:<20} {endpoint}")
    
    # Check specifically for auth routes
    print("\nAUTH ROUTES:")
    print("-" * 70)
    
    auth_routes = [r for r in routes if r[0].startswith('auth.')]
    for endpoint, methods, url in auth_routes:
        methods_str = ", ".join(sorted(m for m in methods if m not in ('HEAD', 'OPTIONS')))
        print(f"{url:<40} {methods_str:<20} {endpoint}")
    
    # Check for the specific debug route
    debug_route = [r for r in routes if r[0] == 'auth.debug_page']
    if debug_route:
        print("\nDEBUG ROUTE FOUND:", debug_route[0][2])
    else:
        print("\nDEBUG ROUTE NOT FOUND!")

if __name__ == "__main__":
    test_routes() 