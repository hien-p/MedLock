import argparse, os, tarfile, glob, json, random, math, shutil
from pathlib import Path

import numpy as np
from huggingface_hub import hf_hub_download

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm

# ----------------------------
# Utilities
# ----------------------------
def maybe_download_subject(repo_id: str, subject: str, target_dir: str, filename="fMRI_preprocessed_data.tar"):
    """
    Download ONE subject tarball from Hugging Face to target_dir if missing.
    """
    target_dir = Path(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    out_tar = target_dir / f"{subject}_{filename}"
    if not out_tar.exists():
        print(f"[HF] downloading {subject}/{filename} to {out_tar} ...")
        relpath = f"{subject}/{filename}"
        p = hf_hub_download(repo_id=repo_id, filename=relpath, repo_type="dataset", local_dir=target_dir)
        shutil.copy2(p, out_tar)
    else:
        print(f"[HF] found local: {out_tar}")
    return out_tar

def extract_tar_if_needed(tar_path: Path, extract_to: Path):
    extract_to.mkdir(parents=True, exist_ok=True)
    stamp = extract_to / ".extracted"
    if stamp.exists():
        print(f"[TAR] already extracted at {extract_to}")
        return extract_to
    print(f"[TAR] extracting {tar_path} -> {extract_to}")
    with tarfile.open(tar_path, "r") as tf:
        safe_members = [m for m in tf.getmembers() if m and m.name and ".." not in m.name]
        tf.extractall(extract_to, members=safe_members)
    stamp.write_text("ok")
    return extract_to

def list_data_files(root: Path):
    """Finds all .npy files in a directory."""
    return sorted(list(root.rglob("*.npy")))

def zscore(x, eps=1e-6):
    m = x.mean()
    s = x.std()
    return (x - m) / (s + eps)

def center_crop(arr, out_shape):
    """Center-crop 3D or 4D numpy array."""
    in_shape = arr.shape
    slices = []
    for i, out_dim in enumerate(out_shape):
        if i >= len(in_shape): raise ValueError("out_shape rank > in_shape rank")
        start = max((in_shape[i] - out_dim) // 2, 0)
        end = start + out_dim
        slices.append(slice(start, end))
    cropped = arr[tuple(slices)]
    return cropped

def downsample3d(arr, factors=(2,2,2)):
    """Simple nearest-neighbor downsample for speed."""
    dz, dy, dx = factors
    return arr[::dz, ::dy, ::dx]

# ----------------------------
# Dataset
# ----------------------------
class CineBrainDataset(Dataset):
    """
    Loads preprocessed data (.npy arrays) and reshapes them into 3D volumes.
    """
    def __init__(self, file_paths, max_files=4, spatial_down=(2,2,2), out_shape=(64,64,48)):
        self.files = file_paths[:max_files]
        self.spatial_down = spatial_down
        self.out_shape = out_shape
        self.cache = []

        for fp in tqdm(self.files, desc="Loading .npy volumes"):
            data = np.load(str(fp))
            data = data.astype(np.float32)
            data = zscore(data)

            # Reshape 1D feature vectors into a cube
            side = int(math.ceil(data.size ** (1/3)))
            pad = side ** 3 - data.size
            if pad > 0:
                data = np.pad(data, (0, pad), mode="constant")
            data3d = data.reshape(side, side, side)

            if self.spatial_down is not None:
                data3d = downsample3d(data3d, self.spatial_down)

            data3d = np.transpose(data3d, (2, 1, 0))
            
            z, y, x = data3d.shape
            oz, oy, ox = self.out_shape
            pad_z = max(0, oz - z); pad_y = max(0, oy - y); pad_x = max(0, ox - x)
            if pad_z or pad_y or pad_x:
                data3d = np.pad(
                    data3d,
                    ((pad_z//2, pad_z - pad_z//2), (pad_y//2, pad_y - pad_y//2), (pad_x//2, pad_x - pad_x//2)),
                    mode="constant"
                )
            data3d = center_crop(data3d, self.out_shape)

            dmin, dmax = data3d.min(), data3d.max()
            if dmax > dmin:
                data3d = 2.0 * (data3d - dmin) / (dmax - dmin) - 1.0
            data3d = np.expand_dims(data3d, 0)

            self.cache.append(data3d.astype(np.float32))

        self.cache = self.cache * 8

    def __len__(self): return len(self.cache)
    def __getitem__(self, idx):
        x = self.cache[idx]
        return torch.from_numpy(x), torch.from_numpy(x)

# ----------------------------
# Model: tiny 3D Conv Autoencoder
# ----------------------------
class Encoder(nn.Module):
    def __init__(self, in_ch=1, base=16):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv3d(in_ch, base, 3, stride=2, padding=1), nn.BatchNorm3d(base), nn.ReLU(True),
            nn.Conv3d(base, base*2, 3, stride=2, padding=1), nn.BatchNorm3d(base*2), nn.ReLU(True),
            nn.Conv3d(base*2, base*4, 3, stride=2, padding=1), nn.BatchNorm3d(base*4), nn.ReLU(True),
        )
    def forward(self, x): return self.net(x)

class Decoder(nn.Module):
    def __init__(self, out_ch=1, base=16):
        super().__init__()
        self.net = nn.Sequential(
            nn.ConvTranspose3d(base*4, base*2, 4, stride=2, padding=1), nn.BatchNorm3d(base*2), nn.ReLU(True),
            nn.ConvTranspose3d(base*2, base,   4, stride=2, padding=1), nn.BatchNorm3d(base), nn.ReLU(True),
            nn.ConvTranspose3d(base, out_ch,   4, stride=2, padding=1), nn.Tanh(),
        )
    def forward(self, z): return self.net(z)

class AE(nn.Module):
    def __init__(self, in_ch=1, base=16):
        super().__init__()
        self.enc = Encoder(in_ch, base)
        self.dec = Decoder(in_ch, base)
    def forward(self, x): return self.dec(self.enc(x))

# ----------------------------
# Training
# ----------------------------
def train(args):
    print("[+] Script started. Please wait, downloading data from Hugging Face...")
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    print(f"[Device] {device}")

    if args.data_dir is None:
        args.data_dir = "./cinebrain_data"
    data_dir = Path(args.data_dir)
    subject = args.subject

    tar_path = maybe_download_subject(args.repo, subject, data_dir)
    extract_root = data_dir / f"{subject}_extracted"
    extract_tar_if_needed(tar_path, extract_root)

    data_files = list_data_files(extract_root)
    if len(data_files) == 0:
        raise RuntimeError(f"No .npy files found under {extract_root}.")

    print(f"[Data] Found {len(data_files)} files. Using up to {args.max_files} files.")
    ds = CineBrainDataset(data_files, max_files=args.max_files,
                       spatial_down=tuple(map(int, args.down.split(","))),
                       out_shape=tuple(map(int, args.shape.split(","))))
    dl = DataLoader(ds, batch_size=args.batch_size, shuffle=True, num_workers=2, pin_memory=True)

    net = AE(base=args.base_ch).to(device)
    opt = torch.optim.AdamW(net.parameters(), lr=args.lr, weight_decay=1e-4)
    crit = nn.L1Loss()

    net.train()
    for epoch in range(args.epochs):
        pbar = tqdm(dl, desc=f"Epoch {epoch+1}/{args.epochs}")
        for xb, yb in pbar:
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad(set_to_none=True)
            yhat = net(xb)
            loss = crit(yhat, yb)
            loss.backward()
            opt.step()
            pbar.set_postfix({"loss": f"{loss.item():.4f}"})

    out_dir = Path(args.out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    ckpt = out_dir / "cinebrain_ae.pt"
    torch.save({"state_dict": net.state_dict(), "args": vars(args)}, ckpt)
    print(f"[Save] weights -> {ckpt}")

    net.eval()
    with torch.no_grad():
        xb, _ = next(iter(dl))
        xb = xb.to(device)
        yhat = net(xb)
        xb_np = xb[0,0].detach().cpu().numpy()
        yh_np = yhat[0,0].detach().cpu().numpy()
        def save_slice(vol, name):
            zc, yc, xc = [s//2 for s in vol.shape]
            np.save(out_dir / f"{name}_Z.npy", vol[zc,:,:])
            np.save(out_dir / f"{name}_Y.npy", vol[:,yc,:])
            np.save(out_dir / f"{name}_X.npy", vol[:,:,xc])
        save_slice(xb_np, "input")
        save_slice(yh_np, "recon")
        print(f"[Save] example slices -> {out_dir} (input_*.npy, recon_*.npy)")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", type=str, default="Fudan-fMRI/CineBrain", help="HF dataset repo id")
    ap.add_argument("--subject", type=str, default="sub-0002", help="Subject folder to pull, e.g. sub-0002")
    ap.add_argument("--data_dir", type=str, default=None, help="Local cache dir; if None, ./cinebrain_data")
    ap.add_argument("--out_dir", type=str, default="./outputs", help="Where to save weights and slices")
    ap.add_argument("--max_files", type=int, default=1000, help="Use at most N .npy files from the tar (Bigger = Better Model)")
    ap.add_argument("--epochs", type=int, default=30, help="Epochs for training (More = Better Model)")
    ap.add_argument("--batch_size", type=int, default=8)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--base_ch", type=int, default=32, help="Width of the autoencoder (Bigger = Better Model)")
    ap.add_argument("--down", type=str, default="1,1,1", help="Spatial downsample factors (dz,dy,dx)")
    ap.add_argument("--shape", type=str, default="32,32,32", help="Final (Z,Y,X) crop/shape for training")
    ap.add_argument("--cpu", action="store_true", help="Force CPU even if CUDA is available")
    args = ap.parse_args()
    train(args)
