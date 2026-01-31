import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, USDC_DECIMALS } from '../config';

/**
 * Hook to get USDC balance of an address
 */
export function useUSDCBalance(address?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: CONTRACTS.USDC.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: data ? formatUnits(data as bigint, USDC_DECIMALS) : '0',
    balanceRaw: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get USDC allowance
 */
export function useUSDCAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: CONTRACTS.USDC.abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!(owner && spender),
    },
  });

  return {
    allowance: data ? formatUnits(data as bigint, USDC_DECIMALS) : '0',
    allowanceRaw: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to mint USDC (test faucet)
 */
export function useMintUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const mint = (to: `0x${string}`, amount: string) => {
    const amountInWei = parseUnits(amount, USDC_DECIMALS);
    writeContract({
      address: CONTRACTS.USDC.address,
      abi: CONTRACTS.USDC.abi,
      functionName: 'mint',
      args: [to, amountInWei],
    });
  };

  return {
    mint,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to approve USDC spending
 */
export function useApproveUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = (spender: `0x${string}`, amount: string) => {
    const amountInWei = parseUnits(amount, USDC_DECIMALS);
    writeContract({
      address: CONTRACTS.USDC.address,
      abi: CONTRACTS.USDC.abi,
      functionName: 'approve',
      args: [spender, amountInWei],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to get last mint timestamp
 */
export function useLastMintTime(address?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: CONTRACTS.USDC.abi,
    functionName: 'lastMintTime',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    lastMintTime: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get MAX_MINT_AMOUNT constant
 */
export function useMaxMintAmount() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: CONTRACTS.USDC.abi,
    functionName: 'MAX_MINT_AMOUNT',
  });

  return {
    maxMintAmount: data ? formatUnits(data as bigint, USDC_DECIMALS) : '0',
    maxMintAmountRaw: data as bigint | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to get MINT_COOLDOWN constant
 */
export function useMintCooldown() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: CONTRACTS.USDC.abi,
    functionName: 'MINT_COOLDOWN',
  });

  return {
    mintCooldown: data ? Number(data) : 0,
    isLoading,
    error,
  };
}
