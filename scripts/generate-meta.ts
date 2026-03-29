import fs from 'fs';
import { ProgramMetadata } from '@gear-js/api';

try {
    const idlJson = fs.readFileSync('src/lib/blockchain/assets/andromeda.idl.json', 'utf8');
    // Attempt to parse existing json through GearApi
    const metadata = ProgramMetadata.from(idlJson);
    const hex = (metadata as any).toHex();
    fs.writeFileSync('src/lib/blockchain/assets/andromeda.meta.txt', hex);
    console.log('✅ Generated andromeda.meta.txt successfully from JSON');
} catch (e) {
    console.error('❌ Failed to convert JSON to Metadata Hex:', e);
}
