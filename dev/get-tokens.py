from msal import PublicClientApplication
import sys

# Provide client ID and tenant ID as command-line arguments
client_id = sys.argv[1] if len(sys.argv) > 1 else '<client-id>'
tenant_id = sys.argv[2] if len(sys.argv) > 1 else '<tenant-id>'

scopes = ['2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default']

app = PublicClientApplication(
  client_id=client_id,
  authority=f"https://login.microsoftonline.com/{tenant_id}"
)

result = app.acquire_token_interactive(scopes=scopes)

if 'error' in result:
  print(f"Error: {result['error']}")
  print(f"Description: {result['error_description']}")
else:
  print(f"Access token:\n{result['access_token']}")
  print(f"\nRefresh token:\n{result['refresh_token']}")