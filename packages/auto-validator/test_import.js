const { autoValidate } = require('./dist/engine');
console.log('AutoValidate import test:');
console.log('Function exists:', typeof autoValidate === 'function');

const mockScorecard = {
  "A. Problema": { clarity: 8, coherence: 7, completeness: 9, content: {} },
  metadata: { 
    version: '1.0', 
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    authorDid: 'did:andromeda:eth:0x123' 
  }
};

const mockSnapshot = {
  version: 'v1',
  entries: [],
  snapshot_hash: 'test'
};

const result = autoValidate(mockScorecard, mockSnapshot);
console.log('Result:', JSON.stringify(result, null, 2));
