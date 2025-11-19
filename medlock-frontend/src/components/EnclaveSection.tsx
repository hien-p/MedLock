import { useState } from "react";

interface EnclaveSectionProps {
    blobId: string;
    onAnalysisComplete: (result: any) => void;
}

export const EnclaveSection = ({ blobId, onAnalysisComplete }: EnclaveSectionProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setLogs([]);

        const steps = [
            "Requesting Key from Seal...",
            "Verifying Enclave Attestation...",
            "Key Released to Enclave.",
            `Decrypting Blob ${blobId.slice(0, 10)}...`,
            "Running Inference Model...",
            "Signing Result...",
        ];

        for (const step of steps) {
            addLog(step);
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

        // Mock Result
        const mockResult = {
            prediction: "Healthy (Low Risk)",
            confidence: 0.98,
            timestamp: Date.now(),
            signature: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b...",
            enclaveId: "PCR8: 7f83b1...",
        };

        onAnalysisComplete(mockResult);
        setIsAnalyzing(false);
    };

    return (
        <div className="bg-white border-2 border-brand-dark shadow-hard p-8 max-w-2xl mx-auto mt-8">
            <h3 className="font-display text-3xl mb-6">2. CONFIDENTIAL COMPUTE</h3>

            <div className="bg-brand-bg p-4 border-2 border-brand-dark mb-6 font-mono text-sm">
                <span className="text-gray-500">TARGET BLOB:</span> {blobId}
            </div>

            <div className="space-y-4">
                <div className="bg-black text-neon-lime p-4 h-48 font-mono text-xs overflow-y-auto border-2 border-brand-dark">
                    {logs.length === 0 && <span className="opacity-50">// Waiting for command...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1">
                            <span className="text-neon-pink">&gt;</span> {log}
                        </div>
                    ))}
                    {isAnalyzing && <div className="animate-pulse">_</div>}
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-brand-dark text-white font-mono py-3 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-blue hover:text-brand-dark hover:shadow-hard-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? "PROCESSING IN TEE..." : "RUN ANALYSIS IN ENCLAVE"}
                </button>
            </div>
        </div>
    );
};
