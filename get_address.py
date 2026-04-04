from algosdk import mnemonic, account

# Tu mnemotecnica de 25 palabras
passphrase = "near basket song season tourist spice transfer beauty ghost social section rotate planet donate maze vendor orange major sniff hover potato express now absorb aerobic"

try:
    # 1. Convertir mnemotecnica a Private Key
    private_key = mnemonic.to_private_key(passphrase)
    
    # 2. Derivar la dirección pública
    address = account.address_from_private_key(private_key)
    
    print("\n" + "="*45)
    print(f"DIRECCIÓN PÚBLICA: {address}")
    print("="*45)
    print("\nCopia esta dirección para fondearla en el Testnet Faucet.")

except Exception as e:
    print(f"\n[ERROR]: {e}")
    print("Verifica que las 25 palabras estén escritas correctamente y separadas por un espacio.")
