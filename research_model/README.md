# fMRI Data Training and Prediction Workflow

This is a demo project that uses an Autoencoder model to detect anomalies in fMRI brain scans.

## Requirements
- Python 3.8+
- `pip`

## Workflow (End-to-End)

Please follow these steps in the correct order.

### Step 1: Install Necessary Libraries

Open a terminal and run the following command to install all Python libraries listed in `requirements.txt`.

```bash
pip install -r requirements.txt
```

### Step 2: Train the Model

Run the `main.py` script to download fMRI data from Hugging Face and train the model.

```bash
python main.py
```

- **Result:** This script will create an `outputs` directory containing the trained model file, `cinebrain_ae.pt`. This is the most crucial and time-consuming step.

### Step 3: Run Prediction

Once the model is trained, use the `predict.py` script to make a prediction. You only need to run this simple command:

```bash
python predict.py
```
- The script will **automatically find** a brain scan file downloaded in Step 2 to use as input.
- **Result:** The script will use the model from Step 2 and print a **JSON** object containing a "label" and a "score" as you requested.

*(Advanced Option: If you want to specify a different brain scan file, you can still use the command `python predict.py --input_file /path/to/your/file.npy`)*.

---

### Optional Step: Visually Check Training Results

If you want to see how well the model has learned visually, run the `check_results.py` script **after completing Step 2**.

```bash
python check_results.py
```

- **Result:** This command will save an image file named `results_comparison.png` to the `outputs` directory, comparing the original and reconstructed images.
