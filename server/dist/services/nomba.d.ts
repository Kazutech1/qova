export interface BankTransferResult {
    transferReference: string;
    status: string;
}
export declare function bankTransfer(params: {
    amount: number;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    merchantTxRef: string;
    narration: string;
}): Promise<BankTransferResult>;
export interface BankLookupResult {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
}
export declare function lookupBankAccount(accountNumber: string, bankCode: string): Promise<BankLookupResult>;
export interface VirtualAccountResult {
    accountNumber: string;
    accountName: string;
    bankName: string;
    accountRef: string;
    expiryDate: string;
}
export declare function createVirtualAccount(params: {
    accountRef: string;
    accountName: string;
    expiryDate: string;
    expectedAmount: string;
}): Promise<VirtualAccountResult>;
export interface Bank {
    code: string;
    name: string;
}
export declare function getBanks(): Promise<Bank[]>;
export interface TransactionResult {
    reference: string;
    status: string;
    amount: number;
    narration: string;
}
export declare function getTransaction(reference: string): Promise<TransactionResult>;
//# sourceMappingURL=nomba.d.ts.map