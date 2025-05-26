import smtplib
import sys # Import sys to get Python version

print(f"Python version: {sys.version}")

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "casonlamothe@gmail.com"  # <--- YOUR ACTUAL GMAIL
SMTP_PASSWORD = "nyjkopyfralzrbzn" # <--- YOUR NEW APP PASSWORD
SENDER_EMAIL = SMTP_USERNAME
RECEIVER_EMAIL = SMTP_USERNAME # Sending to yourself for this test

message = f"""\
Subject: SMTP Test from Python Script

This is a test email sent directly from a Python script using smtplib."""

print(f"Attempting to connect to {SMTP_SERVER} on port {SMTP_PORT}...")
server = None # Initialize server to None
try:
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    print("Connected to server.")
    server.set_debuglevel(1) # Print SMTP conversation
    print("Starting TLS...")
    server.starttls()
    print("TLS started.")
    print(f"Attempting login with username: {SMTP_USERNAME}...")
    server.login(SMTP_USERNAME, SMTP_PASSWORD)
    print("Login successful!")
    print(f"Sending email from {SENDER_EMAIL} to {RECEIVER_EMAIL}...")
    server.sendmail(SENDER_EMAIL, RECEIVER_EMAIL, message)
    print("Email sent successfully!")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    if server:
        try:
            print("Quitting server connection...")
            server.quit()
            print("Disconnected from server.")
        except Exception as e_quit:
            print(f"Error during server.quit(): {e_quit}")