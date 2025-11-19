interface ResultSectionProps {
    result: any;
}

export const ResultSection = ({ result }: ResultSectionProps) => {
    return (
        <div className="bg-white border-2 border-brand-dark shadow-hard p-8 max-w-2xl mx-auto mt-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-neon-lime text-brand-dark font-bold px-3 py-1 border-2 border-brand-dark transform rotate-3 shadow-hard-sm">
                ✓ VERIFIED ON-CHAIN
            </div>

            <h3 className="font-display text-3xl mb-6">3. VERIFIED RESULT</h3>

            <div className="space-y-6">
                <div className="text-center p-6 bg-brand-bg border-2 border-brand-dark">
                    <p className="text-sm text-gray-500 font-mono mb-2">PREDICTION</p>
                    <p className="font-display text-5xl text-brand-dark">{result.prediction}</p>
                    <p className="font-mono text-neon-blue mt-2">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                </div>

                <div className="space-y-2 font-mono text-xs border-t-2 border-brand-dark pt-4">
                    <div className="flex justify-between">
                        <span className="text-gray-500">ENCLAVE ID (PCR8):</span>
                        <span>{result.enclaveId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">TIMESTAMP:</span>
                        <span>{new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">SIGNATURE:</span>
                        <span className="truncate w-32">{result.signature}</span>
                    </div>
                </div>

                <a
                    href="#"
                    className="block text-center w-full bg-brand-dark text-white font-mono py-3 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime transition-all"
                >
                    VIEW PROOF ON EXPLORER ↗
                </a>
            </div>
        </div>
    );
};
