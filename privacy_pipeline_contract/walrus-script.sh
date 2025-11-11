# Store for ~2 days on Testnet (2 epochs) and capture the Blob ID (0x....)
BLOB_ID=$(walrus store encrypted_fmri.bin --epochs 2 --context testnet | grep -Eo '0x[0-9a-fA-F]{64,}')
echo "Blob ID: $BLOB_ID"