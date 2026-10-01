const { test } = require('node:test')
const assert = require('node:assert/strict')
const { conversationSessionOptions } = require('../../shared/llm/session.ts')

test('OpenRouter sessions follow persisted chats across API URL variants', () => {
  for (const url of ['https://openrouter.ai/api', 'https://openrouter.ai/api/v1/', 'https://OPENROUTER.AI/api']) {
    assert.deepEqual(conversationSessionOptions(url, 'saved-chat'), { session_id: 'rp:chat:saved-chat' })
  }
  assert.notDeepEqual(conversationSessionOptions('https://openrouter.ai/api', 'chat-a'),
    conversationSessionOptions('https://openrouter.ai/api', 'chat-b'))
})

test('Auxiliary operations do not share the chat routing session', () => {
  const sessions = ['chat', 'summary', 'refiner'].map(purpose =>
    conversationSessionOptions('https://openrouter.ai/api', 'saved-chat', purpose).session_id)
  assert.equal(new Set(sessions).size, 3)
})

test('Unknown/local APIs and absent IDs receive no extra request fields', () => {
  for (const url of ['http://localhost:1234/v1', 'https://api.deepseek.com',
    'https://openrouter.ai.example/api', 'https://example.com/openrouter.ai',
    'http://openrouter.ai/api', '/llm-proxy', 'invalid']) {
    assert.deepEqual(conversationSessionOptions(url, 'saved-chat'), {})
  }
  for (const id of [undefined, '', 'x'.repeat(129)]) {
    assert.deepEqual(conversationSessionOptions('https://openrouter.ai/api', id), {})
  }
  assert.ok(conversationSessionOptions('https://openrouter.ai/api', 'x'.repeat(128)).session_id.length <= 256)
})
