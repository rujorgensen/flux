import { TProcessAddress } from "../routing.type";

export type TCallback = (result: any) => void;
export type TCallback2 = (result: string) => void;

export type TRPCId = number; // Globally unique!! SHANCGE TO STRING PERHAPS

export interface RPCRequest<TMethods> {
    id: TRPCId; // Globally unique
    originProcessAddress: TProcessAddress; // Only to be passed to the 
    method: TMethods;
    params: any[];
}

export interface RPCResponse {
    id: TRPCId; // Globally unique
    rpcProcessAddress: TProcessAddress; // Proccess for now
    result: any;
    error?: string;
}

//  npx nx watch --projects=agent --includeDependentProjects -- echo \$NX_PROJECT_NAME