// Quick test to generate and verify JWT token with correct org_id
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const accessKey = process.env.GTWY_ACCESS_KEY || 'ZQOooL357LqKGZ';
const chatbotId = process.env.GTWY_CHATBOT_ID || '69785c0b108ba50ee320501b';
const gtwOrgId = process.env.GTWY_ORG_ID || '58844';

console.log('🔑 Configuration:');
console.log('  - Access Key:', accessKey);
console.log('  - Chatbot ID:', chatbotId);
console.log('  - GTWY Org ID:', gtwOrgId);

// Generate new token with correct org_id
const now = Math.floor(Date.now() / 1000);
const payload = {
  org_id: gtwOrgId,
  chatbot_id: chatbotId,
  user_id: 'user_demo',
  variables: {
    org_id: 'org_demo',
    user_id: 'user_demo',
    env: 'local'
  },
  iat: now,
  exp: now + 3600
};

console.log('\n📦 Token Payload:');
console.log(JSON.stringify(payload, null, 2));

const token = jwt.sign(payload, accessKey, { algorithm: 'HS256' });
console.log('\n🎫 Generated Token:');
console.log(token);

// Verify the token
try {
  const verified = jwt.verify(token, accessKey);
  console.log('\n✅ Token verified successfully!');
  console.log('Main org_id:', verified.org_id);
  console.log('Variables org_id:', verified.variables.org_id);
} catch (error) {
  console.log('\n❌ Token verification failed:', error.message);
}
