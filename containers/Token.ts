import { createContainer } from "unstated-next";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import erc20 from "@studydefi/money-legos/erc20";

import Connection from "./Connection";
import EmpState from "./EmpState";
import EmpAddress from "./EmpAddress";

const fromWei = ethers.utils.formatUnits;

function useToken() {
  const { signer, address, block$ } = Connection.useContainer();
  const { empAddress } = EmpAddress.useContainer();
  const { empState } = EmpState.useContainer();
  const tokenAddress = empState.tokenCurrency;

  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [allowance, setAllowance] = useState<number | "Infinity" | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const getTokenInfo = async () => {
    if (contract) {
      const symbol = await contract.symbol();
      const name = await contract.name();
      const decimals = await contract.decimals();
      const allowanceRaw = await contract.allowance(address, empAddress);
      const allowance = allowanceRaw.eq(ethers.constants.MaxUint256)
        ? "Infinity"
        : parseFloat(fromWei(allowanceRaw, decimals));
      const balanceRaw = await contract.balanceOf(address);
      const balance = ethers.utils.formatUnits(balanceRaw, decimals);

      setSymbol(symbol);
      setName(name);
      setDecimals(decimals);
      setAllowance(allowance);
      setBalance(balance);
    }
  };

  const setMaxAllowance = async () => {
    if (contract && empAddress) {
      try {
        await contract.approve(empAddress, ethers.constants.MaxUint256);
      } catch (error) {
        console.error(error);
      }
    }
  };

  // get token info when contract changes
  useEffect(() => {
    setSymbol(null);
    setName(null);
    setDecimals(null);
    setAllowance(null);
    setBalance(null);
    getTokenInfo();
  }, [contract]);

  // get token info on each new block
  useEffect(() => {
    if (block$) {
      const sub = block$.subscribe(() => getTokenInfo());
      return () => sub.unsubscribe();
    }
  }, [block$, tokenAddress, signer, contract]);

  // set contract when collateral address changes
  useEffect(() => {
    if (signer && tokenAddress) {
      const instance = new ethers.Contract(tokenAddress, erc20.abi, signer);
      setContract(instance);
    }
  }, [signer, tokenAddress]);

  return {
    contract,
    name,
    symbol,
    decimals,
    allowance,
    balance,
    address: tokenAddress,
    setMaxAllowance,
  };
}

const Token = createContainer(useToken);

export default Token;