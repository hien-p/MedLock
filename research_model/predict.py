import torch
import numpy as np
from pathlib import Path
import argparse
import json
from datetime import datetime, timezone
import math
import tarfile

# Import necessary components from the updated main.py
from main import AE, zscore, downsample3d, center_crop, extract_tar_if_needed

def predict(args):
    """
    Loads a trained model, processes a single .npy file, calculates a
    reconstruction error (anomaly score), and outputs a JSON result.
    """
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    print(f"[Device] {device}")

    model_path = Path(args.model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {model_path}. Please run main.py first.")
    
    ckpt = torch.load(model_path, map_location=device)
    model_args = ckpt['args']
    
    net = AE(base=model_args['base_ch']).to(device)
    net.load_state_dict(ckpt['state_dict'])
    net.eval()
    print(f"[Model] Loaded trained autoencoder from {model_path}")

    print(f"[Data] Loading and preprocessing {args.input_file}...")
    data = np.load(args.input_file).astype(np.float32)
    data = zscore(data)

    side = int(math.ceil(data.size ** (1/3)))
    pad = side ** 3 - data.size
    if pad > 0:
        data = np.pad(data, (0, pad), mode="constant")
    data3d = data.reshape(side, side, side)

    down_factors = tuple(map(int, model_args['down'].split(',')))
    data3d = downsample3d(data3d, down_factors)
    
    data3d = np.transpose(data3d, (2, 1, 0))
    out_shape = tuple(map(int, model_args['shape'].split(',')))
    
    # Add padding to match the training process
    z, y, x = data3d.shape
    oz, oy, ox = out_shape
    pad_z = max(0, oz - z); pad_y = max(0, oy - y); pad_x = max(0, ox - x)
    if pad_z or pad_y or pad_x:
        data3d = np.pad(
            data3d,
            ((pad_z//2, pad_z - pad_z//2), (pad_y//2, pad_y - pad_y//2), (pad_x//2, pad_x - pad_x//2)),
            mode="constant"
        )
    
    data3d = center_crop(data3d, out_shape)

    dmin, dmax = data3d.min(), data3d.max()
    if dmax > dmin:
        data3d = 2.0 * (data3d - dmin) / (dmax - dmin) - 1.0
    
    input_tensor = torch.from_numpy(data3d).unsqueeze(0).unsqueeze(0).to(device)

    with torch.no_grad():
        recon_tensor = net(input_tensor)

    loss = torch.nn.functional.mse_loss(recon_tensor, input_tensor)
    score = loss.item() * 1000

    label = "Anomaly" if score > args.threshold else "Normal"
    
    result = {
        "dataset_id": "CineBrain-sub-0002",
        "model_id": "anomaly-v2-npy",
        "result": {
            "label": label,
            "score": round(score, 4)
        },
        "attestation_hash": "0xabc123...",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    print("\n--- Prediction Result ---")
    print(json.dumps(result, indent=2))
    print("-------------------------\n")

def find_default_npy_file():
    """Searches for a .npy file in the default data directory."""
    search_dir = Path("./cinebrain_data")
    if not search_dir.exists():
        return None
    
    npy_files = sorted(list(search_dir.rglob("*.npy")))
    return npy_files[0] if npy_files else None

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--input_file", type=str, default=None,
                    help="Path to the input .npy file. If not provided, will search for one automatically.")
    ap.add_argument("--model_path", type=str, default="./outputs/cinebrain_ae.pt",
                    help="Path to the trained autoencoder model checkpoint.")
    ap.add_argument("--threshold", type=float, default=50.0,
                    help="Anomaly score threshold to classify as 'Normal' vs 'Anomaly'.")
    ap.add_argument("--cpu", action="store_true",
                    help="Force CPU even if CUDA is available")
    args = ap.parse_args()

    if args.input_file is None:
        print("[+] --input_file not provided. Searching for a default .npy file...")
        args.input_file = find_default_npy_file()
        
        if args.input_file is None:
            print("[!] .npy file not found. Checking for tarball to extract...")
            data_dir = Path("./cinebrain_data")
            tar_files = list(data_dir.glob("*.tar"))
            if not tar_files:
                print("\n[Error] No .tar file found. Please run `python main.py` first.")
                exit(1)
            
            tar_path = tar_files[0]
            extract_root = data_dir / f"{tar_path.stem.replace('_fMRI_preprocessed_data', '')}_extracted"
            extract_tar_if_needed(tar_path, extract_root)
            
            args.input_file = find_default_npy_file()
            if args.input_file is None:
                 print("\n[Error] Extraction completed, but still could not find a .npy file.")
                 exit(1)

        print(f"[+] Found and using: {args.input_file}")

    predict(args)
