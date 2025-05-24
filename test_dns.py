# test_dns.py
import socket
import time

hostname = "api.openai.com"
port = 443

print(f"Attempting to resolve {hostname} using socket.getaddrinfo (IPv4)...")
try:
    start_time = time.time()
    addr_info = socket.getaddrinfo(hostname, port, family=socket.AF_INET)
    end_time = time.time()
    if addr_info:
        ip_address = addr_info[0][4][0]
        print(f"SUCCESS: Resolved {hostname} to {ip_address} in {end_time - start_time:.2f} seconds.")
    else:
        print(f"FAILURE: socket.getaddrinfo returned no results for {hostname} (IPv4).")
except socket.gaierror as e:
    end_time = time.time()
    print(f"FAILURE: DNS lookup failed after {end_time - start_time:.2f} seconds. Error: {e}")
except Exception as e:
    end_time = time.time()
    print(f"FAILURE: An unexpected error occurred after {end_time - start_time:.2f} seconds: {e}")

print("\nAttempting to resolve www.google.com using socket.getaddrinfo (IPv4)...")
try:
    start_time = time.time()
    addr_info_google = socket.getaddrinfo("www.google.com", port, family=socket.AF_INET)
    end_time = time.time()
    if addr_info_google:
        ip_address_google = addr_info_google[0][4][0]
        print(f"SUCCESS: Resolved www.google.com to {ip_address_google} in {end_time - start_time:.2f} seconds.")
    else:
        print(f"FAILURE: socket.getaddrinfo returned no results for www.google.com (IPv4).")
except socket.gaierror as e:
    end_time = time.time()
    print(f"FAILURE: DNS lookup failed for www.google.com after {end_time - start_time:.2f} seconds. Error: {e}")
except Exception as e:
    end_time = time.time()
    print(f"FAILURE: An unexpected error occurred for www.google.com after {end_time - start_time:.2f} seconds: {e}")
