export function saveSandboxApproval(args:{ownerId:string,intentId:string,approvalUrl:string,now?:number,storage?:Storage|null}):boolean;
export function readSandboxApproval(args:{ownerId:string,intentId:string,now?:number,storage?:Storage|null}):string|null;
export function clearSandboxApproval(args:{ownerId:string,storage?:Storage|null}):void;
