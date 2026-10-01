const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const settle = () => new Promise(resolve => setImmediate(resolve))
const jsx = (type, props) => ({ type, props: props ?? {} })
function hooks() {
  const slots = []; let cursor = 0
  return {
    slots, reset: () => { cursor = 0 },
    react: {
      useState(initial) {
        const index = cursor++
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
        return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
      },
      useRef(value) { const index = cursor++; return slots[index] ?? (slots[index] = { current: value }) },
      useEffect() {}, useCallback: fn => fn,
      createContext: () => ({ Provider: 'provider' }),
    },
  }
}
function load(relativePath, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, console, crypto: { randomUUID: () => 'new-profile' },
    setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    window: { confirm: () => true },
    require(name) {
      if (name.startsWith('react/jsx')) return { jsx, jsxs: jsx, jsxDEV: jsx }
      if (name in mocks) return mocks[name]
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  return module.exports
}
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (typeof node.type === 'function') return nodes(node.type(node.props))
  return [node, ...nodes(node.props.children)]
}
const text = node => typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props.children) : String(node ?? '')

test('browsing models and creating a draft do not save profiles; explicit save, retry and default are separate actions', async () => {
  const h = hooks(), original = { id: 'saved', name: 'Saved', model: 'old-model', baseUrl: 'https://model.test', apiKey: '', sampler: {} }
  let saves = 0, defaults = 0, fail = false
  const context = {
    settings: { aiProfiles: [original], activeAiProfileId: 'saved' }, aiProfileDraft: null,
    setAiProfileDraft: value => { context.aiProfileDraft = value },
    setActiveAiProfile: () => { defaults++ },
    saveAiProfile: async profile => {
      saves++; if (fail) throw new Error('offline')
      const index = context.settings.aiProfiles.findIndex(item => item.id === profile.id)
      if (index < 0) context.settings.aiProfiles.push(profile)
      else context.settings.aiProfiles[index] = profile
    },
  }
  const Editor = load('../src/components/settings/AIModelsView.tsx', {
    react: h.react, 'lucide-react': new Proxy({}, { get: () => () => null }),
    '../../i18n': { useI18n: () => ({ t: key => key }) },
    '../../context/SettingsContext': { useSettings: () => context, defaultAiProfile: () => ({ ...original, id: 'new-profile', name: '' }) },
    '../../services/api': { OpenAIAdapter: class { async listModels() { return { models: Array.from({ length: 30 }, (_, i) => ({ id: `model-${i}`, status: 'available' })) } } } },
    '../../../../shared/llm/modelOptions': { defaultReasoningEffort: () => 'default' },
  }).default
  const render = () => { h.reset(); return nodes(Editor()) }
  const click = label => render().find(node => node.type === 'button' && text(node).trim() === label).props.onClick()
  await click('settingsConnect')
  for (let i = 0; i < 30; i++) click(`model-${i}`)
  assert.equal(saves, 0); assert.equal(defaults, 0)
  assert.equal(context.settings.aiProfiles.length, 1)
  assert.equal(original.model, 'old-model')
  click('aiNewProfile')
  assert.equal(context.settings.aiProfiles.length, 1)
  assert.equal(saves, 0)
  fail = true; click('aiSaveProfile'); await settle()
  assert.equal(context.settings.aiProfiles.length, 1)
  assert.equal(context.aiProfileDraft.id, 'new-profile')
  assert.ok(render().some(node => node.props.role === 'alert' && text(node).includes('offline')))
  fail = false; click('aiSaveProfile'); await settle()
  assert.equal(context.settings.aiProfiles.length, 2)
  assert.equal(saves, 2); assert.equal(defaults, 0)
  assert.equal(render().find(node => node.type === 'button' && text(node) === 'aiSaveProfile').props.disabled, true)
  click('aiSetDefaultProfile'); assert.equal(defaults, 1)
})

test('the actual settings provider commits a profile only after a successful server save', async () => {
  const h = hooks(); let fail = true, writes = 0
  const Provider = load('../src/context/SettingsContext.tsx', {
    react: h.react, '../lib/formatting': { defaultPatterns: {}, defaultColors: {} },
    '../i18n': { useI18n: () => ({ t: key => key }) }, './AuthContext': { useAuth: () => ({ user: { id: 'u1' } }) },
    '../services/sync': { settingsApi: { save: async () => { writes++; if (fail) throw new Error('offline') } } },
  }).SettingsProvider
  const render = () => { h.reset(); return Provider({ children: null }) }
  render(); h.slots[1] = false
  let context = render().props.value
  const original = context.settings.aiProfiles[0]
  const changed = { ...original, model: 'chosen-model' }
  await assert.rejects(context.saveAiProfile(changed), /offline/)
  assert.equal(render().props.value.settings.aiProfiles[0].model, '')
  fail = false
  context = render().props.value
  await context.saveAiProfile(changed)
  assert.equal(render().props.value.settings.aiProfiles[0].model, 'chosen-model')
  assert.equal(writes, 2)
  await context.saveAiProfile({ ...changed, id: 'another' })
  assert.equal(render().props.value.settings.aiProfiles.length, 2)
})
