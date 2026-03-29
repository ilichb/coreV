declare module 'tweetnacl' {
  export function sign_detached_verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean;
  
  export const sign: {
    detached: {
      verify: typeof sign_detached_verify;
    };
  };
}
