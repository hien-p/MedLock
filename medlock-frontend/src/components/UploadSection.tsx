import { useState } from "react";

interface UploadSectionProps {
  onUploadComplete: (blobId: string) => void;
}

export const UploadSection = ({ onUploadComplete }: UploadSectionProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    // Simulate encryption and upload
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Mock Blob ID
    const mockBlobId = "blob_0x123456789abcdef";
    onUploadComplete(mockBlobId);
    setIsUploading(false);
  };

  return (
    <div className="bg-white border-2 border-brand-dark shadow-hard p-8 max-w-2xl mx-auto">
      <h3 className="font-display text-3xl mb-6">1. SECURE UPLOAD</h3>
      <div className="space-y-6">
        <div className="border-2 border-dashed border-brand-dark p-8 text-center hover:bg-brand-bg transition-colors cursor-pointer relative">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <p className="font-mono">
            {file ? file.name : "DROP SENSITIVE DATA HERE"}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            (fMRI scans, genetic data, etc.)
          </p>
        </div>

        {file && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-brand-dark text-white font-mono py-3 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-lime hover:text-brand-dark hover:shadow-hard-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? `ENCRYPTING & UPLOADING... ${progress}%` : "ENCRYPT & STORE ON WALRUS"}
          </button>
        )}
      </div>
    </div>
  );
};
