#!/bin/bash

# Exit on error
set -e

echo "=== Privacy Pipeline Execution Script ==="

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (brew install jq) to run this script."
    exit 1
fi

# 1. Build the package
echo "Building Move package..."
cd privacy_pipeline_contract
sui move build

# 2. Publish the package
echo "Publishing package..."
# Note: This assumes a local network is running or the user has a valid active env.
# We capture the output to extract the Package ID.
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json)
PACKAGE_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.type == "published") | .packageId')

if [ -z "$PACKAGE_ID" ] || [ "$PACKAGE_ID" == "null" ]; then
  echo "Error: Failed to publish package or extract Package ID."
  echo "Output: $PUBLISH_OUTPUT"
  exit 1
fi

echo "Package published at: $PACKAGE_ID"

# 3. Create an Allowlist
echo "Creating Allowlist..."
# Function: create_allowlist_entry(name: String)
# We need to pass the name as a BCS string or pure string if supported.
# Sui CLI supports string arguments directly.
TX_ALLOWLIST=$(sui client call --package $PACKAGE_ID --module allowlist --function create_allowlist_entry --args "MySecureAllowlist" --gas-budget 10000000 --json)
ALLOWLIST_CAP_ID=$(echo $TX_ALLOWLIST | jq -r '.objectChanges[] | select(.objectType | contains("::allowlist::Cap")) | .objectId')
ALLOWLIST_ID=$(echo $TX_ALLOWLIST | jq -r '.objectChanges[] | select(.objectType | contains("::allowlist::Allowlist")) | .objectId')

echo "Allowlist Created: $ALLOWLIST_ID"
echo "Allowlist Cap: $ALLOWLIST_CAP_ID"

# 4. Add current user to Allowlist
USER_ADDRESS=$(sui client active-address)
echo "Adding user $USER_ADDRESS to Allowlist..."
sui client call --package $PACKAGE_ID --module allowlist --function add --args $ALLOWLIST_ID $ALLOWLIST_CAP_ID $USER_ADDRESS --gas-budget 10000000

# Helper to convert Hex ID to Vector<u8> string for Sui CLI
# Input: 0x1234...
# Output: [18, 52, ...]
hex_to_vec() {
    local hex=$1
    # Remove 0x prefix
    hex=${hex#0x}
    # Add spaces between every 2 chars
    local pairs=$(echo $hex | sed 's/../& /g')
    # Convert hex pairs to decimal
    local vec="["
    local first=true
    for pair in $pairs; do
        dec=$((16#$pair))
        if [ "$first" = true ]; then
            vec="$vec$dec"
            first=false
        else
            vec="$vec,$dec"
        fi
    done
    vec="$vec]"
    echo $vec
}

# 5. Approve Access (Seal)
echo "Simulating Seal Approval..."
# Function: seal_approve(namespace_bytes: vector<u8>, allowlist: &Allowlist)
# We convert the Allowlist ID to bytes to match the namespace check.
ALLOWLIST_ID_BYTES=$(hex_to_vec $ALLOWLIST_ID)
echo "Generated Namespace Bytes for ID $ALLOWLIST_ID"

sui client call --package $PACKAGE_ID --module allowlist --function seal_approve --args "$ALLOWLIST_ID_BYTES" $ALLOWLIST_ID --gas-budget 10000000

echo "Seal Approval Successful (Transaction executed)."

# 6. Register Enclave (Mock)
echo "Registering Enclave..."
# We need the Registry object. It's a shared object created in init.
# We need to find the Registry ID from the publish output.
# Filter for created objects first to avoid errors on 'published' changes which lack objectType
REGISTRY_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.type == "created") | select(.objectType | contains("::enclave_registry::Registry")) | .objectId')
REGISTRY_CAP_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.type == "created") | select(.objectType | contains("::enclave_registry::RegistryAdminCap")) | .objectId')

echo "Registry ID: $REGISTRY_ID"

# Note: register_enclave requires a NitroAttestationDocument. 
# Constructing a valid one via CLI args is complex. 
# For this script, we will skip the actual registration call unless we have a valid BCS dump.
# Instead, we'll print the command that WOULD be run.
echo "[INFO] Skipping actual 'register_enclave' call as it requires a valid large BCS struct."
echo "[INFO] Command would be: sui client call --package $PACKAGE_ID --module enclave_registry --function register_enclave --args $REGISTRY_CAP_ID $REGISTRY_ID <AttestationDoc>"

# 7. Submit Result
echo "Submitting Result..."
# Function: submit_result(registry: &Registry, pcr8: vector<u8>, result: u64, timestamp: u64, signature: vector<u8>)
# This will fail if the enclave isn't registered, but we can show the invocation.
# We'll use dummy values.
PCR8="[1,2,3,4,5,6,7,8]"
RESULT=100
TIMESTAMP=1234567890
SIGNATURE="[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]" # 64 bytes dummy

echo "Attempting to submit result (Expected to fail without valid registration/signature)..."
# We expect this to fail, so we allow failure without exiting the script
set +e
sui client call --package $PACKAGE_ID --module result_logger --function submit_result --args $REGISTRY_ID $PCR8 $RESULT $TIMESTAMP $SIGNATURE --gas-budget 10000000 > /dev/null 2>&1
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -ne 0 ]; then
  echo "Result submission failed as expected (Enclave not registered/Signature invalid)."
else
  echo "Result submission succeeded (Unexpected!)."
fi


# 8. Create Subscription Service
echo "Creating Subscription Service..."
# Function: create_service_entry(fee: u64, ttl: u64, name: String)
SERVICE_FEE=1000000
SERVICE_TTL=86400000 # 1 day
TX_SERVICE=$(sui client call --package $PACKAGE_ID --module subscription --function create_service_entry --args $SERVICE_FEE $SERVICE_TTL "MyPremiumService" --gas-budget 10000000 --json)
SERVICE_CAP_ID=$(echo $TX_SERVICE | jq -r '.objectChanges[] | select(.objectType | contains("::subscription::Cap")) | .objectId')
SERVICE_ID=$(echo $TX_SERVICE | jq -r '.objectChanges[] | select(.objectType | contains("::subscription::Service")) | .objectId')

echo "Service Created: $SERVICE_ID"

# 9. Subscribe to Service
echo "Subscribing to Service..."
# Function: subscribe(payment: Coin, service: &Service, clk: &Clock)
# We need a coin with exact value. Splitting a coin is needed.
# For simplicity in bash, we'll just try to use the gas coin (which might fail if not exact) or skip.
# A robust script would split a coin first.
echo "[INFO] Skipping 'subscribe' call as it requires coin splitting logic which is complex in bash."
# Ideally:
# 1. Split coin: sui client pay ...
# 2. Call subscribe with new coin ID.

# 10. Seal Approve (Subscription)
echo "Simulating Seal Approval (Subscription)..."
# Function: seal_approve(namespace_bytes: vector<u8>, subscription: &Subscription, service: &Service, clk: &Clock)
# We need a subscription object ID. Since we skipped subscribe, we can't call this.
echo "[INFO] Skipping 'seal_approve' (subscription) as it depends on 'subscribe'."

echo "=== Pipeline Execution Complete ==="
