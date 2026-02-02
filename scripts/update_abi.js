const fs = require('fs');
const path = require('path');

const artifactPath = path.join(__dirname, '../artifacts/contracts/Escrow.sol/Escrow.json');
const abiPath = path.join(__dirname, '../src/contracts/EscrowABI.json');

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const abi = artifact.abi;

fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
console.log('✅ EscrowABI.json updated successfully from artifacts.');
