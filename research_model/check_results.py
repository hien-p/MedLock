import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import sys

def check_results(outputs_dir="outputs"):
    """
    Loads and displays the input and reconstructed slices from the outputs directory.
    """
    p = Path(outputs_dir)
    if not p.exists():
        print(f"Error: Directory '{outputs_dir}' not found.")
        print("Please run main.py to generate the outputs first.")
        sys.exit(1)

    try:
        # Load all 6 slice files
        input_x = np.load(p / "input_X.npy")
        input_y = np.load(p / "input_Y.npy")
        input_z = np.load(p / "input_Z.npy")
        recon_x = np.load(p / "recon_X.npy")
        recon_y = np.load(p / "recon_Y.npy")
        recon_z = np.load(p / "recon_Z.npy")
    except FileNotFoundError as e:
        print(f"Error loading file: {e.filename}")
        print("Make sure all .npy files (input_*.npy, recon_*.npy) exist in the 'outputs' directory.")
        sys.exit(1)


    # Create a plot with 3 rows and 2 columns
    fig, axes = plt.subplots(3, 2, figsize=(8, 12))
    fig.suptitle("Comparison of Original and Reconstructed Brain Slices", fontsize=16)

    # Plot X slices
    axes[0, 0].imshow(input_x, cmap='gray')
    axes[0, 0].set_title("Input (X slice)")
    axes[0, 0].axis('off')

    axes[0, 1].imshow(recon_x, cmap='gray')
    axes[0, 1].set_title("Reconstruction (X slice)")
    axes[0, 1].axis('off')

    # Plot Y slices
    axes[1, 0].imshow(input_y, cmap='gray')
    axes[1, 0].set_title("Input (Y slice)")
    axes[1, 0].axis('off')

    axes[1, 1].imshow(recon_y, cmap='gray')
    axes[1, 1].set_title("Reconstruction (Y slice)")
    axes[1, 1].axis('off')

    # Plot Z slices
    axes[2, 0].imshow(input_z, cmap='gray')
    axes[2, 0].set_title("Input (Z slice)")
    axes[2, 0].axis('off')

    axes[2, 1].imshow(recon_z, cmap='gray')
    axes[2, 1].set_title("Reconstruction (Z slice)")
    axes[2, 1].axis('off')

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    
    # Save the figure to a file instead of showing it
    output_image_path = p / "results_comparison.png"
    plt.savefig(output_image_path)
    print(f"Result image saved to: {output_image_path}")

if __name__ == "__main__":
    check_results()
