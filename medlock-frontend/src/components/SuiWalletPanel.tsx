import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

const formatBalance = (value?: string | null) => {
  if (!value) {
    return "0.000";
  }
  const formatted = Number(value) / 1_000_000_000;
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

export const SuiWalletPanel = () => {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const {
    data: balance,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["sui-balance", account?.address],
    enabled: !!account,
    queryFn: async () => {
      if (!account) {
        return null;
      }
      const response = await client.getBalance({
        owner: account.address,
      });
      return response.totalBalance;
    },
  });

  return (
    <div className="scroll-reveal bg-white border-2 border-brand-dark shadow-hard p-6 space-y-6">
      <div className="flex flex-col-reverse gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm tracking-widest font-bold">
            SUI ACCESS CONTROL
          </p>
          <h3 className="font-display text-4xl mt-2">Wallet Handshake</h3>
          <p className="text-sm text-brand-dark/70">
            Connect to the Sui network and validate access policies directly
            from the browser. This ties Medlock&apos;s consent logic to real Sui
            keys.
          </p>
        </div>
        <ConnectButton />
      </div>

      {account ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-brand-dark/60 uppercase">
              Active Address
            </p>
            <p className="font-mono break-words text-lg">{account.address}</p>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs tracking-[0.3em] text-brand-dark/60 uppercase">
                Available Balance
              </p>
              <p className="font-display text-5xl leading-none">
                {formatBalance(balance)}
                <span className="text-base font-mono ml-2">SUI</span>
              </p>
            </div>
            <button
              className="self-start bg-brand-dark text-white font-mono px-4 py-2 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime transition-all disabled:opacity-60"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Refreshing..." : "Refresh Balance"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-brand-dark/70">
          Connect a wallet to preview encrypted data policies, available SUI
          balance, and trigger zero-trust compute jobs.
        </p>
      )}
    </div>
  );
};
