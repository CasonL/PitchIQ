from urllib.parse import urlparse, urljoin
from flask import request, url_for, current_app

def is_safe_url(target):
    """Checks if a URL is safe for redirection."""
    # Ensure target is a string
    if not isinstance(target, str):
        current_app.logger.warning(f"Invalid target type for redirection: {type(target)}")
        return False

    # Handle potential None or empty strings explicitly
    if not target:
        current_app.logger.debug("Empty target URL provided for redirection check.")
        return False

    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))

    # Log the URLs being compared for debugging
    current_app.logger.debug(f"Checking safety: ref_url={ref_url.geturl()}, test_url={test_url.geturl()}")

    # Check if the scheme is allowed (http or https)
    allowed_schemes = ['http', 'https']
    if test_url.scheme not in allowed_schemes:
        current_app.logger.warning(f"Unsafe redirect scheme detected: {test_url.scheme}")
        return False

    # Check if the network location (domain) matches the host
    if ref_url.netloc != test_url.netloc:
        current_app.logger.warning(f"Unsafe redirect target domain detected: {test_url.netloc}")
        return False

    current_app.logger.debug(f"Target URL is safe for redirection: {target}")
    return True 